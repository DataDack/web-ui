import { Loader2 } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { sessionIsUsable, useSession } from "@/lib/auth"

/**
 * Gates the console on a usable session.
 *
 * This is a routing convenience, not a security boundary — the control plane
 * rejects every unauthenticated /v1 call regardless of what this component
 * renders. What it buys is that a signed-out operator sees a sign-in form
 * instead of a shell full of failed panels.
 */
export function RequireAuth() {
  const location = useLocation()
  const { data: session, isPending, isError } = useSession()

  if (isPending) {
    return (
      <div className="bg-background bg-gradient-surface flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-label="Loading" />
      </div>
    )
  }

  // A session check that failed outright (the control plane is down, or CORS
  // blocked it) is not the same as being signed out, but there is nothing to
  // render either way, and the sign-in form is where the operator can at least
  // see the error and retry.
  if (isError || !sessionIsUsable(session)) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
