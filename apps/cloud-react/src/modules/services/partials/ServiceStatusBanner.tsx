import { useState } from "react"

import { AlertTriangle } from "lucide-react"

import { useServiceStatus } from "../services.hooks"
import { MaintenanceBanner } from "./MaintenanceBanner"

interface Props {
    serviceId: string
}

export function ServiceStatusBanner({ serviceId }: Readonly<Props>) {
    const [dismissed, setDismissed] = useState(false)
    const { isUnderMaintenance, isDegraded, maintenance, affectedSubServices } =
        useServiceStatus(serviceId)

    if (dismissed || (!isUnderMaintenance && !isDegraded)) return null

    if (isUnderMaintenance && maintenance) {
        return (
            <MaintenanceBanner
                maintenance={maintenance}
                affectedSubServices={affectedSubServices}
                onDismiss={() => {
                    setDismissed(true)
                }}
            />
        )
    }

    if (isDegraded && affectedSubServices.length > 0) {
        return (
            <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{
                    background: "rgba(255,183,123,0.06)",
                    border: "1px solid rgba(255,183,123,0.2)",
                }}
            >
                <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--secondary)" }} />
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">Service Degraded</span>
                    <span className="text-xs text-muted-foreground ml-2">
                        Affected: {affectedSubServices.join(", ")}
                    </span>
                </div>
                <button
                    onClick={() => {
                        setDismissed(true)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    Dismiss
                </button>
            </div>
        )
    }

    return null
}
