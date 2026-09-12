import { useMemo } from "react"

import { useCatalogModules } from "@/modules/services/catalog.hooks"

import { type NavModuleState, type NavStateMap, navStateKey } from "./sidebar-nav"

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
