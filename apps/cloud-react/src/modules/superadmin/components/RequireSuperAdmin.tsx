import type { ReactElement, ReactNode } from "react"

import { Navigate } from "react-router-dom"

import { AuthCardSkeleton } from "@/components/console/feedback/Skeletons"
import { useAuth } from "@/modules/auth/auth.context"

/**
 * Route guard for the platform admin panel. Renders a skeleton while the
 * session resolves, then redirects anyone who is not a platform super admin
 * back to the dashboard. The backend independently enforces the same flag
 * (is_super_admin), so this is UX only — not the security boundary.
 */
export function RequireSuperAdmin({ children }: Readonly<{ children: ReactNode }>): ReactElement {
    const { isLoading, isAuthenticated, user } = useAuth()

    if (isLoading) return <AuthCardSkeleton />
    if (!isAuthenticated || !user) return <Navigate to="/login" replace />
    if (!user.is_super_admin) return <Navigate to="/" replace />

    return children as ReactElement
}
