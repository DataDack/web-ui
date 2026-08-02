import { useMemo } from "react"

import { cellMono, cellText, DataTable } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Cable } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CopyButton, EmptyState, Section, StatusBadge } from "@/components/console"

import { useRouters, useVPNConnections } from "../../vpc.hooks"
import type { VPCNetwork } from "../../vpc.types"

interface VPNRow {
  id: string
  name: string
  router_id: string
  remote_gateway: string
  status: string
}

export function VpnTab({ network }: Readonly<{ network: VPCNetwork }>) {
  const { t } = useTranslation()
  const { data: connections = [], isLoading } = useVPNConnections()
  const { data: routers = [] } = useRouters()

  const networkRouterIds = useMemo(
    () => new Set(routers.filter((r) => r.network_id === network.id).map((r) => r.id)),
    [routers, network.id],
  )
  const routerNames = useMemo(() => new Map(routers.map((r) => [r.id, r.name])), [routers])
  const networkConnections = connections.filter((c) => networkRouterIds.has(c.router_id))

  const columns = useMemo<ColumnDef<VPNRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("vpc.columns.name"),
        cell: ({ row }) => cellMono(row.original.name),
      },
      {
        id: "router",
        header: t("vpc.columns.router"),
        accessorFn: (row) => routerNames.get(row.router_id) ?? row.router_id,
        cell: ({ row }) =>
          cellText(routerNames.get(row.original.router_id) ?? row.original.router_id),
      },
      {
        id: "remoteGateway",
        accessorKey: "remote_gateway",
        header: t("vpc.columns.remoteGateway"),
        enableSorting: false,
        cell: ({ row }) => <CopyButton value={row.original.remote_gateway} />,
      },
      {
        id: "status",
        accessorKey: "status",
        header: t("vpc.columns.status"),
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} pulse={row.original.status === "connected"} />
        ),
      },
    ],
    [routerNames, t],
  )

  return (
    <Section variant="panel" title={t("vpc.tabs.vpn")} description={t("vpc.detail.vpnDescription")}>
      <DataTable
        data={networkConnections}
        columns={columns}
        loading={isLoading}
        empty={<EmptyState icon={Cable} title={t("vpc.detail.noVpn")} />}
      />
    </Section>
  )
}
