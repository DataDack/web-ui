import { AlertTriangle } from "lucide-react"

export function PlatformMaintenanceBanner() {
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
