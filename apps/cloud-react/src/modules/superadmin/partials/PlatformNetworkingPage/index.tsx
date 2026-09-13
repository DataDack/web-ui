import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Layers,
  Network,
  Play,
  Search,
  ShieldAlert,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { useScreen } from "@/services/api/screen"

import {
  useAddressPlan,
  useApplyClusterNetwork,
  useCheckTenantCIDR,
  useClusterNetworks,
  usePlatformDefaults,
} from "../../superadmin.hooks"
import type { CIDRDecision, PlatformBlock, PlatformVNet } from "../../superadmin.types"

const TABS = ["common", "address-plan", "clusters"] as const
type Tab = (typeof TABS)[number]

/**
 * The platform's own network.
 *
 * Read-only, deliberately. These documents are replaced WHOLE — a network's
 * numbers are only correct relative to each other, so a form that edits one
 * field at a time would be submitting a document nobody ever read as a unit.
 * Editing is S3 or the API, and this page is what tells an operator what is
 * currently true and whether a proposed tenant range is safe.
 *
 * Three tabs because there are three documents, and the split is the design:
 * the COMMON one every cluster gets, the address POLICY that is not cluster
 * config at all, and what is specific to one site.
 */
export function PlatformNetworkingPage() {
  const { t } = useTranslation()
  useScreen("superadmin.networking")
  const [tab, setTab] = useQueryParamState<Tab>("tab", TABS, "common")

  const defaults = usePlatformDefaults()
  const plan = useAddressPlan()

  const notUploaded = defaults.isError && plan.isError

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("superAdmin.networking.title")}
        description={t("superAdmin.networking.subtitle")}
      />

      {notUploaded ? (
        <EmptyState
          icon={Network}
          title={t("superAdmin.networking.notUploaded")}
          description={t("superAdmin.networking.notUploadedBody")}
        />
      ) : (
        <Tabs value={tab} onValueChange={(v) => { setTab(v); }}>
          <TabsList>
            <TabsTrigger value="common">{t("superAdmin.networking.tabs.common")}</TabsTrigger>
            <TabsTrigger value="address-plan">
              {t("superAdmin.networking.tabs.addressPlan")}
            </TabsTrigger>
            <TabsTrigger value="clusters">{t("superAdmin.networking.tabs.clusters")}</TabsTrigger>
          </TabsList>

          <TabsContent value="common" className="space-y-4 pt-4">
            <CommonTab />
          </TabsContent>
          <TabsContent value="address-plan" className="space-y-4 pt-4">
            <AddressPlanTab />
          </TabsContent>
          <TabsContent value="clusters" className="space-y-4 pt-4">
            <ClustersTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

/** The document every cluster gets. Editing it reaches every site at once. */
function CommonTab() {
  const { t } = useTranslation()
  const { data, isLoading } = usePlatformDefaults()

  const columns = useMemo<ColumnDef<PlatformVNet>[]>(
    () => [
      { accessorKey: "name", header: t("superAdmin.networking.vnetName") },
      {
        accessorKey: "vnet",
        header: t("superAdmin.networking.vnetId"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.vnet}</span>,
      },
      {
        accessorKey: "l2_vni",
        header: "L2 VNI",
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.l2_vni}</span>
        ),
      },
      {
        accessorKey: "cidr",
        header: t("superAdmin.networking.cidr"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.cidr}</span>,
      },
      {
        accessorKey: "gateway",
        header: t("superAdmin.networking.gateway"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.gateway}</span>,
      },
      {
        id: "reach",
        header: t("superAdmin.networking.tenantReachable"),
        cell: ({ row }) =>
          row.original.tenant_reachable && row.original.tenant_reachable !== "never" ? (
            <Badge variant="warning">{row.original.tenant_reachable}</Badge>
          ) : (
            <Badge variant="secondary">{t("superAdmin.networking.never")}</Badge>
          ),
      },
    ],
    [t],
  )

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!data) return null

  const { fabric, evpn, platform_zone: zone } = data

  return (
    <>
      <Card className="border-primary/30 bg-primary/5 p-4">
        <p className="text-sm">{t("superAdmin.networking.commonNotice")}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label={t("superAdmin.networking.zone")} value={zone.zone} mono />
        <Fact label="L3 VNI" value={String(zone.l3_vni)} mono />
        <Fact
          label={t("superAdmin.networking.underlay")}
          value={`${fabric.underlay_interface} · ${fabric.underlay_cidr}`}
          mono
          hint={
            fabric.underlay_vlan === 0
              ? t("superAdmin.networking.untagged")
              : `VLAN ${fabric.underlay_vlan}`
          }
        />
        <Fact
          label="MTU"
          value={`${fabric.underlay_mtu} → ${fabric.overlay_mtu}`}
          mono
          hint={t("superAdmin.networking.mtuHint")}
        />
        <Fact label={t("superAdmin.networking.controller")} value={evpn.controller} mono />
        <Fact label="ASN" value={String(evpn.asn)} mono />
        <Fact
          label={t("superAdmin.networking.loopbacks")}
          value={fabric.loopback_cidr}
          mono
          hint={t("superAdmin.networking.loopbackHint")}
        />
        <Fact label={t("superAdmin.networking.protocol")} value={fabric.protocol} mono />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">{t("superAdmin.networking.vnets")}</h2>
          <p className="text-sm text-muted-foreground">{t("superAdmin.networking.vnetsHint")}</p>
        </div>
        <DataTable columns={columns} data={zone.vnets} />
      </Card>
    </>
  )
}

