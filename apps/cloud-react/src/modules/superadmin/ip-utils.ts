// Client-side IPv4 CIDR maths for the Add-pool dialog's live preview. Mirrors
// the backend `ipam` package (apps/vpc/ippool/ipam) so the addresses previewed
// here match what the server will register. Bounded to MAX_HOSTS to stay fast.

export const MAX_HOSTS = 1024

export interface CidrInfo {
  cidr: string
  network: string
  broadcast: string
  gateway: string
  prefix: number
  totalCount: number
  usableCount: number
  /** Usable host addresses, ascending. */
  hosts: string[]
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    value = value * 256 + n
  }
  return value >>> 0
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".")
}

/**
 * Does `ip` fall inside `cidr`? Lets the pool list answer "which pool owns
 * 167.104.222.26?" without expanding every block — the search box accepts a bare
 * address and this is what matches it to a row.
 *
 * Unlike describeCidr this has no size ceiling: it is pure arithmetic on the
 * mask, so a /8 costs the same as a /30.
 */
export function cidrContains(cidr: string, ip: string): boolean {
  const [base, prefixText] = cidr.split("/")
  const prefix = Number(prefixText)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false

  const networkBase = ipToInt(base)
  const address = ipToInt(ip)
  if (networkBase === null || address === null) return false

  // A /0 masks nothing; the shift below would be a no-op rather than zero.
  if (prefix === 0) return true
  const mask = (0xffffffff << (32 - prefix)) >>> 0
  return (networkBase & mask) >>> 0 === (address & mask) >>> 0
}

/**
 * Parse an IPv4 CIDR string. Returns the derived block info, or an error message
 * for a complete-but-invalid value, or `null` while the value is still being
 * typed (so the UI can show a neutral placeholder rather than an error).
 */
export function describeCidr(value: string): { info?: CidrInfo; error?: string } | null {
  const trimmed = value.trim()
  const match = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/.exec(trimmed)
  if (!match) return null // incomplete / not yet a full CIDR

  const base = ipToInt(match[1])
  const prefix = Number(match[2])
  if (base === null) return { error: "Invalid IPv4 address" }
  if (prefix < 0 || prefix > 32) return { error: "Prefix must be between /0 and /32" }

  const hostBits = 32 - prefix
  const total = hostBits >= 31 ? 2 ** hostBits : 1 << hostBits
  if (total > MAX_HOSTS) {
    return {
      error: `Block /${String(prefix)} is too large — use /22 or smaller (max ${String(MAX_HOSTS)} addresses)`,
    }
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << hostBits) >>> 0
  const network = (base & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0

  let usable: number
  if (prefix === 32) usable = 1
  else if (prefix === 31) usable = 2
  else usable = total - 2

  const hosts: string[] = []
  const start = prefix < 31 ? network + 1 : network
  const end = prefix < 31 ? broadcast - 1 : broadcast
  for (let n = start; n <= end; n++) hosts.push(intToIp(n >>> 0))

  const gateway = prefix < 31 ? intToIp((network + 1) >>> 0) : intToIp(network)

  return {
    info: {
      cidr: `${intToIp(network)}/${String(prefix)}`,
      network: intToIp(network),
      broadcast: intToIp(broadcast),
      gateway,
      prefix,
      totalCount: total,
      usableCount: usable,
      hosts,
    },
  }
}
