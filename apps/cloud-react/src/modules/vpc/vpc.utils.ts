// Small networking helpers shared by the VPC list and create wizard.
// The backend is the source of truth for provisioning; these are display-only
// derivations (how many addresses a CIDR holds, friendly counts, auto-names).

import { CIDR_REGEX } from "./vpc.constants"

/**
 * Total number of IPv4 addresses a CIDR block contains, i.e. 2^(32 - prefix).
 * Returns null for anything that isn't a well-formed CIDR with a /0–/32 prefix.
 * This is the raw address count (matches the "65,536 IPs" AWS shows for a /16),
 * not the usable-host count.
 */
export function cidrAddressCount(cidr: string): number | null {
  if (!CIDR_REGEX.test(cidr)) return null
  const prefix = Number.parseInt(cidr.split("/")[1] ?? "", 10)
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return null
  return 2 ** (32 - prefix)
}

/** A grouped count like "65,536". Falls back to "—" for invalid CIDRs. */
export function formatIpCount(cidr: string): string {
  const n = cidrAddressCount(cidr)
  return n === null ? "—" : n.toLocaleString("en-US")
}

/** Sum of addresses across many CIDRs, ignoring the invalid ones. */
export function totalIpCount(cidrs: string[]): number {
  return cidrs.reduce((sum, cidr) => sum + (cidrAddressCount(cidr) ?? 0), 0)
}

// A subnet can't use every address in its range — the network/broadcast pair
// plus a few gateway/DNS slots are reserved. We mirror AWS and reserve 5.
const RESERVED_PER_SUBNET = 5

/**
 * Addresses available in a subnet. Prefers the backend-computed value once
 * provisioning has populated it; otherwise derives it from the CIDR the
 * AWS way (total − 5 reserved). Returns "—" when the CIDR is unusable.
 */
export function formatAvailableIps(cidr: string, backendValue?: number): string {
  if (backendValue && backendValue > 0) return backendValue.toLocaleString("en-US")
  const total = cidrAddressCount(cidr)
  if (total === null) return "—"
  return Math.max(0, total - RESERVED_PER_SUBNET).toLocaleString("en-US")
}

/* ── IPv4 address math ─────────────────────────────────────────────────── */

/** Dotted-quad → unsigned 32-bit integer. Assumes a valid IPv4 string. */
export function ipToInt(ip: string): number {
  return (
    ip.split(".").reduce((acc, octet) => (acc << 8) + (Number.parseInt(octet, 10) & 0xff), 0) >>> 0
  )
}

/** Unsigned 32-bit integer → dotted-quad. */
export function intToIp(n: number): string {
  const v = n >>> 0
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].join(".")
}

export interface CidrRange {
  /** First address in the block (the network address). */
  network: string
  /** First address an instance can use (network + 1, AWS-style). */
  firstUsable: string
  /** Last address an instance can use (broadcast − 1). */
  lastUsable: string
  /** Last address in the block (the broadcast address). */
  broadcast: string
}

/**
 * Network / usable-range / broadcast addresses for a CIDR block. Mirrors AWS:
 * the network and broadcast addresses are reserved, so the usable range is the
 * span between them. For /31 and /32 there's no usable host range — returns the
 * network address for both usable bounds. Null for malformed CIDRs.
 */
export function cidrRange(cidr: string): CidrRange | null {
  if (!CIDR_REGEX.test(cidr)) return null
  const [ip, prefixStr] = cidr.split("/")
  const prefix = Number.parseInt(prefixStr, 10)
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return null

  const base = ipToInt(ip)
  const hostBits = 32 - prefix
  const mask = hostBits === 32 ? 0 : (0xffffffff << hostBits) >>> 0
  const network = (base & mask) >>> 0
  const broadcast = (network + 2 ** hostBits - 1) >>> 0

  // /31 and /32 have no room for a reserved network/broadcast pair.
  const hasHosts = hostBits >= 2
  return {
    network: intToIp(network),
    firstUsable: intToIp(hasHosts ? network + 1 : network),
    lastUsable: intToIp(hasHosts ? broadcast - 1 : broadcast),
    broadcast: intToIp(broadcast),
  }
}

/** True when `subnetCidr` falls entirely inside `vpcCidr`'s address range. */
export function cidrContains(vpcCidr: string, subnetCidr: string): boolean {
  if (!CIDR_REGEX.test(vpcCidr) || !CIDR_REGEX.test(subnetCidr)) return false
  const vpcPrefix = Number.parseInt(vpcCidr.split("/")[1] ?? "", 10)
  const subPrefix = Number.parseInt(subnetCidr.split("/")[1] ?? "", 10)
  // A subnet can't be larger than (smaller prefix than) its parent.
  if (subPrefix < vpcPrefix) return false

  const vpcBase = ipToInt(vpcCidr.split("/")[0])
  const subBase = ipToInt(subnetCidr.split("/")[0])
  const vpcMask = vpcPrefix === 0 ? 0 : (0xffffffff << (32 - vpcPrefix)) >>> 0
  return (vpcBase & vpcMask) >>> 0 === (subBase & vpcMask) >>> 0
}

