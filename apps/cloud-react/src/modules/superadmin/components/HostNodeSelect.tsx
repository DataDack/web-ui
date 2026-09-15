import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datadack/common-ui"

import { useHostNodes } from "./host-nodes"

/**
 * Picks the node whose uplink carries an IP block. Nodes in one cluster do not
 * necessarily share an upstream, so a block is registered against one node and
 * only guests on that node get its addresses. Only nodes that belong to a
 * cluster are offered: the backend needs both ids, and derives nothing.
 */
export function HostNodeSelect({
  value,
  onChange,
  availabilityZoneId,
  placeholder = "Select the node that carries this block",
}: Readonly<{
  value: string
  onChange: (nodeId: string) => void
  availabilityZoneId?: string | null
  placeholder?: string
}>) {
  const nodes = useHostNodes(availabilityZoneId)
  return (
    <Select value={value === "" ? undefined : value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {nodes.map((node) => (
          <SelectItem key={node.id} value={node.id}>
            {node.name}
            {node.status === "online" ? "" : ` (${node.status})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
