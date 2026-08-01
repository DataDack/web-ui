import { useSyncExternalStore } from "react"

// Active-account scope (which account/organization the console is acting in).
// The scope is CLIENT-HELD: kept in memory for the page's life, persisted to
// IndexedDB so it survives a reload, and sent to the backend as the X-Account-Id
// header. IndexedDB is the durable store; memory is the working copy. On boot we
// rehydrate from IndexedDB, then VALIDATE the stored account against the user's
// real memberships (see useActiveAccount) — a stale id (membership revoked /
// account transferred) is dropped. The backend re-authorizes every request, so
// the header is only a selector; validation keeps the UI honest.

export interface ActiveScope {
  accountId: string | null
  organizationId: string | null
}

const EMPTY: ActiveScope = { accountId: null, organizationId: null }

// ── IndexedDB key-value (single tiny store) ─────────────────────────────────
const DB_NAME = "dd"
const STORE = "kv"
const SCOPE_KEY = "active-scope"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => {
      resolve(req.result)
    }
    req.onerror = () => {
      reject(req.error ?? new Error("IndexedDB request failed"))
    }
  })
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        resolve((req.result as T) ?? null)
      }
      req.onerror = () => {
        reject(req.error ?? new Error("IndexedDB request failed"))
      }
    })
  } catch {
    return null // IndexedDB unavailable (private mode, etc.) — degrade to memory-only
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => {
        resolve()
      }
      tx.onerror = () => {
        reject(tx.error ?? new Error("IndexedDB transaction failed"))
      }
    })
  } catch {
    // best-effort persistence
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => {
        resolve()
      }
      tx.onerror = () => {
        reject(tx.error ?? new Error("IndexedDB transaction failed"))
      }
    })
  } catch {
    // best-effort
  }
}

// ── In-memory store with subscription (for useSyncExternalStore) ────────────
let scope: ActiveScope = EMPTY
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const activeScope = {
  get: (): ActiveScope => scope,
  getAccountId: (): string | null => scope.accountId,
  subscribe: (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  /** Set the scope (memory + IndexedDB). Pass nulls to clear. */
  set: (next: ActiveScope) => {
    scope = next
    emit()
    void idbSet(SCOPE_KEY, next)
  },
  /** Clear the scope (home-org default — no X-Account-Id sent). */
  clear: () => {
    scope = EMPTY
    emit()
    void idbDel(SCOPE_KEY)
  },
  /** Rehydrate the in-memory scope from IndexedDB. Call once before render. */
  hydrate: async (): Promise<void> => {
    const saved = await idbGet<ActiveScope>(SCOPE_KEY)
    if (saved && (saved.accountId || saved.organizationId)) {
      scope = {
        accountId: saved.accountId ?? null,
        organizationId: saved.organizationId ?? null,
      }
      emit()
    }
  },
}

/** Reactive read of the active scope. */
export function useActiveScope(): ActiveScope {
  return useSyncExternalStore(activeScope.subscribe, activeScope.get)
}