/* ── Allowed prefix lengths (per VPC creation rules) ───────────────────────
 * VPC CIDR must be a private (RFC1918) /16–/24; subnet CIDRs must be /20–/28.
 * The dropdowns and validators below share these so the wizard can never offer
 * — or accept — a block the backend would reject. */
export const VPC_PREFIX_MIN = 16
export const VPC_PREFIX_MAX = 24
export const SUBNET_PREFIX_MIN = 20
export const SUBNET_PREFIX_MAX = 28

/** Prefix lengths offered for the VPC CIDR (/16 … /24). */
export const VPC_PREFIX_OPTIONS = [16, 17, 18, 19, 20, 21, 22, 23, 24]
/** Prefix lengths offered for subnet CIDRs (/20 … /28). */
export const SUBNET_PREFIX_OPTIONS = [20, 21, 22, 23, 24, 25, 26, 27, 28]

// RFC1918 private address blocks — the only ranges a VPC may live in.
// eslint-disable-next-line sonarjs/no-hardcoded-ip -- RFC1918 constants, not config
const RFC1918_BLOCKS = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]

/** True when an IPv4 address sits inside one of the RFC1918 private blocks. */
export function isPrivateIp(ip: string): boolean {
  return RFC1918_BLOCKS.some((block) => cidrContains(block, `${ip}/32`))
}

/** The integer [network, broadcast] bounds of a CIDR, or null if malformed. */
function cidrBounds(cidr: string): [number, number] | null {
  if (!CIDR_REGEX.test(cidr)) return null
  const [ip, prefixStr] = cidr.split("/")
  const prefix = Number.parseInt(prefixStr, 10)
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return null
  const base = ipToInt(ip)
  const hostBits = 32 - prefix
  const mask = hostBits === 32 ? 0 : (0xffffffff << hostBits) >>> 0
  const network = (base & mask) >>> 0
  const broadcast = (network + 2 ** hostBits - 1) >>> 0
  return [network, broadcast]
}

/** True when two CIDR blocks share any address. */
export function cidrsOverlap(a: string, b: string): boolean {
  const ba = cidrBounds(a)
  const bb = cidrBounds(b)
  if (!ba || !bb) return false
  return ba[0] <= bb[1] && bb[0] <= ba[1]
}

/**
 * What's wrong with a VPC CIDR, or null when it's valid. Codes map to i18n
 * messages in the wizard: `format` (not CIDR), `private` (not RFC1918),
 * `prefix` (outside /16–/24).
 */
export type VpcCidrIssue = "format" | "private" | "prefix"
export function vpcCidrIssue(cidr: string): VpcCidrIssue | null {
  if (!CIDR_REGEX.test(cidr)) return "format"
  const prefix = Number.parseInt(cidr.split("/")[1] ?? "", 10)
  if (Number.isNaN(prefix) || prefix < VPC_PREFIX_MIN || prefix > VPC_PREFIX_MAX) return "prefix"
  if (!isPrivateIp(cidr.split("/")[0])) return "private"
  return null
}

/**
 * What's wrong with one subnet CIDR given its parent VPC and sibling subnets,
 * or null when it's valid. Checked in order: `format`, `prefix` (outside
 * /20–/28), `outside` (not within the VPC), `overlap` (collides with a sibling).
 */
export type SubnetCidrIssue = "format" | "prefix" | "outside" | "overlap"
export function subnetCidrIssue(
  vpcCidr: string,
  subnetCidr: string,
  siblingCidrs: string[],
): SubnetCidrIssue | null {
  if (!CIDR_REGEX.test(subnetCidr)) return "format"
  const prefix = Number.parseInt(subnetCidr.split("/")[1] ?? "", 10)
  if (Number.isNaN(prefix) || prefix < SUBNET_PREFIX_MIN || prefix > SUBNET_PREFIX_MAX) {
    return "prefix"
  }
  if (!cidrContains(vpcCidr, subnetCidr)) return "outside"
  if (siblingCidrs.some((other) => cidrsOverlap(subnetCidr, other))) return "overlap"
  return null
}

/** A sensible default subnet prefix for a VPC: four bits smaller, clamped to the
 *  allowed /20–/28 band (and never wider than the VPC itself). */
function defaultSubnetPrefix(vpcPrefix: number): number {
  const target = vpcPrefix + 4
  return Math.min(SUBNET_PREFIX_MAX, Math.max(SUBNET_PREFIX_MIN, vpcPrefix, target))
}

