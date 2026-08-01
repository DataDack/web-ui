import { parseTags, type TagsInput } from "@/lib/tags"
import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
  CreateResourceGroupPayload,
  GroupResource,
  ResourceGroup,
  RGStatus,
  UpdateResourceGroupPayload,
} from "./resource-groups.types"

/* ── Real backend wiring ───────────────────────────────────────────────────
 * App: resource-group (hyphenated), module: groups → base /resource-group/groups
 *   GET    /            list
 *   POST   /            create  (dto.CreateGroupRequest)
 *   GET    /:id         get
 *   PUT    /:id         update  (dto.UpdateGroupRequest)
 *   DELETE /:id         delete
 * Entity (snake_case): id, name, description, status, tags (JSON
 * string), created_at, updated_at, is_default. The backend derives is_default
 * from the group name and the FE maps it below. There is no displayName or
 * resourceCount on the backend, so those stay undefined and the UI hides them.
 */

const BASE = "/resource-group/groups"

/** Raw shape returned by the Go ResourceGroup entity. The id is a uint primary
 * key, so it arrives as a JSON number — we normalise it to a string at the
 * boundary (see toResourceGroup) so the rest of the app compares/selects by the
 * same string ids used everywhere else. */
interface RGEntity {
  id: string | number
  name: string
  description?: string
  status?: string
  tags?: Exclude<TagsInput, undefined>
  created_at?: string
  updated_at?: string
  is_default?: boolean
}

function serializeTags(tags?: Record<string, string>): string {
  return JSON.stringify(tags ?? {})
}

function toResourceGroup(e: RGEntity): ResourceGroup {
  return {
    id: String(e.id),
    name: e.name,
    description: e.description ?? "",
    status: e.status ? (e.status as RGStatus) : "active",
    tags: parseTags(e.tags),
    createdAt: e.created_at ?? "",
    updatedAt: e.updated_at ?? "",
    isDefault: e.is_default ?? false,
    // displayName / resourceCount: not provided by backend.
  }
}

/* ── Group members (fan-out endpoint) ──────────────────────────────────────
 * GET /resource-group/groups/:id/resources → search.Hit[]. Every domain (compute,
 * vpc, the central registry) contributes the resources it owns in this group, so
 * the payload is the same shape as global search.
 */

/** Raw search.Hit returned by the Go fan-out (snake_case updated_at). */
interface ResourceHit {
  id: string | number
  name: string
  service: string
  type: string
  region?: string
  status?: string
  tags?: string
  meta?: string[]
  updated_at?: string
}

// Deep-link route per console resource type. Types without their own detail page
// (or unknown registry types) get no link and render as a plain row.
const RESOURCE_PATH_BY_TYPE: Record<string, ((id: string) => string) | undefined> = {
  vm: (id) => `/compute/instances/${id}`,
  disk: () => "/compute/disks",
  "load-balancer": (id) => `/compute/load-balancers/${id}`,
  vpc: (id) => `/networking/${id}`,
  subnet: () => "/networking/subnets",
  "static-ip": () => "/networking/static-ips",
  database: (id) => `/databases/${id}`,
}

function toGroupResource(hit: ResourceHit): GroupResource {
  const id = String(hit.id)
  const pathFor = RESOURCE_PATH_BY_TYPE[hit.type]
  return {
    key: `${hit.type}-${id}`,
    resourceId: id,
    name: hit.name,
    type: hit.type,
    service: hit.service,
    region: hit.region,
    status: hit.status,
    tags: parseTags(hit.tags),
    meta: (hit.meta ?? []).filter(Boolean),
    updatedAt: hit.updated_at,
    path: pathFor ? pathFor(id) : undefined,
  }
}

/* ── API surface (function names/signatures preserved) ─────────────────── */

export const resourceGroupsApi = {
  list: async (): Promise<ResourceGroup[]> => {
    const items = await apiGet<RGEntity[]>(BASE + LIST_QUERY)
    return items.map(toResourceGroup)
  },

  get: async (id: string): Promise<ResourceGroup> => {
    const item = await apiGet<RGEntity>(`${BASE}/${id}`)
    return toResourceGroup(item)
  },

  listResources: async (id: string): Promise<GroupResource[]> => {
    const hits = await apiGet<ResourceHit[]>(`${BASE}/${id}/resources`)
    return hits.map(toGroupResource)
  },

  create: async (payload: CreateResourceGroupPayload): Promise<ResourceGroup> => {
    const item = await apiPost<RGEntity>(BASE, {
      name: payload.name,
      description: payload.description ?? "",
      tags: serializeTags(payload.tags),
    })
    return toResourceGroup(item)
  },

  update: async (id: string, payload: UpdateResourceGroupPayload): Promise<ResourceGroup> => {
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name
    if (payload.description !== undefined) body.description = payload.description
    if (payload.tags !== undefined) body.tags = serializeTags(payload.tags)
    const item = await apiPut<RGEntity>(`${BASE}/${id}`, body)
    return toResourceGroup(item)
  },

  delete: async (id: string): Promise<void> => {
    await apiDelete(`${BASE}/${id}`)
  },
}
