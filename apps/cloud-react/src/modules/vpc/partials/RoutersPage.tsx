import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  copyColumn,
  DataTable,
  dateColumn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  nameColumn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, RefreshCw, Router as RouterIcon, Search, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { z } from "zod/v4"

import { ConfirmDialog, PageHeader, StatGrid } from "@/components/console"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import { VPC_ROUTES } from "../vpc.constants"
import { useCreateRouter, useDeleteRouter, useRegions, useRouters, useVPCs } from "../vpc.hooks"
import type { Router } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"
const NO_VPC = "__none__"

/* ── Create dialog ─────────────────────────────────────────────────────── */

const makeCreateSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    region: z.string().min(1, "Required"),
    network_id: z.string(),
  })

type CreateValues = z.infer<ReturnType<typeof makeCreateSchema>>

function CreateRouterDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateRouter()
  const { data: regions = [] } = useRegions()
  const { data: vpcs = [] } = useVPCs()
  const { rule } = useNamingRule("router")
  const createSchema = useMemo(() => makeCreateSchema(rule), [rule])
  const quotaBlocked = useQuotaBlocked("vpc.routers")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", region: "", network_id: NO_VPC },
  })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: CreateValues) => {
    create(
      {
        name: values.name,
        region: values.region,
        network_id: values.network_id === NO_VPC ? undefined : values.network_id,
      },
      { onSuccess: close },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("routers.createForm.title")}</DialogTitle>
          <DialogDescription>{t("routers.createForm.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
          <QuotaNotice code="vpc.routers" />
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("routers.createForm.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input {...register("name")} placeholder="my-router" className="font-mono" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("routers.createForm.region")}
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
                <SelectValue placeholder={t("routers.createForm.regionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.region && (
              <p className="text-[11px] text-destructive">{errors.region.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>{t("routers.createForm.vpc")}</Label>
            <Select
              value={watch("network_id")}
              onValueChange={(value) => {
                setValue("network_id", value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("routers.createForm.vpcPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_VPC}>{t("routers.createForm.vpcNone")}</SelectItem>
                {vpcs.map((vpc) => (
                  <SelectItem key={vpc.id} value={vpc.id}>
                    {vpc.name} — {vpc.cidr}
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
              {isPending ? t("routers.createForm.submitting") : t("routers.createForm.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function RoutersPage() {
  useScreen("vpc.routers")
  const { t } = useTranslation()
  const { data: routers = [], isLoading, isError, refetch, isFetching } = useRouters()
  const { data: vpcs = [] } = useVPCs()
  const { mutate: deleteRouter, isPending: isDeleting } = useDeleteRouter()

  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Router | null>(null)

  const vpcNames = useMemo(() => new Map(vpcs.map((v) => [v.id, v.name])), [vpcs])

  const filtered = useMemo(() => {
    if (!query.trim()) return routers
    const q = query.toLowerCase()
    return routers.filter(
      (r) => r.name.toLowerCase().includes(q) || r.region.toLowerCase().includes(q),
    )
  }, [routers, query])

  const stats = useMemo(
    () => [
      { label: t("routers.stats.total"), value: routers.length, loading: isLoading },
      {
        label: t("routers.stats.available"),
        value: routers.filter((r) => r.status === "available").length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("routers.stats.degraded"),
        value: routers.filter((r) => r.status === "degraded" || r.status === "failed").length,
        color: "warning" as const,
        loading: isLoading,
      },
    ],
    [t, routers, isLoading],
  )

  const columns = useMemo<ColumnDef<Router>[]>(
    () => [
      nameColumn<Router>({ header: t("routers.columns.name"), accessor: (r) => r.name }),
      statusColumn<Router>({
        header: t("routers.columns.status"),
        accessor: (r) => r.status,
        pulse: (r) =>
          r.status === "pending" ||
          r.status === "provisioning" ||
          r.status === "booting" ||
          r.status === "configuring",
      }),
      textColumn<Router>({
        id: "region",
        header: t("routers.columns.region"),
        accessor: (r) => r.region,
        mono: true,
      }),
      {
        id: "vpc",
        accessorFn: (r: Router) => vpcNames.get(r.network_id) ?? r.network_id,
        header: () => t("routers.columns.vpc"),
        meta: { responsive: "md", interactive: true },
        cell: ({ row }) => {
          const r = row.original
          if (!r.network_id) return <span className="text-muted-foreground">—</span>
          return (
            <Link
              to={VPC_ROUTES.detail(r.network_id)}
              className="font-mono text-[13px] text-status-info hover:underline"
            >
              {vpcNames.get(r.network_id) ?? r.network_id}
            </Link>
          )
        },
      },
      copyColumn<Router>({
        id: "wan_ip",
        header: t("routers.columns.wanIp"),
        accessor: (r) => r.wan_ip ?? "",
        responsive: "md",
      }),
      dateColumn<Router>({
        header: t("common.created"),
        accessor: (r) => r.created_at,
        responsive: "lg",
      }),
      actionsColumn<Router>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("routers.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (row) => {
              setToDelete(row)
            },
          },
        ],
      }),
    ],
    [t, vpcNames],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={RouterIcon}
        breadcrumbs={[{ label: t("console.nav.groups.networking") }, { label: t("routers.title") }]}
        title={t("routers.title")}
        description={t("routers.subtitle")}
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
                setCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              {t("routers.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} className="grid-cols-3" />

      <DataTable<Router>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(r) => r.id}
        columnToolbar
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("routers.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        empty={
          <EmptyState
            icon={RouterIcon}
            title={t("routers.empty")}
            description={t("routers.emptySubtitle")}
            action={{
              label: t("routers.create"),
              onClick: () => {
                setCreateOpen(true)
              },
            }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <CreateRouterDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("routers.deleteConfirm.title")}
        description={t("routers.deleteConfirm.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("routers.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteRouter(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
          }
        }}
      />
    </div>
  )
}
