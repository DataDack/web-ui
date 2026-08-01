import { ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { Badge } from "@DataDack/common-ui"

import type { ServiceDefinition, ServiceStatus } from "../services.types"

/* ── Status indicator ──────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<ServiceStatus, { label: string; dotColor: string; textColor: string }> =
  {
    operational: {
      label: "Operational",
      dotColor: "var(--success-pulse)",
      textColor: "var(--success-pulse)",
    },
    degraded: {
      label: "Degraded",
      dotColor: "var(--secondary)",
      textColor: "var(--secondary)",
    },
    maintenance: {
      label: "Maintenance",
      dotColor: "var(--secondary)",
      textColor: "var(--secondary)",
    },
    outage: {
      label: "Outage",
      dotColor: "var(--destructive)",
      textColor: "var(--destructive)",
    },
  }

function StatusPill({ status }: Readonly<{ status: ServiceStatus }>) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-1.5 h-1.5 rounded-full ${status === "operational" ? "animate-pulse" : ""}`}
        style={{ background: cfg.dotColor }}
      />
      <span className="text-[11px] font-mono" style={{ color: cfg.textColor }}>
        {cfg.label}
      </span>
    </div>
  )
}

/* ── Component ─────────────────────────────────────────────────────────── */

interface ServiceCardProps {
  service: ServiceDefinition
}

export function ServiceCard({ service }: Readonly<ServiceCardProps>) {
  const Icon = service.icon
  const hasSubServices = service.subServices.length > 0
  const degradedSubs = service.subServices.filter((s) => s.status !== "operational").length

  return (
    <Link to={service.path} className="block group">
      <Card className="h-full glass-2 hover:bg-white/[0.03] transition-all duration-300 border-none">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors group-hover:bg-white/[0.06]"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Icon className="w-5 h-5 text-primary" />
            </div>

            {/* Status + arrow */}
            <div className="flex items-center gap-2">
              <StatusPill status={service.status} />
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>

          <div className="mt-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {service.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          </div>
        </CardHeader>

        {hasSubServices && (
          <>
            <Separator style={{ opacity: 0.4 }} />
            <CardContent className="pt-3 pb-2">
              <div className="flex flex-wrap gap-1">
                {service.subServices.slice(0, 4).map((sub) => {
                  const SubIcon = sub.icon
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                      style={{
                        background:
                          sub.status !== "operational"
                            ? "rgba(255,183,123,0.08)"
                            : "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color:
                          sub.status !== "operational" ? "var(--secondary)" : "var(--bsc-outline)",
                      }}
                    >
                      <SubIcon className="w-3 h-3" />
                      {sub.name}
                    </div>
                  )
                })}
                {service.subServices.length > 4 && (
                  <span className="text-[11px] text-muted-foreground self-center px-1">
                    +{service.subServices.length - 4}
                  </span>
                )}
              </div>
            </CardContent>
          </>
        )}

        <CardFooter className="pt-0 pb-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {hasSubServices && <span>{service.subServices.length} sub-services</span>}
            {degradedSubs > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono"
                style={{
                  color: "var(--secondary)",
                  borderColor: "rgba(255,183,123,0.3)",
                  background: "rgba(255,183,123,0.05)",
                }}
              >
                {degradedSubs} affected
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
