import { Badge, Button, Card, EmptyState, Skeleton, TONE_CLASSES, cn } from "@datadack/common-ui"
import { AlertTriangle, CheckCircle2, Network, Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { useApplyClusterNetwork, useEffectiveNetwork } from "../../superadmin.hooks"

/**
 * This cluster's network, as it will actually be applied.
 *
 * Neither stored document says this on its own: the common cluster
 * configuration is shared by every site, and this cluster's own file holds only
 * what is specific to it. What lands on the hardware is the merge, so the merge
 * is what is shown — and it is what "Apply" writes.
 *
 * Editing the shared half is deliberately elsewhere: it reaches every cluster at
 * once, and putting that button inside one cluster's page invites someone to
 * change every site while thinking they are changing this one.
 */
export function ClusterNetworkingTab({
  availabilityZones,
}: Readonly<{ availabilityZones: string[] }>) {
  const { t } = useTranslation()

  if (availabilityZones.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title={t("superAdmin.cluster.netNoZone")}
        description={t("superAdmin.cluster.netNoZoneBody")}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* One per zone. A cluster spans racks, so its nodes can sit in more than
          one availability zone, and each has its own platform network. */}
      {availabilityZones.map((az) => (
        <ZoneNetwork key={az} az={az} />
      ))}
    </div>
  )
}

function ZoneNetwork({ az }: Readonly<{ az: string }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useEffectiveNetwork(az)
  const apply = useApplyClusterNetwork()

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (isError || !data) {
    return (
      <EmptyState
        icon={Network}
        title={t("superAdmin.cluster.netNotConfigured", { az })}
        description={t("superAdmin.cluster.netNotConfiguredBody")}
        action={{
          label: t("superAdmin.cluster.netOpenDefaults"),
          onClick: () => {
            void navigate("/admin/networking")
          },
        }}
      />
    )
  }

  const zone = data.platform_zone
  const fabric = data.fabric

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{az}</h2>
          <p className="text-sm text-muted-foreground">
            {t("superAdmin.cluster.netRevisions", {
              defaults: data.defaults_revision,
              cluster: data.revision,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/networking">{t("superAdmin.cluster.netEditCommon")}</Link>
          </Button>
          <Button
            size="sm"
            disabled={!data.enabled || apply.isPending}
            onClick={() => {
              apply.mutate(az)
            }}
          >
            <Play className={cn("size-4", apply.isPending && "animate-pulse")} />
            {t("superAdmin.networking.apply")}
          </Button>
        </div>
      </div>

      {/* Nothing can be applied to a cluster whose members are unknown, and the
          platform cannot guess them — a node's name comes from the cluster. */}
      {!data.nodes_discovered ? (
        <Card className="border-status-warning/25 bg-status-warning-bg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-status-warning" />
            <div>
              <p className="font-medium">{t("superAdmin.cluster.netNoNodes")}</p>
              <p className="text-sm text-muted-foreground">
                {t("superAdmin.cluster.netNoNodesBody")}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label={t("superAdmin.networking.zone")} value={zone.zone} />
        <Fact label="L3 VNI" value={String(zone.l3_vni)} />
        <Fact
          label={t("superAdmin.networking.underlay")}
          value={`${fabric.underlay_interface} · ${fabric.underlay_cidr}`}
          hint={
            fabric.underlay_vlan === 0
              ? t("superAdmin.networking.untagged")
              : `VLAN ${fabric.underlay_vlan}`
          }
        />
        <Fact
          label="MTU"
          value={`${fabric.underlay_mtu} → ${fabric.overlay_mtu}`}
          hint={t("superAdmin.networking.mtuHint")}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <h3 className="font-medium">{t("superAdmin.networking.vnets")}</h3>
          <p className="text-sm text-muted-foreground">{t("superAdmin.networking.vnetsHint")}</p>
        </div>
        <ul className="divide-y">
          {zone.vnets.map((v) => (
            <li key={v.vnet} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-28 font-medium">{v.name}</span>
              <span className="font-mono text-sm text-muted-foreground">{v.vnet}</span>
              <span className="font-mono text-sm">{v.cidr}</span>
              <span className="font-mono text-sm text-muted-foreground">gw {v.gateway}</span>
              <span className="ml-auto">
                {v.tenant_reachable && v.tenant_reachable !== "never" ? (
                  <Badge variant="outline" className={TONE_CLASSES.warning}>{v.tenant_reachable}</Badge>
                ) : (
                  <Badge variant="secondary">{t("superAdmin.networking.never")}</Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {data.evpn.redundancy && data.evpn.redundancy.status !== "ok" ? (
        <Card className="border-status-warning/25 bg-status-warning-bg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-status-warning" />
            <div>
              <p className="font-medium">
                {t("superAdmin.networking.redundancy", { status: data.evpn.redundancy.status })}
              </p>
              {data.evpn.redundancy.reason ? (
                <p className="text-sm text-muted-foreground">{data.evpn.redundancy.reason}</p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex items-center gap-2 text-sm text-status-success">
          <CheckCircle2 className="size-4" />
          {t("superAdmin.cluster.netRedundancyOk")}
        </div>
      )}
    </div>
  )
}

function Fact({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <Card className="p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <p className="mt-2 font-mono text-base font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </Card>
  )
}
