import { cn } from "@/lib/utils"

import { formatLimit, isUnlimited } from "../plan/plan-format"

interface QuotaMeterProps {
    label: string
    used: number
    limit: number
    /** What one unit is called, for the "2 of 5 projects" line. */
    unit: string
}

/**
 * One quota with its usage against it.
 *
 * Only rendered for quotas the platform genuinely measures — today that is the
 * project count, which the create endpoint enforces. Drawing a bar for build
 * minutes or bandwidth would invent a measurement nothing takes.
 *
 * An unlimited quota gets no bar: a fraction of infinity is not a picture of
 * anything, so it states the usage and stops.
 */
export function QuotaMeter({ label, used, limit, unit }: Readonly<QuotaMeterProps>) {
    const unlimited = isUnlimited(limit)
    // A limit of 0 has no bar to fill and would divide by zero; it is a real
    // "none", so the ratio is treated as full.
    const ratio = unlimited || limit <= 0 ? 0 : Math.min(1, used / limit)
    const spent = !unlimited && used >= limit && limit >= 0
    const tight = !unlimited && limit > 0 && ratio >= 0.8
    let barColor = "bg-brand-gold"
    if (spent) barColor = "bg-status-danger"
    else if (tight) barColor = "bg-status-warning"

    return (
        <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {label}
                </span>
                <span
                    className={cn(
                        "font-mono text-[12px] font-medium",
                        spent && "text-status-danger"
                    )}
                >
                    {unlimited
                        ? `${used.toLocaleString()} ${unit} · unlimited`
                        : `${used.toLocaleString()} of ${formatLimit(limit)} ${unit}`}
                </span>
            </div>
            {!unlimited && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                        className={cn("h-full rounded-full transition-[width]", barColor)}
                        style={{ width: `${String(Math.round(ratio * 100))}%` }}
                    />
                </div>
            )}
        </div>
    )
}
