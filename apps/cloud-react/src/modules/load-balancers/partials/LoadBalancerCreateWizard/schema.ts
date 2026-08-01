import { z } from "zod/v4"

import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

/**
 * Whether a string is an IPv4 CIDR, e.g. 203.0.113.0/24.
 *
 * The prefix is required rather than assumed: a bare address means /32 to some
 * tools and "everything" to others, and this value decides who can reach the
 * load balancer. Parsed rather than matched with one dense pattern — the octet
 * range is easier to read as arithmetic than as alternation.
 */
function isCIDR(value: string): boolean {
    const parts = value.split("/")
    if (parts.length !== 2) return false
    const [address, prefix] = parts

    if (!/^\d{1,2}$/.test(prefix) || Number(prefix) > 32) return false

    const octets = address.split(".")
    if (octets.length !== 4) return false
    return octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)
}

const port = z
    .number({ error: "Enter a port" })
    .int("Ports are whole numbers")
    .min(1, "Ports start at 1")
    .max(65535, "Ports end at 65535")

/**
 * One instance behind a listener.
 *
 * `port` is the port on the INSTANCE, which need not be the target group's —
 * RegisterTargetRequest has always accepted an override and defaulted to the
 * group's when omitted. Held as a string so blank can mean "inherit", which a
 * number field cannot express.
 */
const targetSchema = z.object({
    instance_id: z.string(),
    port: z.string(),
})

/**
 * One complete route: a port the load balancer accepts on, and where it goes.
 *
 * The target group lives inside the listener rather than in a parallel list
 * because that is the question being answered — "where does :80 go", not "what
 * target groups exist". Splitting them apart made the common case (one port,
 * one set of backends) into two screens describing halves of one decision.
 *
 * Several listeners CAN share a group; that is done by pointing each at the
 * same existing group, which is the rare case and does not need to shape the
 * form. Submit flattens each `tg_mode: "new"` entry into its own
 * `target_groups[]` element with a generated ref.
 */
const listenerSchema = z.object({
    protocol: z.enum(["HTTP", "TCP"]),
    port,
    /** Blank means anywhere. Comma-separated so one field takes several ranges. */
    allowed_cidrs: z.string(),

    tg_mode: z.enum(["new", "existing"]),
    /** Set when tg_mode is "existing". */
    target_group_id: z.string(),

    /** The rest apply when tg_mode is "new". */
    tg_name: z.string(),
    tg_port: port,
    tg_algorithm: z.enum(["round_robin", "least_connections", "ip_hash"]),
    health_check_path: z.string(),
    health_check_interval_s: z.number().int().min(5).max(300),
    healthy_threshold: z.number().int().min(1).max(10),
    unhealthy_threshold: z.number().int().min(1).max(10),
    targets: z.array(targetSchema),
})

export type TargetFormValues = z.infer<typeof targetSchema>
export type ListenerFormValues = z.infer<typeof listenerSchema>

export const makeSchema = (rule: NamingRule) =>
    z
        .object({
            name: namingNameSchema(rule),
            type: z.enum(["application", "network"]),
            scheme: z.enum(["internet_facing", "internal"]),
            billing_cycle: z.enum(["hourly", "monthly"]),
            resource_group_id: z.string(),
            vpcs: z
                .array(
                    z.object({
                        vpc_id: z.string().min(1, "Select a VPC"),
                        subnet_ids: z.array(z.string()).min(1, "Select at least one subnet"),
                    })
                )
                .min(1, "Attach at least one VPC")
                .refine(
                    (rows) => {
                        const picked = rows.map((r) => r.vpc_id).filter(Boolean)
                        return new Set(picked).size === picked.length
                    },
                    { message: "Each VPC can only be added once" }
                ),
            security_group_ids: z.array(z.string()),
            // A load balancer with no listeners is legal — it just serves nothing,
            // which the review step warns about rather than blocks.
            listeners: z.array(listenerSchema),
        })
        .superRefine((values, ctx) => {
            const seenPorts = new Map<number, number>()

            values.listeners.forEach((l, i) => {
                // One port, one frontend. The backend's unique index would catch
                // this, but only after submit and without naming the other row.
                const first = seenPorts.get(l.port)
                if (first !== undefined) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["listeners", i, "port"],
                        message: `Port ${String(l.port)} is already used by listener ${String(first + 1)}`,
                    })
                } else {
                    seenPorts.set(l.port, i)
                }

                if (l.tg_mode === "existing") {
                    if (!l.target_group_id) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["listeners", i, "target_group_id"],
                            message: "Choose a target group",
                        })
                    }
                } else {
                    // tg_name is deliberately NOT required. A blank one is filled in
                    // from the load balancer's name at submit (see targetGroupName),
                    // the way AWS auto-names a group you did not ask to name.

                    // An HTTP health check needs a path; a TCP one is a connect test.
                    if (l.protocol === "HTTP" && !l.health_check_path.startsWith("/")) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["listeners", i, "health_check_path"],
                            message: "Health check paths start with /",
                        })
                    }

                    l.targets.forEach((tgt, j) => {
                        const p = tgt.port.trim()
                        if (p === "") return
                        const n = Number(p)
                        if (!Number.isInteger(n) || n < 1 || n > 65535) {
                            ctx.addIssue({
                                code: "custom",
                                path: ["listeners", i, "targets", j, "port"],
                                message: "Ports are whole numbers from 1 to 65535",
                            })
                        }
                    })
                }

                splitCIDRs(l.allowed_cidrs).forEach((c) => {
                    if (!isCIDR(c)) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["listeners", i, "allowed_cidrs"],
                            message: `"${c}" is not a CIDR range — try 203.0.113.0/24`,
                        })
                    }
                })
            })
        })

export type FormValues = z.infer<ReturnType<typeof makeSchema>>

/**
 * The name a listener's new target group will actually get.
 *
 * Blank means "you pick one": derived from the load balancer's name and the
 * group's port, so two listeners on one load balancer never collide. Shown as
 * the field's placeholder so the generated name is visible before submit.
 */
export function targetGroupName(lbName: string, listener: ListenerFormValues): string {
    const typed = listener.tg_name.trim()
    if (typed) return typed
    const base = lbName.trim() || "lb"
    return `${base}-tg-${String(listener.tg_port)}`
}

/** Splits the comma-separated source field into trimmed, non-empty ranges. */
export function splitCIDRs(raw: string): string[] {
    return raw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
}

/** A blank listener, used by "Add listener" and by the presets. */
export function emptyListener(
    protocol: ListenerFormValues["protocol"],
    port: number,
    tgPort: number
): ListenerFormValues {
    return {
        protocol,
        port,
        allowed_cidrs: "",
        tg_mode: "new",
        target_group_id: "",
        tg_name: "",
        tg_port: tgPort,
        tg_algorithm: "round_robin",
        health_check_path: "/healthz",
        health_check_interval_s: 30,
        healthy_threshold: 3,
        unhealthy_threshold: 3,
        targets: [],
    }
}
