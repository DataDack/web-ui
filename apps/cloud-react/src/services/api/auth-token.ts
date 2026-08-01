import axios from "axios"

import { idbDel, idbGet, idbSet } from "./active-scope"

// Token storage:
//   • Access token  — in memory for bearer clients and also set by the backend
//     as an HttpOnly cookie for browser reload persistence.
//   • Refresh token — IndexedDB (same `dd` DB as the active scope), sent
//     to the OAuth-style /token endpoint as a refresh_token grant. Rotated on
//     every refresh.
// NOTE: the refresh token in IndexedDB is readable by JavaScript, so an XSS can
// steal it for long-lived access. The access cookie is HttpOnly and protected by
// the backend's same-origin app-header guard.

const REFRESH_KEY = "refresh-token"

interface RefreshTokenResponse {
    access_token?: string
    refresh_token?: string
}

// ── In-memory access token ──────────────────────────────────────────────────
let accessToken: string | null = null

export const authToken = {
    get: () => accessToken,
    set: (t: string | null) => {
        accessToken = t
    },
    clear: () => {
        accessToken = null
    },
}

// ── Refresh token (IndexedDB) ───────────────────────────────────────────────
export const refreshToken = {
    get: () => idbGet<string>(REFRESH_KEY),
    set: (t: string) => idbSet(REFRESH_KEY, t),
    clear: () => idbDel(REFRESH_KEY),
}

// ── Single-flight silent refresh ────────────────────────────────────────────
// Concurrent callers (the boot probe + any 401 retries) share one in-flight
// request so we never fire parallel refreshes.
let inflight: Promise<string | null> | null = null

/**
 * Mint a fresh access token from the IndexedDB refresh token. Returns the new
 * access token (also stored in `authToken`; the backend also refreshes the
 * HttpOnly access cookie) or null when there is no valid session. Rotates the
 * refresh token (stores the new one). Uses a bare axios call — not the shared
 * `api` instance — to avoid an import cycle and to bypass the 401 response
 * interceptor (a failed refresh must not recurse). Sends an OAuth-style form
 * body plus X-Requested-With so it clears the backend's app-header guard.
 */
export function refreshAccessToken(): Promise<string | null> {
    if (inflight) return inflight
    inflight = (async () => {
        const stored = await refreshToken.get()
        if (!stored) {
            accessToken = null
            return null
        }
        try {
            const body = new URLSearchParams()
            body.set("grant_type", "refresh_token")
            body.set("refresh_token", stored)
            const res = await axios.post<RefreshTokenResponse>(
                "/api/v1/auth/users/token",
                body,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                }
            )
            accessToken = res.data.access_token ?? null
            if (res.data.refresh_token) await refreshToken.set(res.data.refresh_token)
            return accessToken
        } catch {
            // Refresh token is invalid/expired — drop it so we don't retry it.
            accessToken = null
            await refreshToken.clear()
            return null
        }
    })().finally(() => {
        inflight = null
    })
    return inflight
}
