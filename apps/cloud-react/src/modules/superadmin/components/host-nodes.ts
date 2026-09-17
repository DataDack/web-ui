import { useMemo } from "react"

import { useAdminPVENodes } from "../superadmin.hooks"
import type { PVENode } from "../superadmin.types"

/** Nodes in a cluster, optionally limited to one availability zone. */
export function useHostNodes(availabilityZoneId?: string | null): PVENode[] {
  const { data: nodes = [] } = useAdminPVENodes()
  return useMemo(
    () =>
      nodes
        .filter((n) => !!n.cluster_id)
        .filter((n) => !availabilityZoneId || n.availability_zone_id === availabilityZoneId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [nodes, availabilityZoneId],
  )
}

/** The node's display name, or its id when the node is no longer registered. */
export function useNodeName(): (id?: string | null) => string {
  const { data: nodes = [] } = useAdminPVENodes()
  return useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n.name]))
    return (id?: string | null) => (id ? (byId.get(id) ?? id.slice(0, 8)) : "")
  }, [nodes])
}

/**
 * The cluster a node belongs to.
 *
 * Rows that carry a placement (an IP pool, an allocation) record both the node
 * and its cluster, and the cluster half is the one that goes missing — it was
 * added later, and nothing backfills a row placed before that. Resolving it
 * through the node keeps such a row visible in its cluster rather than nowhere.
 */
export function useNodeClusterId(): (id?: string | null) => string | null {
  const { data: nodes = [] } = useAdminPVENodes()
  return useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n.cluster_id ?? null]))
    return (id?: string | null) => (id ? (byId.get(id) ?? null) : null)
  }, [nodes])
}
