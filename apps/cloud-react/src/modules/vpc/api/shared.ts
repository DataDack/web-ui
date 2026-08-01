// Shared helpers + raw backend shapes for the VPC API layer.
// The backend (cloud-be-go apps/vpc) uses `vpc_id`, normalized port ranges and
// inbound/outbound directions; we map those to the stable FE field names here.

/** Backend SGRule entity (vpc_sg_rules). */
export interface RawSGRule {
    id: string
    security_group_id: string
    direction: string // inbound | outbound
    protocol: string // tcp | udp | icmp | all
    port_from: number
    port_to: number
    source_type: string // cidr | security_group
    source_cidr: string
    source_sg_id: string | null
    action: string // allow | deny
    description: string
}

/** Convert a FE port range ("443" or "1024-2048") into backend from/to ints. */
export function parsePortRange(range: string): { portFrom: number; portTo: number } {
    const parts = range.trim().split("-")
    const parsedFrom = Number.parseInt(parts[0], 10)
    const from = Number.isNaN(parsedFrom) ? 0 : parsedFrom
    let to = from
    if (parts.length > 1) {
        const parsedTo = Number.parseInt(parts[1], 10)
        to = Number.isNaN(parsedTo) ? from : parsedTo
    }
    return { portFrom: from, portTo: to }
}

export function sgProtocolUsesPorts(protocol: string): boolean {
    return protocol === "tcp" || protocol === "udp"
}

/** Convert backend from/to ints into a FE port-range string. */
export function formatPortRange(from: number, to: number): string {
    return from === to ? String(from) : `${String(from)}-${String(to)}`
}

/** Backend direction (inbound/outbound) → FE (ingress/egress). */
export function toFEDirection(d: string): "ingress" | "egress" {
    return d === "outbound" ? "egress" : "ingress"
}

/** FE direction (ingress/egress) → backend (inbound/outbound). */
export function toBEDirection(d: "ingress" | "egress"): string {
    return d === "egress" ? "outbound" : "inbound"
}
