/**
 * Every name this console stores something under, in one place, from env.
 *
 * They are configuration rather than constants because they are a DEPLOYMENT
 * fact, not a product one. Two control-plane consoles served from the same
 * origin share one localStorage, so identical key names mean each one silently
 * overwrites the other's stored token, API base and account. Giving a
 * deployment its own prefix is the fix, and it cannot be done from code that
 * hardcodes the names.
 *
 * A single prefix drives all of them, because these keys are only ever
 * meaningful together: a console reading one deployment's token and another's
 * API base is worse than one reading neither. Per-key overrides would let that
 * happen by a typo.
 *
 * Vite substitutes `import.meta.env.VITE_*` at BUILD time, so this is fixed in
 * the bundle; changing it requires a rebuild, not a restart. Changing it also
 * signs every existing console out on next load — the old keys are still in the
 * browser, and nothing reads them any more.
 *
 * The session COOKIE's name is not here. It is HttpOnly — this code cannot read
 * it by design — and the only thing that needs to agree on it is the control
 * plane, which takes it from AUTH_SESSION_COOKIE_NAME.
 */

const configured = (import.meta.env.VITE_STORAGE_PREFIX as string | undefined)?.trim()

/** The namespace every key below sits under. */
const PREFIX = configured && configured.length > 0 ? configured : "faas.admin"

export const STORAGE_KEYS = {
  /** The operator-configurable control-plane origin. */
  apiBase: `${PREFIX}.apiBase`,
  /** The bearer sent on every call, exchanged from the session or pasted. */
  token: `${PREFIX}.token`,
  /**
   * Written by an earlier version, which kept the expiry beside the token
   * instead of deriving it. Two keys meant they could disagree: a stale
   * timestamp from a previous token outlived it and expired the next one the
   * moment it was read, so a freshly pasted token worked until the first reload
   * and then vanished. Removed on sight rather than read.
   */
  legacyTokenExpiry: `${PREFIX}.tokenExpiresAt`,
  /** The tenant the console is acting for. */
  accountId: `${PREFIX}.accountId`,
  /** The resource group narrowing the listings. */
  resourceGroupId: `${PREFIX}.resourceGroupId`,
} as const
