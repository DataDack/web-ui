import { useEffect } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { connection, fetchSession, onUnauthorized, signIn, signOut, type Credentials } from "@/lib/api"
import type { Session } from "@/lib/schemas"

export const sessionQueryKey = ["session"] as const

/** Shared so a burst of rejected requests collapses into a single toast. */
const UNAUTHORIZED_TOAST_ID = "faas.auth.unauthorized"

/**
 * The console's view of who is signed in.
 *
 * It does not poll. The session's real lifetime is the access token's, which the
 * control plane re-checks on every request anyway — so expiry is discovered by
 * the first call that gets a 401, and the interceptor's notification is what
 * refetches this. Polling would only add a request per interval to learn the
 * same thing later.
 */
export function useSession() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    staleTime: 30_000,
    // A failed session check is the one query that must not silently retry into
    // a spinner: it gates the whole console.
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
          // Noticed locally, before the request went out — the token carried an
          // exp claim that has passed and has already been dropped.
          toast.error("Your access token expired", {
            id: UNAUTHORIZED_TOAST_ID,
            description: "Add a new one to continue.",
          })
        } else if (connection.token()) {
          // The control plane refused a token that still looks live: revoked,
          // or never valid. Dropping it is what turns "every request fails
          // silently" into "you need to add a token again".
          connection.clearToken()
          toast.error("Your access token was rejected", {
            id: UNAUTHORIZED_TOAST_ID,
            description: "It has been revoked or is not valid here. Add a new one to continue.",
          })
        } else if (queryClient.getQueryData<Session>(sessionQueryKey)?.authenticated) {
          // No stored token, but we were signed in: the session cookie lapsed.
          // The guard is about to redirect to the sign-in form; say why, or the
          // redirect looks like the console losing its place.
          toast.error("Your session expired", {
            id: UNAUTHORIZED_TOAST_ID,
            description: "Sign in again to continue.",
          })
        }
        void queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      }),
    [queryClient],
  )

  return query
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credentials: Credentials) => signIn(credentials),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session)
      // Everything cached was fetched as whoever was here before — usually
      // nobody. Drop it rather than show one operator another's snapshot.
      void queryClient.invalidateQueries()
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: signOut,
    // Clearing runs on settle, not just success: if the sign-out request fails
    // the operator still expects to be signed out locally, and leaving the
    // previous session's data on screen would be the worst of both.
    onSettled: () => {
      queryClient.clear()
    },
  })
}

/**
 * Whether the console should be usable at all.
 *
 * Two ways in: a signed-in principal, or a control plane running with auth off
 * (`principalType: "anonymous"`), which is the local and single-operator case.
 */
export function sessionIsUsable(session: Session | undefined): boolean {
  if (!session) return false
  return session.authenticated || session.principalType === "anonymous"
}

/** Whether sign-out is a meaningful action, i.e. there is a session to end. */
export function sessionIsSignedIn(session: Session | undefined): boolean {
  return Boolean(session?.authenticated) && session?.principalType !== "anonymous"
}

/** A short label for the signed-in principal, for the topbar. */
export function principalLabel(session: Session | undefined): string {
  if (!session) return ""
  if (session.email) return session.email
  if (session.principalType === "client") return session.principalId || "service credential"
  if (session.principalType === "anonymous") return "auth disabled"
  return session.principalId
}
