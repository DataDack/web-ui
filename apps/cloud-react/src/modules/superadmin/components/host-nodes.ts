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
