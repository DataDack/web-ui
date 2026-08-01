// Stable per-device/browser identifier sent as X-Device-Id on every request.
// Not a secret and not tied to a user — it identifies this browser profile, so
// it persists in localStorage (survives reloads and logouts) and is generated
// once on first use.
const DEVICE_KEY = "dd.deviceId"

// Memoized after first use: the id never changes for the life of the tab, so the
// per-request interceptor reads this cache instead of touching localStorage.
let cachedDeviceId: string | null = null

// crypto.randomUUID exists only in a secure context (https, localhost, 127.0.0.1).
// Reaching the dev server over a plain-http LAN hostname (http://openalgo:3000)
// leaves it undefined, and this runs in the per-request interceptor — an
// unguarded call there throws before axios sends, so every API call dies with no
// network request to show for it. The id is a non-secret browser tag, so a
// non-cryptographic fallback is fine.
function randomId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }
    // eslint-disable-next-line sonarjs/pseudo-random -- fallback path only; the id is a non-secret browser tag, as the comment above spells out
    return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getDeviceId(): string {
    if (cachedDeviceId) return cachedDeviceId
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
        id = randomId()
        localStorage.setItem(DEVICE_KEY, id)
    }
    cachedDeviceId = id
    return id
}
