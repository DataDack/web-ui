import { Skeleton } from "@datadack/common-ui"
/** Full-screen placeholder shown while the auth session resolves. Prevents the
 *  gate from flashing login → home. */
export function AuthCardSkeleton() {
  return (
    <div className="bg-gradient-surface grid min-h-screen place-items-center px-5">
      <div className="glass-2 console-card w-full max-w-sm space-y-5 rounded-2xl p-8">
        <Skeleton className="mx-auto h-8 w-40" />
        <Skeleton className="h-4 w-56" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

/** Form-shaped placeholder for an onboarding step — matches the real grid so
 *  there is no layout shift on data swap. */
export function OnboardingStepSkeleton({ rows = 4 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Generic card-list placeholder (e.g. selectable option cards). */
export function OptionCardsSkeleton({ count = 2 }: Readonly<{ count?: number }>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  )
}
