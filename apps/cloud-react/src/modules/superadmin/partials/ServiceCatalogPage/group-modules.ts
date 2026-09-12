import { CONSOLE_SERVICES } from "@/components/console"

import type { CatalogModuleAdmin, CatalogServiceAdmin } from "../../superadmin.types"

/**
 * Sidebar grouping key → catalog service key.
 *
 * A module's `service_key` is CONSOLE_SERVICES[].key, NOT CatalogService.key:
 * the sidebar groups by navigation and the catalog by product, and the two
 * names disagree in exactly these three places by design. Documented in
 * `catalog.types.ts` (frontend) and `entity/module_entity.go` (backend); this
 * map is the only place the two vocabularies are joined.
 */
const CATALOG_KEY_BY_NAV_KEY: Record<string, string> = {
  networking: "vpc",
  "managed-apps": "managedapps",
  automations: "ai-workflows",
}

/** A catalog service and the sidebar modules that belong to it. */
export interface ServiceGroup {
  service: CatalogServiceAdmin
  modules: CatalogModuleAdmin[]
}

/**
 * Modules whose `service_key` matches no catalog service. Kept visible rather
 * than dropped: a sidebar group with no catalog row controls no Console home
 * tile, which is drift worth seeing, and silently hiding the rows would lose
 * the only place their state can be changed.
 */
export interface UnmatchedGroup {
  serviceKey: string
  /** The sidebar's own label key, when the frontend still declares the group. */
  labelKey?: string
  modules: CatalogModuleAdmin[]
}

const NAV_LABEL_BY_KEY = new Map(CONSOLE_SERVICES.map((s) => [s.key, s.labelKey]))

/** sort_order first, then key, so a group reads in sidebar order. */
function byOrderThenKey(a: CatalogModuleAdmin, b: CatalogModuleAdmin): number {
  return a.sort_order - b.sort_order || a.key.localeCompare(b.key)
}

/** The catalog service a module's sidebar key names, if any. */
function resolveService(
  navKey: string,
  byCatalogKey: ReadonlyMap<string, CatalogServiceAdmin>,
): CatalogServiceAdmin | undefined {
  // The documented alias first, then the key as given, then the key with dashes
  // stripped — the shape the "managed-apps"/"managedapps" disagreement takes.
  const candidates = [CATALOG_KEY_BY_NAV_KEY[navKey], navKey, navKey.replaceAll("-", "")]
  for (const key of candidates) {
    const hit = key ? byCatalogKey.get(key) : undefined
    if (hit) return hit
  }
  return undefined
}

/**
 * Joins the two catalogs into one list of service groups plus whatever did not
 * match. Services keep the order the API returned them in (their sort_order) —
 * that order is what drag-and-drop writes, so it must not be recomputed here.
 */
export function groupModules(
  services: readonly CatalogServiceAdmin[],
  modules: readonly CatalogModuleAdmin[],
): { groups: ServiceGroup[]; unmatched: UnmatchedGroup[] } {
  const byCatalogKey = new Map(services.map((s) => [s.key, s]))
  const collected = new Map<string, CatalogModuleAdmin[]>(services.map((s) => [s.id, []]))
  const loose = new Map<string, CatalogModuleAdmin[]>()

  for (const mod of modules) {
    const service = resolveService(mod.service_key, byCatalogKey)
    if (service) {
      collected.get(service.id)?.push(mod)
      continue
    }
    const bucket = loose.get(mod.service_key)
    if (bucket) bucket.push(mod)
    else loose.set(mod.service_key, [mod])
  }

  for (const rows of collected.values()) rows.sort(byOrderThenKey)
  for (const rows of loose.values()) rows.sort(byOrderThenKey)

  const groups = services.map((service) => ({
    service,
    modules: collected.get(service.id) ?? [],
  }))

  const unmatched = [...loose.entries()].map(([serviceKey, rows]) => ({
    serviceKey,
    labelKey: NAV_LABEL_BY_KEY.get(serviceKey),
    modules: rows,
  }))
  unmatched.sort((a, b) => a.serviceKey.localeCompare(b.serviceKey))

  return { groups, unmatched }
}

/** Case-insensitive match over everything a service row shows. */
export function serviceMatches(service: CatalogServiceAdmin, q: string): boolean {
  return (
    service.name.toLowerCase().includes(q) ||
    service.key.toLowerCase().includes(q) ||
    service.category.toLowerCase().includes(q) ||
    service.path.toLowerCase().includes(q)
  )
}

/** Case-insensitive match over everything a module row shows. */
export function moduleMatches(mod: CatalogModuleAdmin, q: string): boolean {
  return (
    mod.name.toLowerCase().includes(q) ||
    mod.key.toLowerCase().includes(q) ||
    mod.service_key.toLowerCase().includes(q) ||
    mod.path.toLowerCase().includes(q)
  )
}
