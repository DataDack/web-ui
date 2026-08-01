import { useMemo } from "react"

import { Activity, HardDrive, Layers, LayoutDashboard, Plus, RefreshCw, Server } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PageHeader, Section, StatGrid, type StatCardProps } from "@/components/console"
import { Button } from "@datadack/common-ui"
import { ASG_ROUTES } from "@/modules/autoscaling/autoscaling.constants"
import { DISKS_ROUTES } from "@/modules/disks/disks.constants"
import { LB_ROUTES } from "@/modules/load-balancers/load-balancers.constants"
import { useScreen } from "@/services/api/screen"

import { VMS_ROUTES } from "../vms.constants"
import { useComputeStatus } from "../vms.hooks"
import { AttentionQueue, type AttentionItem } from "./overview/AttentionQueue"
import { ResourceMixList, type ResourceMixItem } from "./overview/ResourceMixList"
import { ZoneCapacityStrip } from "./overview/ZoneCapacityStrip"

export function ComputeOverviewPage() {
  useScreen("vms.compute-overview")
  const { t } = useTranslation()
  const navigate = useNavigate()

  // One account-scoped call powers the whole page (counts + per-zone capacity),
  // instead of fetching the instance/disk/LB/ASG lists just to count them.
  const statusQuery = useComputeStatus()
  const status = statusQuery.data
  const loading = statusQuery.isLoading

  const attention = status?.instances.attention ?? 0

  const stats: StatCardProps[] = [
    {
      label: t("compute.overview.stats.instances"),
      value: status?.instances.total ?? 0,
      icon: Server,
      loading,
    },
    {
      label: t("compute.overview.stats.running"),
      value: status?.instances.running ?? 0,
      color: "success",
      loading,
    },
    {
      label: t("compute.overview.stats.attention"),
      value: attention,
      color: attention > 0 ? "warning" : "default",
      loading,
    },
    {
      label: t("compute.overview.stats.vcpu"),
      value: status?.instances.vcpu ?? 0,
      loading,
    },
  ]

  const resourceMix: ResourceMixItem[] = [
    {
      icon: Server,
      label: t("console.nav.items.vms"),
      count: status?.instances.total ?? 0,
      to: VMS_ROUTES.ROOT,
    },
    {
      icon: HardDrive,
      label: t("console.nav.items.disks"),
      count: status?.disks.total ?? 0,
      to: DISKS_ROUTES.ROOT,
    },
    {
      icon: Layers,
      label: t("console.nav.items.loadBalancers"),
      count: status?.load_balancers.total ?? 0,
      to: LB_ROUTES.ROOT,
    },
    {
      icon: Activity,
      label: t("console.nav.items.autoscaling"),
      count: status?.autoscaling.total ?? 0,
      to: ASG_ROUTES.ROOT,
    },
  ]

  // The status endpoint returns counts, so the attention queue surfaces one
  // summary row per non-nominal bucket (linking to that resource's list).
  const attentionItems = useMemo<AttentionItem[]>(() => {
    if (!status) return []
    const items: AttentionItem[] = []
    if (status.instances.attention > 0)
      items.push({
        id: "instances",
        name: t("compute.overview.attention.summary.instances", {
          count: status.instances.attention,
        }),
        kind: t("compute.overview.kinds.vm"),
        status: "attention",
        to: VMS_ROUTES.ROOT,
      })
    if (status.disks.unattached > 0)
      items.push({
        id: "disks",
        name: t("compute.overview.attention.summary.disks", {
          count: status.disks.unattached,
        }),
        kind: t("compute.overview.kinds.disk"),
        status: "unattached",
        to: DISKS_ROUTES.ROOT,
      })
    if (status.load_balancers.failed > 0)
      items.push({
        id: "loadBalancers",
        name: t("compute.overview.attention.summary.loadBalancers", {
          count: status.load_balancers.failed,
        }),
        kind: t("compute.overview.kinds.loadBalancer"),
        status: "failed",
        to: LB_ROUTES.ROOT,
      })
    if (status.autoscaling.suspended > 0)
      items.push({
        id: "autoscaling",
        name: t("compute.overview.attention.summary.autoscaling", {
          count: status.autoscaling.suspended,
        }),
        kind: t("compute.overview.kinds.autoscaling"),
        status: "suspended",
        to: ASG_ROUTES.ROOT,
      })
    return items
  }, [status, t])

  return (
    <div className="mx-auto flex max-w-360 flex-col gap-6">
      <PageHeader
        icon={LayoutDashboard}
        breadcrumbs={[
          { label: t("console.nav.groups.compute") },
          { label: t("compute.overview.title") },
        ]}
        title={t("compute.overview.title")}
        description={t("compute.overview.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void statusQuery.refetch()}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={statusQuery.isFetching ? "animate-spin" : ""} />
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                void navigate(VMS_ROUTES.CREATE)
              }}
            >
              <Plus /> {t("vms.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      <Section
        variant="panel"
        title={t("compute.overview.zones.title")}
        description={t("compute.overview.zones.subtitle")}
      >
        <ZoneCapacityStrip zones={status?.zones ?? []} isLoading={loading} />
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <Section
          variant="panel"
          title={t("compute.overview.mix.title")}
          description={t("compute.overview.mix.subtitle")}
        >
          <ResourceMixList items={resourceMix} isLoading={loading} />
        </Section>

        <Section
          variant="panel"
          title={t("compute.overview.attention.title")}
          description={t("compute.overview.attention.subtitle")}
        >
          <AttentionQueue items={attentionItems} isLoading={loading} />
        </Section>
      </div>
    </div>
  )
}
