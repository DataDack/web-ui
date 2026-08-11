import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  copyColumn,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  statusColumn,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Boxes,
  Globe,
  Link2,
  Plus,
  RefreshCw,
  Router,
  Scale,
  Search,
  Server,
  Shuffle,
  Trash2,
  Unlink,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { z } from "zod/v4"

import { ConfirmDialog, PageHeader, StatGrid } from "@/components/console"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { LB_ROUTES } from "@/modules/load-balancers/load-balancers.constants"
import { MANAGED_APPS_ROUTES } from "@/modules/managed-apps/managed-apps.constants"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import { VPC_ROUTES } from "../vpc.constants"
import {
  useAssignStaticIP,
  useRegions,
  useReleaseStaticIP,
  useReserveStaticIP,
  useStaticIPs,
  useUnassignStaticIP,
} from "../vpc.hooks"
import type { StaticIP, StaticIPAttachmentType } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"

/* ── Reserve dialog ────────────────────────────────────────────────────── */

const makeReserveSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    region: z.string().min(1, "Required"),
  })

type ReserveValues = z.infer<ReturnType<typeof makeReserveSchema>>

function ReserveIpDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: reserve, isPending } = useReserveStaticIP()
  const { data: regions = [] } = useRegions()
  const { rule } = useNamingRule("static-ip")
  const reserveSchema = useMemo(() => makeReserveSchema(rule), [rule])
  const quotaBlocked = useQuotaBlocked("vpc.static_ips")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReserveValues>({
    resolver: zodResolver(reserveSchema),
    defaultValues: { name: "", region: "" },
  })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: ReserveValues) => {
    reserve(values, { onSuccess: close })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("staticIps.reserveForm.title")}</DialogTitle>
          <DialogDescription>{t("staticIps.reserveForm.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
          <QuotaNotice code="vpc.static_ips" />
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("staticIps.reserveForm.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input {...register("name")} placeholder="my-ip" className="font-mono" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("staticIps.reserveForm.region")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              value={watch("region")}
              disabled={regions.length === 0}
              onValueChange={(value) => {
                setValue("region", value, { shouldValidate: true })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("staticIps.reserveForm.regionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              {t("console.wizard.cancel")}
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={isPending || quotaBlocked}
              loading={isPending}
            >
              {isPending
                ? t("staticIps.reserveForm.submitting")
                : t("staticIps.reserveForm.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Assign dialog ─────────────────────────────────────────────────────── */

function AssignIpDialog({
  ip,
  onOpenChange,
}: Readonly<{ ip: StaticIP | null; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { data: instances = [] } = useInstances()
  const { mutate: assign, isPending } = useAssignStaticIP()
  const [instanceId, setInstanceId] = useState("")

  const runningInstances = instances.filter((i) => i.status === "running")

  const close = (open: boolean) => {
    if (!open) setInstanceId("")
    onOpenChange(open)
  }

  return (
    <Dialog open={ip !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("staticIps.assignForm.title")}</DialogTitle>
          <DialogDescription>
            {t("staticIps.assignForm.description", { ip: ip?.ip_address ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>
            {t("staticIps.assignForm.instance")}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Select value={instanceId} onValueChange={setInstanceId}>
            <SelectTrigger className="w-full font-mono text-[13px]">
              <SelectValue placeholder={t("staticIps.assignForm.instancePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {runningInstances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id} className="font-mono text-[13px]">
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {runningInstances.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t("staticIps.assignForm.noInstances")}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              close(false)
            }}
          >
            {t("console.wizard.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!instanceId || isPending}
            onClick={() => {
              if (ip) {
                assign(
                  { id: ip.id, instanceId },
                  {
                    onSuccess: () => {
                      close(false)
                    },
                  },
                )
              }
            }}
            loading={isPending}
          >
            {isPending ? t("staticIps.assignForm.submitting") : t("staticIps.assignForm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Attachment ────────────────────────────────────────────────────────── */

/**
 * An address is attached to one of five kinds of resource, and the screen has
 * to say which. Only instances and load balancers have a detail page; the rest
 * link to their list, which is still better than a bare uuid.
 */
const ATTACHMENT_ICONS: Record<Exclude<StaticIPAttachmentType, "">, typeof Server> = {
  instance: Server,
  load_balancer: Scale,
  nat_gateway: Shuffle,
  vpc_gateway: Router,
  managed_app: Boxes,
}

const ATTACHMENT_TYPE_LABELS: Record<Exclude<StaticIPAttachmentType, "">, string> = {
  instance: "staticIps.attachment.instance",
  load_balancer: "staticIps.attachment.loadBalancer",
  nat_gateway: "staticIps.attachment.natGateway",
  vpc_gateway: "staticIps.attachment.vpcGateway",
  managed_app: "staticIps.attachment.managedApp",
}

function attachmentRoute(ip: StaticIP): string | null {
  switch (ip.attachment.type) {
    case "instance":
      return VMS_ROUTES.detail(ip.attachment.id)
    case "load_balancer":
      return LB_ROUTES.detail(ip.attachment.id)
    case "managed_app":
      return MANAGED_APPS_ROUTES.project(ip.attachment.id)
    case "nat_gateway":
      return VPC_ROUTES.NAT_GATEWAYS
    case "vpc_gateway":
      return VPC_ROUTES.ROUTERS
    default:
      return null
  }
}

/**
 * The name the API resolved, falling back to the locally loaded instance list
 * and finally to the raw id. The id is a poor label but an honest one — never
 * render an attached address as attached to nothing.
 */
function attachmentLabel(ip: StaticIP, instanceNames: Map<string, string>): string {
  if (!ip.attachment.type) return ""
  if (ip.attachment.name) return ip.attachment.name
  return instanceNames.get(ip.attachment.id) ?? ip.attachment.id
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function StaticIpsPage() {
  useScreen("vpc.static-ips")
  const { t } = useTranslation()
  const { data: ips = [], isLoading, isError, refetch, isFetching } = useStaticIPs()
  const { data: instances = [] } = useInstances()
  const { mutate: unassign, isPending: isUnassigning } = useUnassignStaticIP()
  const { mutate: release, isPending: isReleasing } = useReleaseStaticIP()

  const [query, setQuery] = useState("")
  const [reserveOpen, setReserveOpen] = useState(false)
  const [toAssign, setToAssign] = useState<StaticIP | null>(null)
  const [toUnassign, setToUnassign] = useState<StaticIP | null>(null)
  const [toRelease, setToRelease] = useState<StaticIP | null>(null)

  const instanceNames = useMemo(() => new Map(instances.map((i) => [i.id, i.name])), [instances])

  const filtered = useMemo(() => {
    if (!query.trim()) return ips
    const q = query.toLowerCase()
    return ips.filter(
      (ip) =>
        ip.name.toLowerCase().includes(q) ||
        ip.ip_address.includes(q) ||
        ip.region.toLowerCase().includes(q),
    )
  }, [ips, query])

  const stats = useMemo(
    () => [
      { label: t("staticIps.stats.total"), value: ips.length, loading: isLoading },
      {
        label: t("staticIps.stats.assigned"),
        value: ips.filter((ip) => ip.status === "assigned").length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("staticIps.stats.reserved"),
        value: ips.filter((ip) => ip.status === "reserved").length,
        loading: isLoading,
      },
    ],
    [t, ips, isLoading],
  )

  const columns = useMemo<ColumnDef<StaticIP>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("staticIps.columns.name")}
          </span>
        ),
        accessorFn: (ip) => ip.name,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[14px] leading-tight text-foreground flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              {row.original.name}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground mt-0.5 ml-6">
              IP-{row.original.tenant_serial}
            </span>
          </div>
        ),
      },
      {
        id: "region",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("staticIps.columns.region")}
          </span>
        ),
        accessorFn: (ip) => ip.region,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 font-medium text-[13px] text-foreground">
            <Globe className="size-3.5 text-muted-foreground" />
            {row.original.region}
          </span>
        ),
        meta: { responsive: "md" },
      },
      copyColumn<StaticIP>({
        id: "ip_address",
        header: t("staticIps.columns.ip"),
        accessor: (ip) => ip.ip_address,
      }),
      statusColumn<StaticIP>({
        header: t("staticIps.columns.status"),
        accessor: (ip) => ip.status,
        pulse: (ip) => ip.status === "assigned" || ip.status === "provisioning",
      }),
      {
        id: "attachment",
        accessorFn: (ip: StaticIP) => attachmentLabel(ip, instanceNames),
        header: () => t("staticIps.columns.attachedTo"),
        meta: { interactive: true },
        cell: ({ row }) => {
          const ip = row.original
          if (!ip.attachment.type) {
            // An assigned address with no resolvable holder is a data problem,
            // not a free address — say so, rather than render it exactly like
            // one nobody is using.
            const key = ip.status === "assigned" ? "unknown" : "none"
            return <span className="text-muted-foreground">{t(`staticIps.attachment.${key}`)}</span>
          }
          const Icon = ATTACHMENT_ICONS[ip.attachment.type]
          const label = attachmentLabel(ip, instanceNames)
          const to = attachmentRoute(ip)
          return (
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5">
                <Icon className="size-3.5 text-muted-foreground shrink-0" />
                {to ? (
                  <Link
                    to={to}
                    className="font-mono text-[13px] text-status-info hover:underline truncate"
                  >
                    {label}
                  </Link>
                ) : (
                  <span className="font-mono text-[13px] text-foreground truncate">{label}</span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 ml-5">
                {t(ATTACHMENT_TYPE_LABELS[ip.attachment.type])}
                {ip.attachment.deleted && ` · ${t("staticIps.attachment.deleted")}`}
              </span>
            </div>
          )
        },
      },
      actionsColumn<StaticIP>({
        ariaLabel: t("console.table.actions"),
        actions: (ip) => {
          // Provisioning IPs are still being allocated — neither
          // assign nor unassign applies until the address is ready.
          const attachmentActions = []
          if (ip.status === "reserved") {
            attachmentActions.push({
              label: t("staticIps.actions.assign"),
              icon: Link2,
              onAction: (row: StaticIP) => {
                setToAssign(row)
              },
            })
          } else if (ip.status !== "provisioning") {
            attachmentActions.push({
              label: t("staticIps.actions.unassign"),
              icon: Unlink,
              onAction: (row: StaticIP) => {
                setToUnassign(row)
              },
            })
          }
          return [
            ...attachmentActions,
            {
              label: t("staticIps.actions.release"),
              icon: Trash2,
              destructive: true,
              onAction: (row: StaticIP) => {
                setToRelease(row)
              },
            },
          ]
        },
      }),
    ],
    [t, instanceNames],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Globe}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("staticIps.title") },
        ]}
        title={t("staticIps.title")}
        description={t("staticIps.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setReserveOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              {t("staticIps.reserve")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} className="grid-cols-2 lg:grid-cols-3" />

      <DataTable<StaticIP>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(ip) => ip.id}
        columnToolbar
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("staticIps.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        empty={
          <EmptyState
            icon={Globe}
            title={t("staticIps.empty")}
            description={t("staticIps.emptySubtitle")}
            action={{
              label: t("staticIps.reserve"),
              onClick: () => {
                setReserveOpen(true)
              },
            }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <ReserveIpDialog open={reserveOpen} onOpenChange={setReserveOpen} />

      <AssignIpDialog
        ip={toAssign}
        onOpenChange={(open) => {
          if (!open) setToAssign(null)
        }}
      />

      <ConfirmDialog
        open={toUnassign !== null}
        onOpenChange={(open) => {
          if (!open) setToUnassign(null)
        }}
        title={t("staticIps.unassignConfirm.title")}
        description={t("staticIps.unassignConfirm.description", {
          ip: toUnassign?.ip_address ?? "",
          // Whatever holds it, not just an instance — the same reason the table
          // resolves the whole attachment.
          instance: toUnassign ? attachmentLabel(toUnassign, instanceNames) : "",
        })}
        confirmLabel={t("staticIps.actions.unassign")}
        destructive={false}
        loading={isUnassigning}
        onConfirm={() => {
          if (toUnassign) {
            unassign(toUnassign.id, {
              onSuccess: () => {
                setToUnassign(null)
              },
            })
          }
        }}
      />

      <ConfirmDialog
        open={toRelease !== null}
        onOpenChange={(open) => {
          if (!open) setToRelease(null)
        }}
        title={t("staticIps.releaseConfirm.title")}
        description={t("staticIps.releaseConfirm.description", {
          ip: toRelease?.ip_address ?? "",
        })}
        confirmLabel={t("staticIps.actions.release")}
        loading={isReleasing}
        onConfirm={() => {
          if (toRelease) {
            release(toRelease.id, {
              onSuccess: () => {
                setToRelease(null)
              },
            })
          }
        }}
      />
    </div>
  )
}
