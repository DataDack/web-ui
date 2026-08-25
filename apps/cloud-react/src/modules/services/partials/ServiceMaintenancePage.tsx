import { Clock3, Wrench } from "lucide-react"

export function ServiceMaintenancePage() {
  return (
    <section
      aria-labelledby="service-maintenance-title"
      className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center py-12"
    >
      <div className="w-full rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm md:px-10 md:py-14">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Wrench aria-hidden="true" className="h-7 w-7" />
        </div>

        <p className="mt-6 font-mono text-xs font-medium uppercase tracking-widest text-secondary">
          Scheduled maintenance
        </p>
        <h1
          id="service-maintenance-title"
          className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          Platform is under maintenance
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground md:text-base">
          We are carrying out scheduled maintenance across the DataDack platform. Please check
          back shortly.
        </p>

        <div className="mx-auto mt-7 flex w-fit items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Clock3 aria-hidden="true" className="h-4 w-4" />
          Your resources and data remain safe during maintenance.
        </div>
      </div>
    </section>
  )
}
