import { useMemo } from "react"

import { useCatalogModules } from "@/modules/services/catalog.hooks"

import {
  type NavModuleState,
  type NavStateMap,
  navItemStateForPath,
  navStateKey,
  type SidebarNavItem,
} from "./sidebar-nav"

/**
 * Admin-controlled nav-item states, as a lookup the sidebar can overlay onto its
 * static definition.
 *
 * An empty map is the "no opinion" case and every consumer treats it as such —
 * it means the catalog has not loaded, or is unreachable, and the sidebar should
 * render exactly what `sidebar-nav.ts` declares. Navigation is the one thing
 * that must not disappear when an API call fails.
 */
export function useNavModuleStates(): NavStateMap {
  const { data } = useCatalogModules()
  return useMemo(() => {
    const map = new Map<string, NavModuleState>()
    for (const m of data ?? []) map.set(navStateKey(m.service_key, m.key), m.state)
    return map
  }, [data])
}

/**
 * Page-level counterpart of the sidebar badge: whether the admin has closed the
 * nav item that owns `pathname`.
 *
 * `pending` mirrors `useServiceGate` — true only while the module list is in
 * flight, so the shell shows a skeleton instead of flashing a page it is about
 * to replace. A failed fetch resolves to "open": an unreachable catalog must not
 * close pages.
 */
export function useNavModuleGate(
  pathname: string,
  search: string,
): { pending: boolean; closed?: { item: SidebarNavItem; state: "coming_soon" | "disabled" } } {
  const { isLoading } = useCatalogModules()
  const states = useNavModuleStates()
  if (isLoading) return { pending: true }
  const match = navItemStateForPath(pathname, states, search)
  if (!match || match.state === "enabled") return { pending: false }
  return { pending: false, closed: { item: match.item, state: match.state } }
}
