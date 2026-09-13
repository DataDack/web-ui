/**
 * Every name this console stores something under, in one place, from env.
 *
 * They are configuration rather than constants because they are a DEPLOYMENT
 * fact, not a product one. Two consoles served from the same origin — a preview
 * and production behind one hostname, or two tenants of a white-label build —
 * share one localStorage and one IndexedDB, so identical key names mean each
 * one silently overwrites the other's session and active account. Giving a
 * deployment its own prefix is the fix, and it cannot be done from code that
 * hardcodes the names.
 *
 * Vite substitutes `import.meta.env.VITE_*` at BUILD time, so these are fixed in
 * the bundle; changing one requires a rebuild, not a restart. That is why they
 * are read once here rather than at each use — a value that cannot change after
 * the build should not look like it can.
 *
 * Every default is the name that was hardcoded before, so a build that sets none
 * of these behaves exactly as it did. Changing one signs every existing session
 * out on next load: the old keys are still in the browser, and nothing reads
 * them any more.
 *
 * The access COOKIE's name is not here. It is HttpOnly — this code cannot read
 * it by design — and the only thing that needs to agree on it is the backend,
 * which takes it from AUTH_ACCESS_COOKIE_NAME.
 */

/** Reads a build-time name, falling back when it was not supplied. */
function name(configured: string | undefined, fallback: string): string {
  // An explicit length check rather than `??`: a variable that is present but
  // blank — `VITE_DEVICE_ID_KEY=` in an env file — has to fall back too, and
  // `??` would accept the empty string as a deliberate name. Storage under ""
  // does not fail, it just can never be read again.
  const trimmed = configured?.trim()
  if (trimmed === undefined || trimmed.length === 0) return fallback
  return trimmed
}

export const STORAGE_KEYS = {
  /** IndexedDB: the refresh token every access token is minted from. */
  refreshToken: name(import.meta.env.VITE_REFRESH_TOKEN_KEY as string | undefined, "refresh-token"),
  /** IndexedDB: the active account + resource-group scope. */
  activeScope: name(import.meta.env.VITE_ACTIVE_SCOPE_KEY as string | undefined, "active-scope"),
  /** localStorage: the stable per-browser device id. */
  deviceId: name(import.meta.env.VITE_DEVICE_ID_KEY as string | undefined, "dd.deviceId"),
  /** sessionStorage: the one-shot guard against a stale-scope reload loop. */
  scopeReset: name(import.meta.env.VITE_SCOPE_RESET_KEY as string | undefined, "dd:scope-reset"),
} as const
