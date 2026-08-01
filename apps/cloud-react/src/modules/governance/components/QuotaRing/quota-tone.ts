export type QuotaTone = "ok" | "warn" | "full"

/** Threshold tone for a usage/limit pair — shared by the ring, bars and tiles. */
export function quotaTone(used: number, limit: number): QuotaTone {
    if (limit === -1) return "ok"
    if (limit <= 0) return used > 0 ? "full" : "ok"
    const ratio = used / limit
    if (ratio >= 1) return "full"
    if (ratio >= 0.7) return "warn"
    return "ok"
}
