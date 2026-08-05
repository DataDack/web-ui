import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
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
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowRightLeft, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { ConfirmDialog, PageHeader, StatGrid } from "@/components/console"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import {
  useAllSubnets,
  useCreateNATGateway,
  useDeleteNATGateway,
  useNATGateways,
  useStaticIPs,
  useVPCs,
} from "../vpc.hooks"
import type { NATGateway } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"
const AUTO_IP = "__auto__"

/* ── Create dialog ─────────────────────────────────────────────────────── */

const makeCreateSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    network_id: z.string().min(1, "Required"),
    subnet_id: z.string().min(1, "Required"),
    connectivity: z.enum(["public", "private"]),
    static_ip_id: z.string(),
  })

type CreateValues = z.infer<ReturnType<typeof makeCreateSchema>>

function CreateNatGatewayDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateNATGateway()
  const { data: vpcs = [] } = useVPCs()
  const { data: subnets = [] } = useAllSubnets()
  // Static IPs not already attached to an instance are free to bind as the
  // gateway's EIP. A static IP already bound to another NAT gateway isn't
  // distinguishable here (the FE model only tracks instance associations),
  // so the backend is the final word — it rejects a taken address.
  const { data: staticIps = [] } = useStaticIPs()
  const availableIps = useMemo(
    () => staticIps.filter((ip) => ip.status === "reserved"),
    [staticIps],
  )
  const { rule } = useNamingRule("nat-gateway")
  const createSchema = useMemo(() => makeCreateSchema(rule), [rule])
  const quotaBlocked = useQuotaBlocked("vpc.nat_gateways")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      network_id: "",
      subnet_id: "",
      connectivity: "public",
      static_ip_id: AUTO_IP,
    },
  })

  const networkId = watch("network_id")
  const connectivity = watch("connectivity")
  const vpcSubnets = useMemo(
    () => (networkId ? subnets.filter((s) => s.network_id === networkId) : []),
    [subnets, networkId],
  )

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onVpcChange = (value: string) => {
    setValue("network_id", value, { shouldValidate: true })
    setValue("subnet_id", "", { shouldValidate: true })
  }

  const onSubmit = (values: CreateValues) => {
    create(
      {
        name: values.name,
        subnet_id: values.subnet_id,
        connectivity: values.connectivity,
        static_ip_id:
          values.connectivity === "public" && values.static_ip_id !== AUTO_IP
            ? values.static_ip_id
            : undefined,
      },
      { onSuccess: close },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("natGateways.createForm.title")}</DialogTitle>
          <DialogDescription>{t("natGateways.createForm.description")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-5 max-h-[70vh] overflow-y-auto pr-1"
        >
          <QuotaNotice code="vpc.nat_gateways" />
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("natGateways.createForm.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input {...register("name")} placeholder="my-nat" className="font-mono" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("natGateways.createForm.vpc")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={networkId} disabled={vpcs.length === 0} onValueChange={onVpcChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("natGateways.createForm.vpcPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {vpcs.map((vpc) => (
                  <SelectItem key={vpc.id} value={vpc.id}>
                    {vpc.name} — {vpc.cidr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.network_id && (
              <p className="text-[11px] text-destructive">{errors.network_id.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("natGateways.createForm.subnet")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              value={watch("subnet_id")}
              disabled={!networkId || vpcSubnets.length === 0}
              onValueChange={(value) => {
                setValue("subnet_id", value, { shouldValidate: true })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    networkId
                      ? t("natGateways.createForm.subnetPlaceholder")
                      : t("natGateways.createForm.selectVpcFirst")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vpcSubnets.map((subnet) => (
                  <SelectItem key={subnet.id} value={subnet.id}>
                    {subnet.name} — {subnet.cidr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {networkId && vpcSubnets.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                {t("natGateways.createForm.subnetEmpty")}
              </p>
            )}
            {errors.subnet_id && (
              <p className="text-[11px] text-destructive">{errors.subnet_id.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>{t("natGateways.createForm.connectivity")}</Label>
            <Select
              value={connectivity}
              onValueChange={(value) => {
                setValue("connectivity", value as "public" | "private")
                if (value === "private") setValue("static_ip_id", AUTO_IP)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t("natGateways.badges.public")}</SelectItem>
                <SelectItem value="private">{t("natGateways.badges.private")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {connectivity === "public" && (
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>{t("natGateways.createForm.staticIp")}</Label>
              <Select
                value={watch("static_ip_id")}
                onValueChange={(value) => {
                  setValue("static_ip_id", value)
                }}
              >
                <SelectTrigger className="w-full font-mono text-[13px]">
                  <SelectValue placeholder={t("natGateways.createForm.staticIpPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_IP}>
                    {t("natGateways.createForm.staticIpPlaceholder")}
                  </SelectItem>
                  {availableIps.map((ip) => (
                    <SelectItem key={ip.id} value={ip.id} className="font-mono text-[13px]">
                      {ip.name} — {ip.ip_address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableIps.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {t("natGateways.createForm.staticIpEmpty")}
                </p>
              )}
            </div>
          )}
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
                ? t("natGateways.createForm.submitting")
                : t("natGateways.createForm.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function NatGatewaysPage() {
  useScreen("vpc.nat-gateways")
  const { t } = useTranslation()
  const { data: natGateways = [], isLoading, isError, refetch, isFetching } = useNATGateways()
  const { data: subnets = [] } = useAllSubnets()
  const { data: staticIps = [] } = useStaticIPs()
  const { mutate: deleteNat, isPending: isDeleting } = useDeleteNATGateway()

  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<NATGateway | null>(null)

  const subnetNames = useMemo(() => new Map(subnets.map((s) => [s.id, s.name])), [subnets])
  const staticIpAddresses = useMemo(
    () => new Map(staticIps.map((ip) => [ip.id, ip.ip_address])),
    [staticIps],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return natGateways
    const q = query.toLowerCase()
    return natGateways.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        (subnetNames.get(n.subnet_id) ?? n.subnet_id).toLowerCase().includes(q),
    )
  }, [natGateways, query, subnetNames])

  const stats = useMemo(
    () => [
      { label: t("natGateways.stats.total"), value: natGateways.length, loading: isLoading },
      {
        label: t("natGateways.stats.available"),
        value: natGateways.filter((n) => n.status === "available").length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("natGateways.stats.pending"),
        value: natGateways.filter((n) => n.status === "pending").length,
        loading: isLoading,
      },
    ],
    [t, natGateways, isLoading],
  )

  const columns = useMemo<ColumnDef<NATGateway>[]>(
    () => [
      nameColumn<NATGateway>({ header: t("natGateways.columns.name"), accessor: (n) => n.name }),
      statusColumn<NATGateway>({
        header: t("natGateways.columns.status"),
        accessor: (n) => n.status,
        pulse: (n) => n.status === "pending",
      }),
      {
        id: "subnet",
        accessorFn: (n: NATGateway) => subnetNames.get(n.subnet_id) ?? n.subnet_id,
        header: () => t("natGateways.columns.subnet"),
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-muted-foreground">
            {subnetNames.get(row.original.subnet_id) ?? row.original.subnet_id}
          </span>
        ),
      },
      {
        id: "connectivity",
        accessorFn: (n: NATGateway) => n.connectivity,
        header: () => t("natGateways.columns.connectivity"),
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            {t(`natGateways.badges.${row.original.connectivity}`)}
          </Badge>
        ),
      },
      copyColumn<NATGateway>({
        id: "eip",
        header: t("natGateways.columns.eip"),
        accessor: (n) => (n.static_ip_id ? (staticIpAddresses.get(n.static_ip_id) ?? "") : ""),
      }),
      dateColumn<NATGateway>({
        header: t("common.created"),
        accessor: (n) => n.created_at,
        responsive: "lg",
      }),
      actionsColumn<NATGateway>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("natGateways.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (row) => {
              setToDelete(row)
            },
          },
        ],
      }),
    ],
    [t, subnetNames, staticIpAddresses],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ArrowRightLeft}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("natGateways.title") },
        ]}
        title={t("natGateways.title")}
        description={t("natGateways.subtitle")}
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
              {t("natGateways.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} className="grid-cols-3" />

      <DataTable<NATGateway>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(n) => n.id}
        columnToolbar
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("natGateways.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        empty={
          <EmptyState
            icon={ArrowRightLeft}
            title={t("natGateways.empty")}
            description={t("natGateways.emptySubtitle")}
            action={{
              label: t("natGateways.create"),
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

      <CreateNatGatewayDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("natGateways.deleteConfirm.title")}
        description={t("natGateways.deleteConfirm.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("natGateways.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteNat(toDelete.id, {
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
