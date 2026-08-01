import type { ReactElement, ReactNode } from "react"

import { Navigate } from "react-router-dom"

import { AuthCardSkeleton } from "@/components/console/feedback/Skeletons"

import { useAuth } from "../auth.context"

/**
 * Route guard. Renders a skeleton while the session resolves, redirects
 * unauthenticated users to /login, and (when requireOnboarded) pushes users
 * with incomplete onboarding into the wizard.
 */
export function RequireAuth({
  children,
  requireOnboarded = true,
}: Readonly<{ children: ReactNode; requireOnboarded?: boolean }>): ReactElement {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) return <AuthCardSkeleton />
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />

  if (requireOnboarded && user.onboarding_status !== "completed") {
    return <Navigate to="/onboarding" replace />
  }

  return children as ReactElement
}
