import { useEffect } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { connection, fetchSession, onUnauthorized } from "@/lib/api"

export const sessionQueryKey = ["session"] as const

/** Shared so a burst of rejected requests collapses into a single toast. */
const UNAUTHORIZED_TOAST_ID = "faas.auth.unauthorized"

/**
 * Who the control plane thinks is calling, and which accounts they can reach.
 *
 * There is no sign-in page: the console is driven by the access token pasted
 * into Connection settings, or by nothing at all against a control plane with
 * auth switched off. This hook is what turns that token into something useful —
 * the account list behind the tenant switcher — and what notices when it stops
 * working.
 *
 * It does not poll. The token's real lifetime is its own expiry, which the
 * control plane re-checks on every request, so a lapse is discovered by the
 * first call that fails rather than by an interval that would only learn the
 * same thing later.
 */
export function useSession() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    staleTime: 30_000,
    // A failed session check must not silently retry into a spinner.
    retry: false,
  })

  useEffect(
    () =>
      onUnauthorized((reason) => {
        // Every branch ends with the operator needing to do something, so each
        // one says what. The toasts share a stable id, because the console
        // fires several requests in parallel on load and a burst of rejections
        // must collapse into one notification rather than a stack.
        if (reason === "token-expired") {
          // Discovered locally from the token's own exp claim, so this is
          // certain: it is spent, and it has already been dropped.
          toast.error("Your access token expired", {
            id: UNAUTHORIZED_TOAST_ID,
            description: "Add a new one in Connection settings to continue.",
          })
        } else if (connection.token()) {
          // A 401 from the control plane, on a token that has not expired.
          //
          // Deliberately NOT cleared. A rejection can mean the token is bad, or
          // it can mean the control plane could not check it — a cold key set,
          // a restart, a blip at the identity service. Discarding a good
          // credential over someone else's transient fault is unrecoverable
          // without the operator going to find another token, and it is exactly
          // what turned one bad response into a console that stayed broken.
          //
          // The operator is told and can clear it themselves; a genuinely dead
          // token keeps saying so on every poll until they do.
          toast.error("Your access token was rejected", {
            id: UNAUTHORIZED_TOAST_ID,
            description:
              "The control plane refused it. If it was revoked, replace it in Connection settings.",
          })
        } else {
          // No token at all, against a control plane that wants one.
          toast.error("This control plane requires an access token", {
            id: UNAUTHORIZED_TOAST_ID,
            description: "Add one in Connection settings.",
          })
        }
        void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      }),
    [queryClient],
  )

  return query
}
