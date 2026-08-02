import { useMemo, useState } from "react"

import {
  Button,
  DataTable,
  copyColumn,
  nameColumn,
  statusColumn,
  textColumn,
  type DataTableColumnMeta,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Link2, Loader2, Unlink } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, Section } from "@/components/console"

import {
  useAttachIGW,
  useDetachIGW,
  useInternetGateways,
  useNATGateways,
  useRouters,
  useVPCSubnets,
} from "../../vpc.hooks"
import type { InternetGateway, NATGateway, Router, VPCNetwork } from "../../vpc.types"

/**
 * The gateway panels are three small read-mostly tables, so they use DataTable's
 * plain note for "nothing here" rather than the full icon-and-blurb empty state —
 * a panel this size reads better with one quiet line.
 */
function Note({ children }: Readonly<{ children: string }>) {
  return <span className="text-[13px] text-muted-foreground">{children}</span>
}

/* ── Routers ───────────────────────────────────────────────────────────── */

function RoutersSection({ network }: Readonly<{ network: VPCNetwork }>) {
  const { t } = useTranslation()
  const { data: routers = [], isLoading } = useRouters()
  const networkRouters = routers.filter((r) => r.network_id === network.id)

  const columns = useMemo<ColumnDef<Router>[]>(
    () => [
      nameColumn({ header: t("vpc.columns.name"), accessor: (r) => r.name }),
      textColumn({ id: "region", header: t("vpc.columns.region"), accessor: (r) => r.region }),
      statusColumn({
        header: t("vpc.columns.status"),
        accessor: (r) => r.status,
        pulse: (r) => r.status === "active",
      }),
    ],
    [t],
  )

  return (
    <Section
      variant="panel"
      title={t("vpc.detail.routers")}
      description={t("vpc.detail.routersDescription")}
    >
      <DataTable<Router>
        data={networkRouters}
        columns={columns}
        loading={isLoading}
        skeletonRows={2}
        getRowId={(router) => router.id}
        empty={<Note>{t("vpc.detail.noRouters")}</Note>}
      />
    </Section>
  )
}

/* ── Internet gateways ─────────────────────────────────────────────────── */

function InternetGatewaysSection({ network }: Readonly<{ network: VPCNetwork }>) {
  const { t } = useTranslation()
  const { data: gateways = [], isLoading } = useInternetGateways()
  const { mutate: attach, isPending: isAttaching } = useAttachIGW()
  const { mutate: detach, isPending: isDetaching } = useDetachIGW()
  const [toDetach, setToDetach] = useState<InternetGateway | null>(null)

  // Show gateways attached to this network plus detached ones available to attach.
  const visible = gateways.filter((g) => g.network_id === network.id || g.status === "detached")

  const columns = useMemo<ColumnDef<InternetGateway>[]>(
    () => [
      nameColumn({ header: t("vpc.columns.name"), accessor: (g) => g.name }),
      statusColumn({ header: t("vpc.columns.status"), accessor: (g) => g.status }),
      {
        id: "attach",
        header: "",
        // The attach/detach buttons live here.
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const gateway = row.original
          return (
            <div className="text-right">
              {gateway.status === "detached" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5"
                  disabled={isAttaching}
                  onClick={() => {
                    attach({ id: gateway.id, networkId: network.id })
                  }}
                >
                  {isAttaching ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Link2 className="size-3" />
                  )}
                  {t("vpc.actions.attach")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-muted-foreground hover:text-destructive"
                  disabled={isDetaching}
                  onClick={() => {
                    setToDetach(gateway)
                  }}
                >
                  <Unlink className="size-3" />
                  {t("vpc.actions.detach")}
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [attach, isAttaching, isDetaching, network.id, t],
  )

  return (
    <Section
      variant="panel"
      title={t("vpc.detail.internetGateways")}
      description={t("vpc.detail.internetGatewaysDescription")}
    >
      <DataTable<InternetGateway>
        data={visible}
        columns={columns}
        loading={isLoading}
        skeletonRows={2}
        getRowId={(gateway) => gateway.id}
        empty={<Note>{t("vpc.detail.noInternetGateways")}</Note>}
      />

      <ConfirmDialog
        open={toDetach !== null}
        onOpenChange={(open) => {
          if (!open) setToDetach(null)
        }}
        title={t("vpc.detachConfirm.title")}
        description={t("vpc.detachConfirm.description", {
          name: toDetach?.name ?? "",
          network: network.name,
        })}
        confirmLabel={t("vpc.actions.detach")}
        loading={isDetaching}
        onConfirm={() => {
          if (toDetach) {
            detach(toDetach.id, {
              onSuccess: () => {
                setToDetach(null)
              },
            })
          }
        }}
      />
    </Section>
  )
}

/* ── NAT gateways ──────────────────────────────────────────────────────── */

function NatGatewaysSection({ network }: Readonly<{ network: VPCNetwork }>) {
  const { t } = useTranslation()
  const { data: natGateways = [], isLoading } = useNATGateways()
  const { data: subnets = [] } = useVPCSubnets(network.id)

  const networkNats = natGateways.filter((n) => n.network_id === network.id)
  const subnetNames = useMemo(() => new Map(subnets.map((s) => [s.id, s.name])), [subnets])

  const columns = useMemo<ColumnDef<NATGateway>[]>(
    () => [
      nameColumn({ header: t("vpc.columns.name"), accessor: (n) => n.name }),
      textColumn({
        id: "subnet",
        header: t("vpc.columns.subnet"),
        // Falls back to the id: a NAT on a subnet this view has not loaded still
        // has to identify it somehow.
        accessor: (n) => subnetNames.get(n.subnet_id) ?? n.subnet_id,
        mono: true,
        muted: true,
      }),
      copyColumn({
        id: "publicIp",
        header: t("vpc.columns.publicIp"),
        accessor: (n) => n.public_ip,
        copiedLabel: t("console.copy.copied"),
      }),
      statusColumn({
        header: t("vpc.columns.status"),
        accessor: (n) => n.status,
        pulse: (n) => n.status === "active",
      }),
    ],
    [subnetNames, t],
  )

  return (
    <Section
      variant="panel"
      title={t("vpc.detail.natGateways")}
      description={t("vpc.detail.natGatewaysDescription")}
    >
      <DataTable<NATGateway>
        data={networkNats}
        columns={columns}
        loading={isLoading}
        skeletonRows={2}
        getRowId={(nat) => nat.id}
        empty={<Note>{t("vpc.detail.noNatGateways")}</Note>}
      />
    </Section>
  )
}

/* ── Tab ───────────────────────────────────────────────────────────────── */

export function GatewaysTab({ network }: Readonly<{ network: VPCNetwork }>) {
  return (
    <div className="space-y-5">
      <RoutersSection network={network} />
      <InternetGatewaysSection network={network} />
      <NatGatewaysSection network={network} />
    </div>
  )
}
