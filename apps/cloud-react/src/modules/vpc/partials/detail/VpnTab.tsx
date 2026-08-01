import { useMemo } from "react"

import { Cable } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CopyButton, EmptyState, Section, staggerDelay, StatusBadge } from "@/components/console"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Skeleton } from "@datadack/common-ui"

import { useRouters, useVPNConnections } from "../../vpc.hooks"
import type { VPCNetwork } from "../../vpc.types"

const HEAD_CLASS = "px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <Section variant="panel" title={t("vpc.tabs.vpn")} description={t("vpc.detail.vpnDescription")}>
      {networkConnections.length === 0 ? (
        <EmptyState icon={Cable} title={t("vpc.detail.noVpn")} />
      ) : (
        <div className="glass-1 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={HEAD_CLASS}>{t("vpc.columns.name")}</TableHead>
                <TableHead className={HEAD_CLASS}>{t("vpc.columns.router")}</TableHead>
                <TableHead className={HEAD_CLASS}>{t("vpc.columns.remoteGateway")}</TableHead>
                <TableHead className={HEAD_CLASS}>{t("vpc.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {networkConnections.map((connection, index) => (
                <TableRow
                  key={connection.id}
                  className="animate-content-enter"
                  style={staggerDelay(index)}
                >
                  <TableCell className="px-3 font-mono text-[13px] font-medium">
                    {connection.name}
                  </TableCell>
                  <TableCell className="px-3 font-mono text-[12px] text-muted-foreground">
                    {routerNames.get(connection.router_id) ?? connection.router_id}
                  </TableCell>
                  <TableCell className="px-3">
                    <CopyButton value={connection.remote_gateway} />
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusBadge
                      status={connection.status}
                      pulse={connection.status === "connected"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  )
}
