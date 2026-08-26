import { AlertTriangle } from "lucide-react"

import { hasClosedService } from "../catalog.gate"
import { useCatalogServices } from "../catalog.hooks"

/**
 * Console-home notice that some service pages are shut. Self-gating: it reads
 * the same admin-managed catalog the route gate does, so it appears exactly
 * when at least one service is `coming_soon` or in `maintenance` and goes away
 * on its own once an operator opens the last one — no build, and no banner
 * claiming maintenance over a fully open platform.
 */
export function PlatformMaintenanceBanner() {
  const { data: services = [] } = useCatalogServices()

  if (!hasClosedService(services)) return null

  return (
    <aside
      aria-labelledby="platform-maintenance-banner-title"
      className="mx-auto flex w-full max-w-3xl items-start gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3.5 text-left"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
      <div>
        <h2 id="platform-maintenance-banner-title" className="text-sm font-semibold text-foreground">
          Platform is under maintenance
        </h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Service pages are temporarily unavailable while scheduled maintenance is in progress.
          Please check back shortly.
        </p>
      </div>
    </aside>
  )
}
