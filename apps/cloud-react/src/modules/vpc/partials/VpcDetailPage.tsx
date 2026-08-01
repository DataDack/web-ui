import { useState } from "react"

import { Badge, Skeleton } from "@DataDack/common-ui"
import {
  GitBranch,
  Globe,
  Info,
  Lock,
  MapPin,
  Network,
  Router as RouterIcon,
  Server,
  Trash2,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { ConfirmDialog, DetailPage, EmptyState, Section, TagList } from "@/components/console"
import {
  getStatusConfig,
  TONE_CLASSES,
  TONE_DOT_CLASSES,
  type StatusTone,
} from "@/components/console/status-config"
import { Button } from "@/components/ui/button"
import { parseTags } from "@/lib/tags"
import { useAvailabilityZoneMap } from "@/modules/catalog/catalog.hooks"
import { useScreen } from "@/services/api/screen"

import { VPC_ROUTES } from "../vpc.constants"
import {
  useDeleteVPC,
  useInternetGateways,
  useNetworkInterfaces,
  useRegions,
  useRouters,
  useVPC,
  useVPCSubnets,
} from "../vpc.hooks"
import type { InternetGateway, Subnet, VPCNetwork, VPCNetworkStatus } from "../vpc.types"
import { SubnetsTab } from "./detail/SubnetsTab"

export function VpcDetailPage() {
  useScreen("vpc.vpc-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: network, isLoading } = useVPC(id)
  const { mutate: deleteVPC, isPending: isDeleting } = useDeleteVPC()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading || !network) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <DetailPage
        backTo={VPC_ROUTES.ROOT}
        backLabel={t("vpc.title")}
        icon={Network}
        title={network.name}
        status={network.status}
        id={`VPC-${network.tenant_serial}`}
        actions={
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="size-3.5" />
            {t("vpc.actions.delete")}
          </Button>
        }
        tabs={[
          {
            value: "overview",
            label: t("vpc.tabs.overview"),
            icon: Info,
            content: <OverviewTab network={network} />,
          },
          {
            value: "subnets",
            label: t("vpc.tabs.subnets"),
            icon: GitBranch,
            content: <SubnetsTab network={network} />,
          },
        ]}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("vpc.deleteConfirm.title")}
        description={t("vpc.deleteConfirm.description", { name: network.name })}
        confirmLabel={t("vpc.actions.delete")}
        confirmText={network.name}
        loading={isDeleting}
        onConfirm={() => {
          deleteVPC(network.id, {
            onSuccess: () => void navigate(VPC_ROUTES.ROOT),
          })
        }}
      />
    </>
  )
}

/* ── Overview ──────────────────────────────────────────────────────────── */

/**
 * Coerce a FE id that the backend may serialize as a JSON number to a string for
 * safe comparison (memory: "RG numeric id coercion"). Typed as string|number so
 * the conversion isn't flagged as redundant.
 */
function idStr(value: string | number): string {
  return String(value)
}

/** Map IGW lifecycle to a status string getStatusConfig understands. */
function normalizeIgw(status: string): string {
  // attaching → in-flight (info); attached→success, detached→neutral, detaching→warning
  return status === "attaching" ? "provisioning" : status
}

