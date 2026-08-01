/** IPv4 + CIDR helpers for client-side network validation. */

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

/** True for a syntactically valid dotted-quad IPv4 address (no leading zeros). */
export function isIPv4(value: string): boolean {
    const match = IPV4_RE.exec(value.trim())
    if (!match) return false
    return match.slice(1).every((octet) => {
        const n = Number(octet)
        return n >= 0 && n <= 255 && String(n) === octet
    })
}

/** Convert a dotted IPv4 string to an unsigned 32-bit integer. */
export function ipToLong(ip: string): number {
    return (
        ip
            .trim()
            .split(".")
            .reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
    )
}

/**
 * Whether `ip` is an assignable host inside `cidr` (e.g. "10.0.1.0/24").
 * For prefixes /0–/30 the network and broadcast addresses are excluded since
 * they aren't assignable to an instance.
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
    if (!isIPv4(ip)) return false
    const [base, bitsRaw] = cidr.trim().split("/")
    const bits = Number(bitsRaw)
    if (!isIPv4(base) || Number.isNaN(bits) || bits < 0 || bits > 32) return false

    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    const network = (ipToLong(base) & mask) >>> 0
    const broadcast = (network | (~mask >>> 0)) >>> 0
    const target = ipToLong(ip)

    if (bits <= 30) return target > network && target < broadcast
    return target >= network && target <= broadcast
}
