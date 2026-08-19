import { cn, Skeleton } from "@datadack/common-ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Stagger, StaggerItem } from "@/components/console"
import { useCatalogServices } from "@/modules/services/catalog.hooks"
import type { CatalogService } from "@/modules/services/catalog.types"
import { ServiceIcon } from "@/modules/services/ServiceIcon"

/**
 * The Console-home tile grid.
 *
 * These tiles used to be a hardcoded array here, which meant the catalog the
 * super admin edits (and the Sovereign Services cards below, which have always
 * read it) could not describe them: enabling Storage in the admin left this
 * grid showing "Coming soon" until someone shipped a build. They now read the
 * same `/platform/catalog/services` response, so the order, the labels, the
 * icons and the coming-soon state have exactly one owner.
 *
 * The trade that comes with it: labels are catalog rows, so they are no longer
 * translated. That is already true of the service cards under them.
 */

/** Tile icon colour: muted when coming soon. */
function iconColorClass(comingSoon: boolean): string {
  if (comingSoon) return "text-muted-foreground/60"
  return "text-muted-foreground group-hover:text-foreground"
}

function ServiceTile({ service }: Readonly<{ service: CatalogService }>) {
  const { t } = useTranslation()
  const comingSoon = service.state === "coming_soon"

  const tile = (
    <span
      className={cn(
        "console-card relative flex size-12 items-center justify-center rounded-[14px] border bg-card/50 transition-all",
        comingSoon
          ? "border-dashed border-border"
          : "group-hover:border-brand-gold group-hover:shadow-[0_0_18px_var(--brand-gold-glow)] group-focus-visible:ring-2 group-focus-visible:ring-ring/50",
        "border-border",
      )}
    >
      <ServiceIcon
        name={service.icon}
        className={cn("size-5 transition-colors", iconColorClass(comingSoon))}
      />
      {comingSoon && (
        <span className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-card px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("dashboard.home.quickActions.soon")}
        </span>
      )}
    </span>
  )

  const label = (
    <span
      className={cn(
        "text-center text-xs leading-tight",
        comingSoon ? "text-muted-foreground/60" : "text-muted-foreground group-hover:text-foreground",
      )}
    >
      {service.short_name}
    </span>
  )

  // A coming-soon service has no page to open — and a catalog row with no path
  // set has nowhere to go either, so it gets the same inert treatment rather
  // than a link to "".
  if (comingSoon || !service.path) {
    return (
      <div
        aria-disabled
        title={comingSoon ? t("comingSoon.title") : undefined}
        className="group flex w-[88px] cursor-not-allowed flex-col items-center gap-2 outline-none"
      >
        {tile}
        {label}
      </div>
    )
  }

  return (
    <Link to={service.path} className="group flex w-[88px] flex-col items-center gap-2 outline-none">
      {tile}
      {label}
    </Link>
  )
}

function TileSkeleton() {
  return (
    <div className="flex w-[88px] flex-col items-center gap-2">
      <Skeleton className="size-12 rounded-[14px]" />
      <Skeleton className="h-3 w-14" />
    </div>
  )
}

export function QuickActions() {
  const { data: services = [], isLoading } = useCatalogServices()

  // The tile count is stable enough across accounts that a fixed-length
  // skeleton row reads as the grid arriving rather than as layout shift.
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3 sm:gap-4">
        {["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"].map((k) => (
          <TileSkeleton key={k} />
        ))}
      </div>
    )
  }

  return (
    <Stagger className="flex flex-wrap gap-3 sm:gap-4" stagger={0.04}>
      {services.map((svc) => (
        <StaggerItem key={svc.id}>
          <ServiceTile service={svc} />
        </StaggerItem>
      ))}
    </Stagger>
  )
}
