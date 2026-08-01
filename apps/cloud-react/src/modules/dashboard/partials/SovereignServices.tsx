import { CheckCircle2, Grip } from "lucide-react"
import { Link } from "react-router-dom"

import { Stagger, StaggerItem } from "@/components/console"
import { cn } from "@/lib/utils"
import { useCatalogServices } from "@/modules/services/catalog.hooks"
import type { CatalogMetric, CatalogService, CatalogStatus } from "@/modules/services/catalog.types"
import { ServiceIcon } from "@/modules/services/ServiceIcon"

import { Skeleton } from "@DataDack/common-ui"

// Health-dot colour per operational status.
const STATUS_DOT: Record<CatalogStatus, string> = {
  operational: "bg-[var(--success-pulse)]",
  degraded: "bg-amber-500",
  maintenance: "bg-sky-500",
}

const STATUS_LABEL: Record<CatalogStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  maintenance: "Maintenance",
}

function MetricChip({ metric }: Readonly<{ metric: CatalogMetric }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-white/[0.04] px-2 py-0.5 font-mono text-[11px]",
        metric.accent
          ? "text-[var(--success-pulse)] border-[var(--success-pulse)]/30 bg-[var(--success-pulse)]/[0.06]"
          : "text-muted-foreground",
      )}
    >
      {metric.accent && <CheckCircle2 className="h-3 w-3" />}
      {metric.value} {metric.label}
    </span>
  )
}

function ServiceCard({ service }: Readonly<{ service: CatalogService }>) {
  const comingSoon = service.state === "coming_soon"

  const cardClassName = cn(
    "console-card flex h-full flex-col rounded-2xl border border-border bg-card/50 p-5 transition-colors",
    comingSoon ? "opacity-70" : "hover:border-border/80",
  )

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white/[0.05]">
          <ServiceIcon name={service.icon} className="h-5 w-5 text-foreground" />
        </div>
        {comingSoon ? (
          <span className="rounded-full border border-border bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
            title={STATUS_LABEL[service.status]}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[service.status])} />
            {STATUS_LABEL[service.status]}
          </span>
        )}
      </div>

      <h3 className="mt-4 font-semibold text-foreground">{service.name}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{service.description}</p>

      {service.metrics.length > 0 && (
        <>
          <div className="my-4 h-px w-full bg-border" />
          <div className="mt-auto flex flex-wrap gap-2">
            {service.metrics.map((m) => (
              <MetricChip key={m.label} metric={m} />
            ))}
          </div>
        </>
      )}
    </>
  )

  if (comingSoon) {
    return <div className={cardClassName}>{inner}</div>
  }

  return (
    <Link to={service.path} className={cn(cardClassName, "block")}>
      {inner}
    </Link>
  )
}

function CardSkeleton() {
  return (
    <div className="console-card flex h-full flex-col rounded-2xl border border-border bg-card/50 p-5">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-4/5" />
      <div className="my-4 h-px w-full bg-border" />
      <div className="mt-auto flex gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
}

export function SovereignServices() {
  const { data: services = [], isLoading } = useCatalogServices()

  return (
    <section>
      <header className="mb-8">
        <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          <Grip className="h-6 w-6" />
          Sovereign Services
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage infrastructure across your isolated domains.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
            <CardSkeleton key={k} />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
          {services.map((svc) => (
            <StaggerItem key={svc.id}>
              <ServiceCard service={svc} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  )
}
