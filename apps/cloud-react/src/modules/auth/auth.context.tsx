import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { clearAllBrowserData } from "@/lib/browser-data"
import { ACCOUNT_QUERY_KEYS } from "@/modules/accounts/accounts.constants"
import { ORG_QUERY_KEYS } from "@/modules/organizations/organizations.constants"
import { activeScope } from "@/services/api/active-scope"
import { authToken, refreshToken } from "@/services/api/auth-token"

import { authApi } from "./auth.api"
import { AUTH_QUERY_KEYS } from "./auth.constants"
import type { AuthTokenResponse, UserProfile } from "./auth.types"

interface AuthContextValue {
    user: UserProfile | null
    isLoading: boolean
    isAuthenticated: boolean
    /** Store the in-memory access token + seed the session cache after sign-in. */
    authenticate: (res: AuthTokenResponse) => void
    logout: () => void
    refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
    const queryClient = useQueryClient()

    // Browser sessions persist the access JWT in an HttpOnly cookie. The SPA
    // cannot read that cookie, so boot by probing /session and let the backend
    // authenticate from either Authorization or the cookie. If the cookie is
    // missing/expired, the API interceptor can still rotate the IndexedDB refresh
    // token and replay the probe.
    const [tokenReady, setTokenReady] = useState(true)

    const { data, isLoading, isFetching } = useQuery({
        queryKey: AUTH_QUERY_KEYS.session,
        queryFn: authApi.session,
        enabled: tokenReady,
        retry: false,
        staleTime: 60_000,
    })

    useEffect(() => {
        if (data?.accounts) queryClient.setQueryData(ACCOUNT_QUERY_KEYS.mine, data.accounts)
        if (data?.organizations) queryClient.setQueryData(ORG_QUERY_KEYS.mine, data.organizations)
    }, [data?.accounts, data?.organizations, queryClient])

    const authenticate = useCallback(
        (res: AuthTokenResponse) => {
            // Access token → memory; refresh token → IndexedDB (persisted for the
            // silent boot/401 refresh). Seed the session cache.
            authToken.set(res.accessToken)
            void refreshToken.set(res.refreshToken)
            setTokenReady(true)
            queryClient.setQueryData(AUTH_QUERY_KEYS.session, res.user)
            void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session })
        },
        [queryClient]
    )

    const logout = useCallback(() => {
        // Server-side sign-out (token-epoch bump). Always drop local state and
        // bounce to login, even if the call fails. Nothing survives a logout:
        // in-memory token + scope, then a FULL browser wipe — localStorage,
        // sessionStorage, cookies, and every IndexedDB database (refresh token
        // included). Sync wrapper so click handlers get a plain () => void.
        void (async () => {
            try {
                await authApi.logout()
            } catch {
                // ignore — local state is cleared regardless
            }
            authToken.clear()
            activeScope.clear()
            setTokenReady(false)
            queryClient.setQueryData(AUTH_QUERY_KEYS.session, null)
            queryClient.clear()
            // Explicit record delete first: if the whole-DB delete reports
            // blocked (this page still holds connections), the token row is
            // already gone.
            await refreshToken.clear()
            await clearAllBrowserData()
            window.location.href = "/login"
        })()
    }, [queryClient])

    const refresh = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session })
    }, [queryClient])

    const value = useMemo<AuthContextValue>(
        () => ({
            user: data ?? null,
            // Loading until the session probe resolves. It may authenticate via
            // Authorization, the HttpOnly access cookie, or a refresh-token retry.
            isLoading: tokenReady && (isLoading || isFetching) && !data,
            isAuthenticated: tokenReady && !!data,
            authenticate,
            logout,
            refresh,
        }),
        [data, tokenReady, isLoading, isFetching, authenticate, logout, refresh]
    )

    return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
    const ctx = use(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
    return ctx
}
