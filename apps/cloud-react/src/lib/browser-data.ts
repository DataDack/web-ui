// Full browser-storage wipe, used on logout: nothing about the session — or the
// user's console preferences — may outlive it. Clears localStorage,
// sessionStorage, all JS-visible cookies, and every IndexedDB database.
// Everything is best-effort: a locked/unavailable store must never block the
// sign-out redirect.

/** Expire one cookie across the path/domain combinations it could live under. */
function expireCookie(name: string): void {
  const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT"
  document.cookie = `${name}=; ${expire}; path=/`
  // Also hit the host and every parent domain (e.g. console.datadack.cloud,
  // datadack.cloud) with and without a leading dot — a cookie is only deleted
  // when the domain attribute matches the one it was set with.
  const parts = window.location.hostname.split(".")
  for (let i = 0; i < parts.length - 1; i++) {
    const domain = parts.slice(i).join(".")
    document.cookie = `${name}=; ${expire}; path=/; domain=${domain}`
    document.cookie = `${name}=; ${expire}; path=/; domain=.${domain}`
  }
}

/** Delete every JS-visible cookie. HttpOnly cookies (e.g. CDN/analytics ones
 *  set by proxies) are invisible to script and cannot be cleared from here. */
function clearCookies(): void {
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0]?.trim()
    if (name) expireCookie(name)
  }
}

/** Delete every IndexedDB database. `indexedDB.databases()` enumerates them in
 *  modern browsers; the app's known "dd" DB is always included as a fallback.
 *  A delete that reports "blocked" (a page connection is still open) is treated
 *  as done: it completes automatically when the logout redirect unloads the
 *  page and the connections close. */
async function deleteAllIndexedDBs(): Promise<void> {
  let names: string[] = ["dd"]
  try {
    const dbs = await indexedDB.databases()
    names = [...new Set([...names, ...dbs.map((d) => d.name).filter((n): n is string => !!n)])]
  } catch {
    // databases() unsupported — fall back to the known DB name.
  }
  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const req = indexedDB.deleteDatabase(name)
            req.onsuccess = () => {
              resolve()
            }
            req.onerror = () => {
              resolve()
            }
            req.onblocked = () => {
              resolve()
            }
          } catch {
            resolve()
          }
        }),
    ),
  )
}

/** Wipe localStorage, sessionStorage, cookies, and IndexedDB. */
export async function clearAllBrowserData(): Promise<void> {
  try {
    localStorage.clear()
  } catch {
    /* unavailable (private mode) */
  }
  try {
    sessionStorage.clear()
  } catch {
    /* unavailable */
  }
  try {
    clearCookies()
  } catch {
    /* unavailable */
  }
  await deleteAllIndexedDBs()
}