/** What a tenant may ask for. Not cluster config, which is why it is its own document. */
function AddressPlanTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useAddressPlan()
  const [cidr, setCidr] = useState("")
  const check = useCheckTenantCIDR()

  const columns = useMemo<ColumnDef<PlatformBlock>[]>(
    () => [
      { accessorKey: "name", header: t("superAdmin.networking.block") },
      {
        accessorKey: "cidr",
        header: t("superAdmin.networking.cidr"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.cidr}</span>,
      },
      {
        accessorKey: "purpose",
        header: t("superAdmin.networking.purpose"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.purpose ?? "—"}</span>
        ),
      },
      {
        id: "vnet",
        header: t("superAdmin.networking.isVnet"),
        cell: ({ row }) =>
          row.original.is_overlay_vnet ? (
            <Badge variant="secondary">{t("superAdmin.networking.overlay")}</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    [t],
  )

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!data) return null

  const decision = check.data

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact
          label={t("superAdmin.networking.supernet")}
          value={data.platform_supernet}
          mono
        />
        <Fact
          label={t("superAdmin.networking.tenantRanges")}
          value={
            data.tenant_rules.allowed_cidrs === "any"
              ? t("superAdmin.networking.anyRange")
              : String(data.tenant_rules.allowed_cidrs)
          }
          hint={t("superAdmin.networking.anyRangeHint")}
        />
        <Fact
          label={t("superAdmin.networking.tenantVniCap")}
          value={`${data.vni_reservations.tenant_l2_vni_range.from}–${data.vni_reservations.tenant_l2_vni_range.to}`}
          mono
          hint={t("superAdmin.networking.vniCapHint")}
        />
      </div>

      {/* The same function VPC create calls, so this answer and the product's
          behaviour cannot drift. */}
      <Card className="p-4">
        <h2 className="font-medium">{t("superAdmin.networking.checkTitle")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {t("superAdmin.networking.checkHint")}
        </p>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (cidr.trim()) check.mutate(cidr.trim())
          }}
        >
          <Input
            value={cidr}
            onChange={(e) => { setCidr(e.target.value); }}
            placeholder={t("superAdmin.networking.cidrExample")}
            className="max-w-xs font-mono"
            aria-label={t("superAdmin.networking.checkTitle")}
          />
          <Button type="submit" variant="outline" disabled={check.isPending || !cidr.trim()}>
            <Search className="size-4" />
            {t("superAdmin.networking.check")}
          </Button>
        </form>

        {decision ? (
          <div
            className={cn(
              "mt-3 flex items-start gap-3 rounded-md border p-3",
              !decision.allowed && "border-destructive/40 bg-destructive/5",
              decision.allowed && decision.severity === "warn" && "border-warning/40 bg-warning/5",
              decision.allowed && !decision.severity && "border-success/40 bg-success/5",
            )}
          >
            <DecisionIcon decision={decision} />
            <div className="space-y-1">
              <p className="font-medium">{t(decisionLabelKey(decision))}</p>
              {decision.reason ? <p className="text-sm">{decision.reason}</p> : null}
              {decision.from_defaults ? (
                // The plan could not be read, so this answer came from the
                // compiled-in floor. An operator acting on it should know.
                <p className="text-xs text-muted-foreground">
                  {t("superAdmin.networking.fromDefaults")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">{t("superAdmin.networking.blocks")}</h2>
        </div>
        <DataTable columns={columns} data={data.blocks} />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">{t("superAdmin.networking.conflicts")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("superAdmin.networking.conflictsHint")}
          </p>
        </div>
        <ul className="divide-y">
          {data.tenant_rules.functional_conflicts.map((c) => (
            <li key={c.cidr} className="flex items-start gap-3 px-4 py-3">
              <Badge variant={c.severity === "reject" ? "destructive" : "warning"}>
                {c.severity}
              </Badge>
              <div className="min-w-0">
                <p className="font-mono text-sm">{c.cidr}</p>
                <p className="text-sm text-muted-foreground">{c.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

/** One row per site. Thin by design — a cluster document is its machines' policy. */
function ClustersTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useClusterNetworks()
  const apply = useApplyClusterNetwork()

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title={t("superAdmin.networking.noClusters")}
        description={t("superAdmin.networking.noClustersBody")}
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.map((c) => (
        <Card key={c.availability_zone} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium">{c.availability_zone}</h3>
              <p className="text-sm text-muted-foreground">
                {c.cluster} · {c.region}
                {c.datacenter ? ` · ${c.datacenter}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={c.enabled ? "success" : "secondary"}>
                {c.enabled
                  ? t("superAdmin.networking.enabled")
                  : t("superAdmin.networking.disabled")}
              </Badge>
              {/* Writes the zone and its VNets onto every placed node in this
                  availability zone, through the same manager endpoint a tenant
                  VPC uses. */}
              <Button
                size="sm"
                variant="outline"
                disabled={!c.enabled || apply.isPending}
                onClick={() => {
                  apply.mutate(c.availability_zone)
                }}
              >
                <Play className={cn("size-4", apply.isPending && "animate-pulse")} />
                {t("superAdmin.networking.apply")}
              </Button>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("superAdmin.networking.exitNodes")}</dt>
            <dd className="font-mono">
              {c.exit_nodes?.length ? c.exit_nodes.join(", ") : t("superAdmin.networking.allNodes")}
            </dd>
            <dt className="text-muted-foreground">{t("superAdmin.networking.routeReflectors")}</dt>
            <dd className="font-mono">
              {c.route_reflectors?.length
                ? c.route_reflectors.join(", ")
                : t("superAdmin.networking.allNodes")}
            </dd>
            <dt className="text-muted-foreground">{t("superAdmin.networking.revision")}</dt>
            <dd className="tabular-nums">{c.revision}</dd>
          </dl>

          {c.redundancy && c.redundancy.status !== "ok" ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium">
                  {t("superAdmin.networking.redundancy", { status: c.redundancy.status })}
                </p>
                {c.redundancy.reason ? (
                  <p className="text-sm text-muted-foreground">{c.redundancy.reason}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {c.known_gaps?.length ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                {t("superAdmin.networking.knownGaps", { count: c.known_gaps.length })}
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {c.known_gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>
      ))}
    </div>
  )
}

/** The verdict's icon. Extracted so the branch is readable and testable rather
 *  than a nested ternary inside JSX. */
function DecisionIcon({ decision }: Readonly<{ decision: CIDRDecision }>) {
  if (!decision.allowed) {
    return <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
  }
  if (decision.severity === "warn") {
    return <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
  }
  return <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
}

/** Three outcomes, and the middle one matters most: a tenant may have the range,
 *  and is told what it costs them. */
function decisionLabelKey(decision: CIDRDecision): string {
  if (!decision.allowed) return "superAdmin.networking.refused"
  if (decision.severity === "warn") return "superAdmin.networking.allowedWithCost"
  return "superAdmin.networking.allowed"
}

function Fact({
  label,
  value,
  hint,
  mono,
}: Readonly<{
  label: string
  value: string
  hint?: string
  mono?: boolean
}>) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Globe className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("mt-2 text-lg font-semibold", mono && "font-mono text-base")}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </Card>
  )
}
