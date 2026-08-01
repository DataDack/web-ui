import { type LucideIcon, AlertTriangle, Construction, Plus, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { ServiceStatus, SubServiceDefinition } from "../services.types"

interface SubServicePlaceholderProps {
    subService?: SubServiceDefinition
    icon?: LucideIcon
    name?: string
    description?: string
    onConfigure?: () => void
}

const STATUS_CONFIG: Record<ServiceStatus, { icon: LucideIcon; label: string; badgeClass: string }> = {
    operational: { icon: Construction, label: "Not Configured", badgeClass: "" },
    degraded: { icon: AlertTriangle, label: "Degraded", badgeClass: "bg-secondary/10 text-secondary border-secondary/30" },
    maintenance: { icon: Settings, label: "Under Maintenance", badgeClass: "bg-secondary/10 text-secondary border-secondary/30" },
    outage: { icon: AlertTriangle, label: "Outage", badgeClass: "bg-destructive/10 text-destructive border-destructive/30" },
}

export function SubServicePlaceholder({
    subService,
    icon,
    name,
    description,
    onConfigure,
}: Readonly<SubServicePlaceholderProps>) {
    const status = subService?.status ?? "operational"
    const cfg = STATUS_CONFIG[status]
    const StatusIcon = cfg.icon
    const DisplayIcon = icon ?? (subService?.icon ?? Construction)

    const displayName = name ?? subService?.name ?? "Sub-service"
    const displayDesc = description ?? subService?.description ?? "This sub-service has not been configured yet."

    const isIssue = status !== "operational"

    return (
        <div
            className="rounded-xl p-10 flex flex-col items-center gap-5 text-center"
            style={{
                background: isIssue ? "rgba(255,183,123,0.04)" : "rgba(255,255,255,0.02)",
                border: `1px dashed ${isIssue ? "rgba(255,183,123,0.2)" : "var(--border)"}`,
            }}
        >
            {/* Icon */}
            <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: isIssue ? "rgba(255,183,123,0.1)" : "var(--muted)" }}
            >
                {isIssue ? (
                    <StatusIcon className="w-7 h-7" style={{ color: "var(--secondary)" }} />
                ) : (
                    <DisplayIcon className="w-7 h-7 text-muted-foreground" />
                )}
            </div>

            {/* Text */}
            <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{displayName}</h3>
                    {isIssue && (
                        <Badge variant="outline" className={`text-[10px] font-mono ${cfg.badgeClass}`}>
                            {cfg.label}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground max-w-sm">
                    {isIssue
                        ? subService?.maintenance?.message ?? `${displayName} is currently ${status}.`
                        : displayDesc}
                </p>
            </div>

            {/* CTA */}
            {!isIssue && (
                <Button variant="outline" size="sm" className="gap-2" onClick={onConfigure}>
                    <Plus className="w-3.5 h-3.5" />
                    Configure {displayName}
                </Button>
            )}
        </div>
    )
}
