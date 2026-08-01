// Backend statuses: active | deleting | deleted (apps/resourcegroup/groups/entity).
export type RGStatus = "active" | "deleting" | "deleted" | "inactive"

export interface ResourceGroup {
  id: string
  name: string
  description: string
  status: RGStatus
  tags: Record<string, string>
  createdAt: string
  updatedAt: string
  // The account's fallback group (the one named "default"). The backend derives
  // this from the group name and sends it as `is_default`; we map it at the API
  // boundary. The UI uses it to badge the group and protect it from deletion.
  isDefault: boolean
  // Backend-omitted, UI-optional. The Go entity has no display name or member
  // resource count, so these are never populated by the API and the UI
  // rendering them is hidden/disabled.
  displayName?: string
  resourceCount?: number
}

// Create maps to dto.CreateGroupRequest { name, description, tags }.
export interface CreateResourceGroupPayload {
  name: string
  description?: string
  tags?: Record<string, string>
}

// Update maps to dto.UpdateGroupRequest { name, description, tags }.
export interface UpdateResourceGroupPayload {
  name?: string
  description?: string
  tags?: Record<string, string>
}

// A resource that belongs to a group, as returned by the fan-out endpoint
// GET /resource-group/groups/:id/resources. Mirrors the backend search.Hit:
// the console already knows how to render this shape (icon, status, route) from
// global search, so group members reuse the same vocabulary.
export interface GroupResource {
  // Stable row key: `${type}-${id}` (the raw id alone isn't unique across types).
  key: string
  // Backend resource id, used to build the deep-link route.
  resourceId: string
  name: string
  // Console resource type: vm | disk | load-balancer | vpc | … (drives icon + route).
  type: string
  // Owning domain (vm, vpc, resources), kept for the secondary label.
  service: string
  region?: string
  status?: string
  tags: Record<string, string>
  // Short descriptors, e.g. ["100 GB", "ssd"] for a disk.
  meta: string[]
  updatedAt?: string
  // Route to the resource's own detail page, or undefined when it has none.
  path?: string
}