function OverviewTab({ network }: Readonly<{ network: VPCNetwork }>) {
  const { t } = useTranslation()

  const { data: subnets = [], isLoading: subnetsLoading } = useVPCSubnets(network.id)
  const { data: igws = [], isLoading: igwLoading } = useInternetGateways()
  const { data: nics = [], isLoading: nicLoading } = useNetworkInterfaces()
  const { data: routers = [] } = useRouters()
  const { data: regions = [] } = useRegions()
  const azMap = useAvailabilityZoneMap()

  // ── Internet gateway (filter the tenant-wide list to this VPC) ──
  const igwForVpc = igws.find((g) => g.network_id === network.id)
  const igwTone: StatusTone = igwForVpc
    ? getStatusConfig(normalizeIgw(igwForVpc.status)).tone
    : "neutral"

  // ── Subnets grouped ──
  const publicSubnets = subnets.filter((s) => s.is_public)
  const privateSubnets = subnets.filter((s) => !s.is_public)

  // ── Connected instances (NIC with matching subnet_id and a non-empty instance_id) ──
  // FE ids are String()-coerced but the backend can serialize uint ids as JSON
  // numbers (memory: "RG numeric id coercion"), so coerce the un-coerced side.
  const subnetIds = new Set(subnets.map((s) => s.id))
  const instanceCountForSubnet = (subnetId: string) =>
    nics.filter((n) => idStr(n.subnet_id) === subnetId && n.instance_id !== "").length
  const totalInstances = nics.filter(
    (n) => subnetIds.has(idStr(n.subnet_id)) && n.instance_id !== "",
  ).length

  // ── Router → Routing Type ──
  const vpcRouters = routers.filter((r) => idStr(r.network_id) === network.id)
  const routerActive = vpcRouters.some((r) => r.status === "active")
  let routingLabel = t("vpc.detail.routingNone")
  if (vpcRouters.length > 0) {
    routingLabel = routerActive
      ? t("vpc.detail.routingActive", { count: vpcRouters.length })
      : t("vpc.detail.routingPending")
  }

  // ── Region name (catalog, NOT i18n) ──
  const regionName = regions.find((z) => z.code === network.region)?.name

  // ── AZ name per subnet ──
  const azName = (s: Subnet) =>
    s.availability_zone_id ? azMap.get(s.availability_zone_id)?.name : undefined

  const diagramLoading = subnetsLoading || igwLoading || nicLoading

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 space-y-5">
        <NetworkDiagram
          loading={diagramLoading}
          status={network.status}
          cidr={network.cidr}
          igw={igwForVpc}
          igwTone={igwTone}
          publicSubnets={publicSubnets}
          privateSubnets={privateSubnets}
          azName={azName}
          instanceCount={instanceCountForSubnet}
          totalInstances={totalInstances}
        />
      </div>

      <div className="space-y-5">
        <Section variant="panel" title={t("vpc.detail.configuration")}>
          <div className="flex flex-col gap-5 mt-2">
            <div className="flex flex-col gap-1.5 pb-4 border-b border-border-glass">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Region & Zone
              </span>
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-foreground/70" />
                <span className="text-[13px] font-medium">
                  {regionName ? (
                    <>
                      {regionName}{" "}
                      <span className="font-mono text-muted-foreground">({network.region})</span>
                    </>
                  ) : (
                    <span className="font-mono">{network.region}</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pb-4 border-b border-border-glass">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Routing
              </span>
              <div className="flex items-center gap-2">
                <RouterIcon
                  className={
                    routerActive ? "size-4 text-status-info" : "size-4 text-muted-foreground"
                  }
                />
                <span className="text-[13px] font-medium">{routingLabel}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pb-4 border-b border-border-glass">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Default Network
              </span>
              {network.is_default ? (
                <Badge
                  variant="outline"
                  className="w-fit font-mono text-[11px] text-status-info bg-status-info-bg border-status-info/25"
                >
                  {t("vpc.badges.default")}
                </Badge>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  {t("vpc.detail.notDefault")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Created
                </span>
                <span className="text-[12px] font-mono text-muted-foreground">
                  {new Date(network.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Updated
                </span>
                <span className="text-[12px] font-mono text-muted-foreground">
                  {new Date(network.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </Section>

        <Section variant="panel" title={t("console.tags.label")}>
          <div className="mt-2">
            <TagList tags={parseTags(network.tags)} />
          </div>
        </Section>
      </div>
    </div>
  )
}

/**
 * Data-driven topology of this VPC: the internet gateway (or an isolated
 * placeholder), the subnets grouped public/private, and a CIDR + instance
 * footer. Framing reflects the VPC's own lifecycle status.
 */
function NetworkDiagram({
  loading,
  status,
  cidr,
  igw,
  igwTone,
  publicSubnets,
  privateSubnets,
  azName,
  instanceCount,
  totalInstances,
}: Readonly<{
  loading: boolean
  status: VPCNetworkStatus
  cidr: string
  igw?: InternetGateway
  igwTone: StatusTone
  publicSubnets: Subnet[]
  privateSubnets: Subnet[]
  azName: (s: Subnet) => string | undefined
  instanceCount: (id: string) => number
  totalInstances: number
}>) {
  const { t } = useTranslation()
  const subnetCount = publicSubnets.length + privateSubnets.length
  const healthy = status === "available" || status === "active"
  const pending = status === "pending"
  const unhealthy = status === "error" || status === "deleting" || status === "deleted"

  return (
    <Section variant="panel" title={t("vpc.detail.architecture")}>
      <div className="mt-2">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="mx-auto h-4 w-px" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pending && (
              <div className="flex items-center gap-2 rounded-md border border-status-warning/25 bg-status-warning-bg px-3 py-2 text-[12px] text-status-warning">
                <span className="size-1.5 rounded-full bg-status-warning animate-pulse" />
                {t("vpc.detail.diagramPending")}
              </div>
            )}
            {unhealthy && (
              <div className="flex items-center gap-2 rounded-md border border-status-danger/25 bg-status-danger-bg px-3 py-2 text-[12px] text-status-danger">
                <Info className="size-3.5 shrink-0" aria-hidden />
                {t("vpc.detail.diagramUnhealthy", { status })}
              </div>
            )}

            <div className={healthy ? "space-y-3" : "space-y-3 opacity-60 saturate-50"}>
              <IgwNode igw={igw} tone={igwTone} />

              {subnetCount > 0 && <div className="mx-auto h-4 w-px bg-border-glass" aria-hidden />}

              {subnetCount === 0 ? (
                <EmptyState
                  icon={GitBranch}
                  title={t("vpc.detail.noSubnets")}
                  description={t("vpc.detail.noSubnetsDescription")}
                  className="py-8"
                />
              ) : (
                <div className="space-y-4">
                  <SubnetTier
                    icon={Globe}
                    title={t("vpc.detail.publicSubnets", {
                      count: publicSubnets.length,
                    })}
                    subnets={publicSubnets}
                    azName={azName}
                    instanceCount={instanceCount}
                  />
                  <SubnetTier
                    icon={Lock}
                    title={t("vpc.detail.privateSubnets", {
                      count: privateSubnets.length,
                    })}
                    subnets={privateSubnets}
                    azName={azName}
                    instanceCount={instanceCount}
                  />
                </div>
              )}
            </div>

            {/* VPC CIDR footer (real) + total instances summary */}
            <div className="flex items-center justify-between border-t border-border-glass pt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Network className="size-3.5" aria-hidden />
                {t("vpc.detail.vpcCidr")}{" "}
                <span className="font-mono text-foreground tabular-nums">{cidr}</span>
              </span>
              <span className="font-mono tabular-nums">
                {t("vpc.detail.instancesTotal", { count: totalInstances })}
              </span>
            </div>

            {subnetCount > 0 && <DiagramLegend />}
          </div>
        )}
      </div>
    </Section>
  )
}

/** The VPC's internet gateway node, or a muted "isolated network" placeholder. */
function IgwNode({ igw, tone }: Readonly<{ igw?: InternetGateway; tone: StatusTone }>) {
  const { t } = useTranslation()

  if (!igw) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border-glass bg-background/30 p-3 text-muted-foreground">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-status-neutral-bg text-status-neutral">
          <Lock className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <span className="block text-[13px] font-medium">{t("vpc.detail.noIgwTitle")}</span>
          <span className="block text-[11px]">{t("vpc.detail.noIgwHint")}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border-glass bg-background/40 p-3">
      <span className={`grid size-7 shrink-0 place-items-center rounded-md ${TONE_CLASSES[tone]}`}>
        <Globe className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{igw.name}</span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {igw.id}
        </span>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[11px] ${TONE_CLASSES[tone]}`}
      >
        <span
          className={`size-1.5 rounded-full ${tone === "success" ? "animate-pulse " : ""}${TONE_DOT_CLASSES[tone]}`}
        />
        {t(`status.${normalizeIgw(igw.status)}`, { defaultValue: igw.status })}
      </span>
    </div>
  )
}

/** A labelled group of subnet cards (public or private). Renders nothing when empty. */
function SubnetTier({
  icon: Icon,
  title,
  subnets,
  azName,
  instanceCount,
}: Readonly<{
  icon: typeof Globe
  title: string
  subnets: Subnet[]
  azName: (s: Subnet) => string | undefined
  instanceCount: (id: string) => number
}>) {
  if (subnets.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        {title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {subnets.map((s) => (
          <SubnetNode key={s.id} subnet={s} az={azName(s)} instances={instanceCount(s.id)} />
        ))}
      </div>
    </div>
  )
}

/** Globe = internet-facing, Lock = private — mirrors the create wizard legend. */
function DiagramLegend() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="grid size-4 place-items-center rounded bg-status-info-bg text-status-info">
          <Globe className="size-2.5" aria-hidden />
        </span>
        {t("vpc.wizard.legendPublic")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="grid size-4 place-items-center rounded bg-status-neutral-bg text-status-neutral">
          <Lock className="size-2.5" aria-hidden />
        </span>
        {t("vpc.wizard.legendPrivate")}
      </span>
    </div>
  )
}

/** A single subnet card in the Network Architecture diagram, driven by real data. */
function SubnetNode({
  subnet,
  az,
  instances,
}: Readonly<{ subnet: Subnet; az?: string; instances: number }>) {
  const { t } = useTranslation()
  const Icon = subnet.is_public ? Globe : Lock
  const accent = subnet.is_public
    ? "border-status-info/30 bg-status-info-bg/40"
    : "border-status-neutral/30 bg-status-neutral-bg/40"
  const iconAccent = subnet.is_public
    ? "bg-status-info-bg text-status-info"
    : "bg-status-neutral-bg text-status-neutral"
  const tone: StatusTone = getStatusConfig(subnet.status).tone

  return (
    <div className={`rounded-lg border p-3 ${accent}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`grid size-5 shrink-0 place-items-center rounded ${iconAccent}`}>
            <Icon className="size-3" aria-hidden />
          </span>
          <span className="truncate text-[13px] font-medium text-foreground">{subnet.name}</span>
        </div>
        {subnet.status && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] ${TONE_CLASSES[tone]}`}
          >
            <span className={`size-1.5 rounded-full ${TONE_DOT_CLASSES[tone]}`} />
            {t(`status.${subnet.status.toLowerCase()}`, {
              defaultValue: subnet.status,
            })}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground tabular-nums">
        <span className="rounded border border-border-glass bg-background/50 px-1.5 py-0.5 text-foreground">
          {subnet.cidr}
        </span>
        {az && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden />
            {az}
          </span>
        )}
        {subnet.available_ips != null && (
          <span>{t("vpc.detail.ipsFree", { count: subnet.available_ips })}</span>
        )}
      </div>
      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Server className="size-3" aria-hidden />
        {t("vpc.detail.instancesConnected", { count: instances })}
      </div>
    </div>
  )
}