/**
 * The first subnet block of `prefix` length that fits inside `vpcCidr` without
 * overlapping any of `existingCidrs`. Used when the user adds a subnet by hand,
 * so the new row starts on a free, in-range, non-overlapping CIDR. Falls back to
 * a default prefix when none is given, and returns null when the VPC is full or
 * the inputs are malformed.
 */
export function nextFreeSubnetCidr(
  vpcCidr: string,
  existingCidrs: string[],
  prefix?: number,
): string | null {
  const bounds = cidrBounds(vpcCidr)
  if (!bounds) return null
  const vpcPrefix = Number.parseInt(vpcCidr.split("/")[1] ?? "", 10)

  let p = prefix
  if (p == null || Number.isNaN(p) || p < SUBNET_PREFIX_MIN || p > SUBNET_PREFIX_MAX) {
    p = defaultSubnetPrefix(vpcPrefix)
  }
  if (p < vpcPrefix) return null

  const size = 2 ** (32 - p)
  const [vpcNet, vpcBroadcast] = bounds
  for (let base = vpcNet; base + size - 1 <= vpcBroadcast; base += size) {
    const candidate = `${intToIp(base >>> 0)}/${String(p)}`
    if (!existingCidrs.some((other) => cidrsOverlap(candidate, other))) return candidate
  }
  return null
}

export interface CarveInput {
  vpcCidr: string
  /** Availability-zone codes the subnets are spread across, in order. */
  azCodes: string[]
  publicPerAz: number
  privatePerAz: number
}

export interface CarvedSubnet {
  name: string
  cidr: string
  /** AZ code this block is assigned to. */
  zone: string
  is_public: boolean
}

/**
 * Split a VPC CIDR into equal-sized subnet blocks, AWS "VPC and more" style.
 * Lays public subnets first (one per AZ, per index) then private, so the result
 * lines up column-by-AZ in the resource map. Picks the smallest subnet prefix
 * that yields enough non-overlapping blocks. Returns [] if nothing to carve or
 * the VPC block can't be divided that finely.
 */
export function carveSubnets({
  vpcCidr,
  azCodes,
  publicPerAz,
  privatePerAz,
}: CarveInput): CarvedSubnet[] {
  if (!CIDR_REGEX.test(vpcCidr) || azCodes.length === 0) return []
  const vpcPrefix = Number.parseInt(vpcCidr.split("/")[1] ?? "", 10)
  if (Number.isNaN(vpcPrefix) || vpcPrefix > 30) return []

  const total = azCodes.length * (publicPerAz + privatePerAz)
  if (total === 0) return []

  // Smallest prefix that yields enough non-overlapping blocks, then snapped up
  // to the first ALLOWED subnet prefix (/20–/28) so every carved block obeys
  // the subnet rules. Returns [] when the requested subnets can't fit.
  const minPrefix = vpcPrefix + Math.ceil(Math.log2(total))
  const newPrefix = SUBNET_PREFIX_OPTIONS.find((p) => p >= minPrefix && p >= vpcPrefix)
  if (newPrefix === undefined) return []

  const blockSize = 2 ** (32 - newPrefix)
  const vpcBase = ipToInt(vpcCidr.split("/")[0]) >>> 0

  const carved: CarvedSubnet[] = []
  let slot = 0
  // Name is left blank so the page derives it from the real VPC name at submit
  // (or shows a placeholder in the map); the customize panel can override it.
  const push = (azCode: string, isPublic: boolean) => {
    const base = (vpcBase + slot * blockSize) >>> 0
    carved.push({
      name: "",
      cidr: `${intToIp(base)}/${String(newPrefix)}`,
      zone: azCode,
      is_public: isPublic,
    })
    slot += 1
  }

  // Public tier first (column-by-AZ), then private — matches the map layout.
  for (let i = 0; i < publicPerAz; i++) {
    azCodes.forEach((code) => {
      push(code, true)
    })
  }
  for (let i = 0; i < privatePerAz; i++) {
    azCodes.forEach((code) => {
      push(code, false)
    })
  }
  return carved
}

/** A short, lowercase, naming-convention-safe random suffix, e.g. "k3p9zq". */
function randomSuffix(): string {
  // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic name suffix, not security-sensitive
  return Math.random()
    .toString(36)
    .slice(2, 8)
    .replace(/[^a-z0-9]/g, "0")
}

/** Auto-generate a VPC name when the user leaves the field blank (AWS-style). */
export function autoVpcName(): string {
  return `vpc-${randomSuffix()}`
}

/**
 * Auto-generate a subnet name from its parent VPC name and visibility, e.g.
 * "vpc-k3p9zq-subnet-public-1". Used when a subnet row is left unnamed.
 */
export function autoSubnetName(vpcName: string, isPublic: boolean, index: number): string {
  const base = vpcName.length >= 2 ? vpcName : "vpc"
  return `${base}-subnet-${isPublic ? "public" : "private"}-${String(index + 1)}`
}
