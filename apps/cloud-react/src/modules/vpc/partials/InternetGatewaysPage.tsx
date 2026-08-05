import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
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
  type RowAction,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  statusColumn,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Link2, Plus, RefreshCw, Search, Trash2, Unlink, Waypoints } from "lucide-react"
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
import {
  useAttachIGW,
  useCreateInternetGateway,
  useDeleteInternetGateway,
  useDetachIGW,
  useInternetGateways,
  useRegions,
  useVPCs,
} from "../vpc.hooks"
import type { InternetGateway } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"

/* ── Create dialog ─────────────────────────────────────────────────────── */

const makeCreateSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    region: z.string().min(1, "Required"),
  })

type CreateValues = z.infer<ReturnType<typeof makeCreateSchema>>

function CreateIgwDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateInternetGateway()
  const { data: regions = [] } = useRegions()
  const { rule } = useNamingRule("internet-gateway")
  const createSchema = useMemo(() => makeCreateSchema(rule), [rule])
  const quotaBlocked = useQuotaBlocked("vpc.internet_gateways")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", region: "" },
  })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: CreateValues) => {
    create(values, { onSuccess: close })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("internetGateways.createForm.title")}</DialogTitle>
          <DialogDescription>{t("internetGateways.createForm.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
          <QuotaNotice code="vpc.internet_gateways" />
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("internetGateways.createForm.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input {...register("name")} placeholder="my-igw" className="font-mono" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("internetGateways.createForm.region")}
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
                <SelectValue placeholder={t("internetGateways.createForm.regionPlaceholder")} />
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
                ? t("internetGateways.createForm.submitting")
                : t("internetGateways.createForm.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Attach dialog ─────────────────────────────────────────────────────── */

function AttachIgwDialog({
  igw,
  onOpenChange,
}: Readonly<{ igw: InternetGateway | null; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { data: vpcs = [] } = useVPCs()
  const { mutate: attach, isPending } = useAttachIGW()
  const [networkId, setNetworkId] = useState("")

  const close = (open: boolean) => {
    if (!open) setNetworkId("")
    onOpenChange(open)
  }

  return (
    <Dialog open={igw !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("internetGateways.attachForm.title")}</DialogTitle>
          <DialogDescription>
            {t("internetGateways.attachForm.description", { name: igw?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>
            {t("internetGateways.attachForm.vpc")}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Select value={networkId} onValueChange={setNetworkId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("internetGateways.attachForm.vpcPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {vpcs.map((vpc) => (
                <SelectItem key={vpc.id} value={vpc.id}>
                  {vpc.name} — {vpc.cidr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vpcs.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t("internetGateways.attachForm.noVpcs")}
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
            disabled={!networkId || isPending}
            onClick={() => {
              if (igw) {
                attach(
                  { id: igw.id, networkId },
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
            {isPending
              ? t("internetGateways.attachForm.submitting")
              : t("internetGateways.attachForm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function InternetGatewaysPage() {
  useScreen("vpc.internet-gateways")
  const { t } = useTranslation()
  const { data: gateways = [], isLoading, isError, refetch, isFetching } = useInternetGateways()
  const { data: vpcs = [] } = useVPCs()
  const { mutate: detach, isPending: isDetaching } = useDetachIGW()
  const { mutate: deleteIgw, isPending: isDeleting } = useDeleteInternetGateway()

  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [toAttach, setToAttach] = useState<InternetGateway | null>(null)
  const [toDetach, setToDetach] = useState<InternetGateway | null>(null)
  const [toDelete, setToDelete] = useState<InternetGateway | null>(null)

  const vpcNames = useMemo(() => new Map(vpcs.map((v) => [v.id, v.name])), [vpcs])

  const filtered = useMemo(() => {
    if (!query.trim()) return gateways
    const q = query.toLowerCase()
    return gateways.filter((g) => g.name.toLowerCase().includes(q))
  }, [gateways, query])

  const stats = useMemo(
    () => [
      { label: t("internetGateways.stats.total"), value: gateways.length, loading: isLoading },
      {
        label: t("internetGateways.stats.attached"),
        value: gateways.filter((g) => g.status === "attached").length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("internetGateways.stats.detached"),
        value: gateways.filter((g) => g.status === "detached").length,
        loading: isLoading,
      },
    ],
    [t, gateways, isLoading],
  )

  const columns = useMemo<ColumnDef<InternetGateway>[]>(
    () => [
      nameColumn<InternetGateway>({
        header: t("internetGateways.columns.name"),
        accessor: (g) => g.name,
      }),
      statusColumn<InternetGateway>({
        header: t("internetGateways.columns.status"),
        accessor: (g) => g.status,
        pulse: (g) => g.status === "attaching" || g.status === "detaching",
      }),
      {
        id: "vpc",
        accessorFn: (g: InternetGateway) => vpcNames.get(g.network_id) ?? g.network_id,
        header: () => t("internetGateways.columns.vpc"),
        meta: { responsive: "md", interactive: true },
        cell: ({ row }) => {
          const g = row.original
          if (!g.network_id) return <span className="text-muted-foreground">—</span>
          return (
            <Link
              to={VPC_ROUTES.detail(g.network_id)}
              className="font-mono text-[13px] text-status-info hover:underline"
            >
              {vpcNames.get(g.network_id) ?? g.network_id}
            </Link>
          )
        },
      },
      dateColumn<InternetGateway>({
        header: t("common.created"),
        accessor: (g) => g.created_at,
        responsive: "lg",
      }),
      actionsColumn<InternetGateway>({
        ariaLabel: t("console.table.actions"),
        actions: (g) => {
          const lifecycleActions: RowAction<InternetGateway>[] = []
          if (g.status === "detached") {
            lifecycleActions.push({
              label: t("internetGateways.actions.attach"),
              icon: Link2,
              onAction: (row) => {
                setToAttach(row)
              },
            })
          } else if (g.status === "attached") {
            lifecycleActions.push({
              label: t("internetGateways.actions.detach"),
              icon: Unlink,
              onAction: (row) => {
                setToDetach(row)
              },
            })
          }
          // Only a detached gateway is safe to delete outright — one still
          // attached needs to be detached first so the network doesn't lose
          // its internet route out from under it.
          const canDelete = g.status === "detached"
          return [
            ...lifecycleActions,
            ...(canDelete
              ? [
                  {
                    label: t("internetGateways.actions.delete"),
                    icon: Trash2,
                    destructive: true,
                    onAction: (row: InternetGateway) => {
                      setToDelete(row)
                    },
                  },
                ]
              : []),
          ]
        },
      }),
    ],
    [t, vpcNames],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Waypoints}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("internetGateways.title") },
        ]}
        title={t("internetGateways.title")}
        description={t("internetGateways.subtitle")}
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
              {t("internetGateways.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} className="grid-cols-3" />

      <DataTable<InternetGateway>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(g) => g.id}
        columnToolbar
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("internetGateways.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        empty={
          <EmptyState
            icon={Waypoints}
            title={t("internetGateways.empty")}
            description={t("internetGateways.emptySubtitle")}
            action={{
              label: t("internetGateways.create"),
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

      <CreateIgwDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AttachIgwDialog
        igw={toAttach}
        onOpenChange={(open) => {
          if (!open) setToAttach(null)
        }}
      />

      <ConfirmDialog
        open={toDetach !== null}
        onOpenChange={(open) => {
          if (!open) setToDetach(null)
        }}
        title={t("vpc.detachConfirm.title")}
        description={t("vpc.detachConfirm.description", {
          name: toDetach?.name ?? "",
          network: vpcNames.get(toDetach?.network_id ?? "") ?? "",
        })}
        confirmLabel={t("internetGateways.actions.detach")}
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

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("internetGateways.deleteConfirm.title")}
        description={t("internetGateways.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("internetGateways.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteIgw(toDelete.id, {
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
