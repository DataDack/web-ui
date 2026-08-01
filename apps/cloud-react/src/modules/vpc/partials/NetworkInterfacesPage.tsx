import { useMemo, useState } from "react"

import { Label, Textarea } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { EthernetPort, Link2, Plus, RefreshCw, Search, Trash2, Unlink } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import {
  actionsColumn,
  ConfirmDialog,
  copyColumn,
  dateColumn,
  EmptyState,
  nameColumn,
  PageHeader,
  ResourceTable,
  type RowAction,
  StatGrid,
  statusColumn,
  textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@DataDack/common-ui"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAvailabilityZoneMap } from "@/modules/catalog/catalog.hooks"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import { VPC_ROUTES } from "../vpc.constants"
import {
  useAllSecurityGroups,
  useAllSubnets,
  useAttachNetworkInterface,
  useCreateNetworkInterface,
  useDeleteNetworkInterface,
  useDetachNetworkInterface,
  useNetworkInterfaces,
  useVPCs,
} from "../vpc.hooks"
import type { NetworkInterface } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"

/* ── Create dialog ─────────────────────────────────────────────────────── */

const makeCreateSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    // VPC scopes the subnet and security-group choices. It is not sent to the
    // backend (the subnet determines the VPC server-side) but is required so
    // the user can't pick a subnet without first choosing its network.
    network_id: z.string().min(1, "Required"),
    subnet_id: z.string().min(1, "Required"),
    security_group_ids: z.array(z.string()),
    private_ip: z.string(),
    description: z.string(),
  })

type CreateValues = z.infer<ReturnType<typeof makeCreateSchema>>

function CreateNetworkInterfaceDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateNetworkInterface()
  const { data: vpcs = [] } = useVPCs()
  const { data: subnets = [] } = useAllSubnets()
  const { data: securityGroups = [] } = useAllSecurityGroups()
  const { rule } = useNamingRule("network-interface")
  const createSchema = useMemo(() => makeCreateSchema(rule), [rule])

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
      security_group_ids: [],
      private_ip: "",
      description: "",
    },
  })

  const networkId = watch("network_id")
  const selectedSgs = watch("security_group_ids")

  // Subnets and security groups are scoped to the chosen VPC. Until a VPC is
  // picked, both lists stay empty (and their controls disabled).
  const vpcSubnets = useMemo(
    () => (networkId ? subnets.filter((s) => s.network_id === networkId) : []),
    [subnets, networkId],
  )
  const vpcSecurityGroups = useMemo(
    () => (networkId ? securityGroups.filter((sg) => sg.network_id === networkId) : []),
    [securityGroups, networkId],
  )

  const close = () => {
    reset()
    onOpenChange(false)
  }

  // Changing the VPC invalidates any subnet / SG selection made under the
  // previous network, so clear them.
  const onVpcChange = (value: string) => {
    setValue("network_id", value, { shouldValidate: true })
    setValue("subnet_id", "", { shouldValidate: true })
    setValue("security_group_ids", [])
  }

  const toggleSg = (id: string) => {
    const next = selectedSgs.includes(id)
      ? selectedSgs.filter((sg) => sg !== id)
      : [...selectedSgs, id]
    setValue("security_group_ids", next)
  }

  // Security-group picker body: a hint until a VPC is chosen, then either an
  // empty note or a checkbox list scoped to that VPC.
  let securityGroupsField: React.ReactNode
  if (!networkId) {
    securityGroupsField = (
      <p className="text-[11px] text-muted-foreground">
        {t("networkInterfaces.createForm.selectVpcFirst")}
      </p>
    )
  } else if (vpcSecurityGroups.length === 0) {
    securityGroupsField = (
      <p className="text-[11px] text-muted-foreground">
        {t("networkInterfaces.createForm.securityGroupsEmpty")}
      </p>
    )
  } else {
    securityGroupsField = (
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-input bg-input/20 p-2">
        {vpcSecurityGroups.map((sg) => (
          <label
            key={sg.id}
            className="flex cursor-pointer items-start gap-2.5 rounded-sm px-1.5 py-1 hover:bg-muted/40"
          >
            <Checkbox
              checked={selectedSgs.includes(sg.id)}
              onCheckedChange={() => {
                toggleSg(sg.id)
              }}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block font-mono text-[13px] text-foreground">{sg.name}</span>
              {sg.description && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {sg.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    )
  }

  const onSubmit = (values: CreateValues) => {
    create(
      {
        name: values.name,
        subnet_id: values.subnet_id,
        private_ip: values.private_ip.trim() || undefined,
        security_group_ids:
          values.security_group_ids.length > 0 ? values.security_group_ids : undefined,
        description: values.description.trim() || undefined,
      },
      { onSuccess: close },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("networkInterfaces.createForm.title")}</DialogTitle>
          <DialogDescription>{t("networkInterfaces.createForm.description")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-5 max-h-[70vh] overflow-y-auto pr-1"
        >
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("networkInterfaces.createForm.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input {...register("name")} placeholder="my-eni" className="font-mono" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("networkInterfaces.createForm.vpc")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={networkId} disabled={vpcs.length === 0} onValueChange={onVpcChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("networkInterfaces.createForm.vpcPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {vpcs.map((vpc) => (
                  <SelectItem key={vpc.id} value={vpc.id}>
                    {vpc.name} — {vpc.cidr}
                    <span className="text-muted-foreground"> · {vpc.region}</span>
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
              {t("networkInterfaces.createForm.subnet")}
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
                      ? t("networkInterfaces.createForm.subnetPlaceholder")
                      : t("networkInterfaces.createForm.selectVpcFirst")
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
                {t("networkInterfaces.createForm.subnetEmpty")}
              </p>
            )}
            {errors.subnet_id && (
              <p className="text-[11px] text-destructive">{errors.subnet_id.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("networkInterfaces.createForm.securityGroups")}
            </Label>
            {securityGroupsField}
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("networkInterfaces.createForm.privateIp")}
            </Label>
            <Input
              {...register("private_ip")}
              placeholder={t("networkInterfaces.createForm.privateIpPlaceholder")}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("networkInterfaces.createForm.descriptionField")}
            </Label>
            <Textarea
              {...register("description")}
              placeholder={t("networkInterfaces.createForm.descriptionPlaceholder")}
              rows={2}
              className="resize-none text-[13px]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending
                ? t("networkInterfaces.createForm.submitting")
                : t("networkInterfaces.createForm.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Attach dialog ─────────────────────────────────────────────────────── */

function AttachInterfaceDialog({
  nic,
  onOpenChange,
}: Readonly<{ nic: NetworkInterface | null; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { data: instances = [] } = useInstances()
  const { mutate: attach, isPending } = useAttachNetworkInterface()
  const [instanceId, setInstanceId] = useState("")

  const runningInstances = instances.filter((i) => i.status === "running")

  const close = (open: boolean) => {
    if (!open) setInstanceId("")
    onOpenChange(open)
  }

  return (
    <Dialog open={nic !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("networkInterfaces.attachForm.title")}</DialogTitle>
          <DialogDescription>
            {t("networkInterfaces.attachForm.description", { name: nic?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASS}>
            {t("networkInterfaces.attachForm.instance")}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Select value={instanceId} onValueChange={setInstanceId}>
            <SelectTrigger className="w-full font-mono text-[13px]">
              <SelectValue placeholder={t("networkInterfaces.attachForm.instancePlaceholder")} />
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
              {t("networkInterfaces.attachForm.noInstances")}
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
              if (nic) {
                attach(
                  { id: nic.id, instanceId },
                  {
                    onSuccess: () => {
                      close(false)
                    },
                  },
                )
              }
            }}
          >
            {isPending
              ? t("networkInterfaces.attachForm.submitting")
              : t("networkInterfaces.attachForm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function NetworkInterfacesPage() {
  useScreen("vpc.network-interfaces")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: nics = [], isLoading, isError, refetch, isFetching } = useNetworkInterfaces()
  const { data: networks = [] } = useVPCs()
  const { data: subnets = [] } = useAllSubnets()
  const { data: instances = [] } = useInstances()
  const azMap = useAvailabilityZoneMap()
  const { mutate: detach, isPending: isDetaching } = useDetachNetworkInterface()
  const { mutate: deleteNic, isPending: isDeleting } = useDeleteNetworkInterface()

  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [toAttach, setToAttach] = useState<NetworkInterface | null>(null)
  const [toDetach, setToDetach] = useState<NetworkInterface | null>(null)
  const [toDelete, setToDelete] = useState<NetworkInterface | null>(null)

  // Resolve a NIC's parent VPC name for display; fall back to the raw id.
  const vpcNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of networks) map.set(n.id, n.name)
    return map
  }, [networks])

  // Resolve a NIC's subnet name for display; fall back to the raw id.
  const subnetNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of subnets) map.set(s.id, s.name)
    return map
  }, [subnets])

  const instanceNames = useMemo(() => new Map(instances.map((i) => [i.id, i.name])), [instances])

  const filtered = useMemo(() => {
    if (!query.trim()) return nics
    const q = query.toLowerCase()
    return nics.filter(
      (nic) =>
        nic.name.toLowerCase().includes(q) ||
        nic.id.includes(q) ||
        nic.private_ip.includes(q) ||
        nic.subnet_id.toLowerCase().includes(q) ||
        nic.mac_address.toLowerCase().includes(q) ||
        nic.security_group_ids.some((sg) => sg.toLowerCase().includes(q)),
    )
  }, [nics, query])

  const stats = useMemo(
    () => [
      {
        label: t("networkInterfaces.stats.total"),
        value: nics.length,
        loading: isLoading,
      },
      {
        label: t("networkInterfaces.stats.inUse"),
        value: nics.filter((nic) => nic.status === "in-use").length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("networkInterfaces.stats.available"),
        value: nics.filter((nic) => nic.status === "available").length,
        loading: isLoading,
      },
    ],
    [t, nics, isLoading],
  )

  const columns = useMemo<ColumnDef<NetworkInterface>[]>(
    () => [
      copyColumn<NetworkInterface>({
        id: "id",
        header: t("networkInterfaces.columns.interfaceId"),
        accessor: (nic) => `NET-${String(nic.tenant_serial)}`,
        responsive: "lg",
      }),
      nameColumn<NetworkInterface>({
        header: t("networkInterfaces.columns.name"),
        accessor: (nic) => nic.name,
      }),
      statusColumn<NetworkInterface>({
        header: t("networkInterfaces.columns.status"),
        accessor: (nic) => nic.status,
        pulse: (nic) => nic.status === "in-use" || nic.status === "pending",
      }),
      {
        id: "subnet_id",
        accessorFn: (nic: NetworkInterface) => subnetNames.get(nic.subnet_id) ?? nic.subnet_id,
        header: () => t("networkInterfaces.columns.subnet"),
        meta: { responsive: "md", interactive: true },
        cell: ({ row }) => {
          const nic = row.original
          const label = subnetNames.get(nic.subnet_id) ?? nic.subnet_id
          return (
            <button
              type="button"
              className="font-mono text-[13px] text-status-info hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                void navigate(`${VPC_ROUTES.detail(nic.network_id)}?tab=subnets`)
              }}
            >
              {label}
            </button>
          )
        },
      },
      {
        id: "vpc",
        accessorFn: (nic: NetworkInterface) => vpcNames.get(nic.network_id) ?? nic.network_id,
        header: () => t("networkInterfaces.columns.vpc"),
        meta: { responsive: "md", interactive: true },
        cell: ({ row }) => {
          const nic = row.original
          const label = vpcNames.get(nic.network_id) ?? nic.network_id
          return (
            <button
              type="button"
              className="font-mono text-[13px] text-status-info hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                void navigate(VPC_ROUTES.detail(nic.network_id))
              }}
            >
              {label}
            </button>
          )
        },
      },
      textColumn<NetworkInterface>({
        id: "zone",
        header: t("networkInterfaces.columns.zone"),
        // Backend mirrors the parent subnet's `availability_zone_id` (a
        // uuid); resolve it to the AZ's code (e.g. "ap-south-3-a") via the
        // region catalog — the stable identifier, not the friendly name.
        // Renders "—" when no AZ is set (never the region — that would
        // mislabel the column).
        accessor: (nic) =>
          nic.availability_zone_id ? azMap.get(nic.availability_zone_id)?.code : undefined,
        muted: true,
        responsive: "md",
      }),
      {
        id: "securityGroups",
        accessorFn: (nic: NetworkInterface) => nic.security_group_ids.join(", "),
        header: () => t("networkInterfaces.columns.securityGroups"),
        meta: { responsive: "lg" },
        cell: ({ row }) => {
          const sgs = row.original.security_group_ids
          if (sgs.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          return <span className="font-mono text-[13px] text-foreground">{sgs.join(", ")}</span>
        },
      },
      copyColumn<NetworkInterface>({
        id: "private_ip",
        header: t("networkInterfaces.columns.privateIp"),
        accessor: (nic) => nic.private_ip,
        responsive: "lg",
      }),
      {
        id: "instance",
        accessorFn: (nic: NetworkInterface) => instanceNames.get(nic.instance_id) ?? "",
        header: () => t("networkInterfaces.columns.instance"),
        meta: { interactive: true },
        cell: ({ row }) => {
          const nic = row.original
          if (!nic.instance_id) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <Link
              to={VMS_ROUTES.detail(nic.instance_id)}
              className="font-mono text-[13px] text-status-info hover:underline"
            >
              {instanceNames.get(nic.instance_id) ?? nic.instance_id}
            </Link>
          )
        },
      },
      dateColumn<NetworkInterface>({
        header: t("common.created"),
        accessor: (nic) => nic.created_at,
        responsive: "xl",
      }),
      actionsColumn<NetworkInterface>({
        ariaLabel: t("console.table.actions"),
        actions: (nic) => {
          // Attach applies only to an available NIC; detach only to one
          // already in use. Anything mid-lifecycle (pending/detaching/
          // failed) gets no attach/detach action, just delete.
          const lifecycleActions: RowAction<NetworkInterface>[] = []
          if (nic.status === "available") {
            lifecycleActions.push({
              label: t("networkInterfaces.actions.attach"),
              icon: Link2,
              onAction: (row) => {
                setToAttach(row)
              },
            })
          } else if (nic.status === "in-use") {
            lifecycleActions.push({
              label: t("networkInterfaces.actions.detach"),
              icon: Unlink,
              onAction: (row) => {
                setToDetach(row)
              },
            })
          }
          return [
            ...lifecycleActions,
            {
              label: t("networkInterfaces.actions.delete"),
              icon: Trash2,
              destructive: true,
              onAction: (row) => {
                setToDelete(row)
              },
            },
          ]
        },
      }),
    ],
    [t, vpcNames, subnetNames, instanceNames, navigate, azMap],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={EthernetPort}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("networkInterfaces.title") },
        ]}
        title={t("networkInterfaces.title")}
        description={t("networkInterfaces.subtitle")}
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
              {t("networkInterfaces.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} className="grid-cols-2 lg:grid-cols-3" />

      <ResourceTable<NetworkInterface>
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(nic) => nic.id}
        enableColumnVisibility
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("networkInterfaces.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        emptyState={
          <EmptyState
            icon={EthernetPort}
            title={t("networkInterfaces.empty")}
            description={t("networkInterfaces.emptySubtitle")}
            action={{
              label: t("networkInterfaces.create"),
              onClick: () => {
                setCreateOpen(true)
              },
            }}
          />
        }
      />

      <CreateNetworkInterfaceDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AttachInterfaceDialog
        nic={toAttach}
        onOpenChange={(open) => {
          if (!open) setToAttach(null)
        }}
      />

      <ConfirmDialog
        open={toDetach !== null}
        onOpenChange={(open) => {
          if (!open) setToDetach(null)
        }}
        title={t("networkInterfaces.detachConfirm.title")}
        description={t("networkInterfaces.detachConfirm.description", {
          name: toDetach?.name ?? "",
          instance: instanceNames.get(toDetach?.instance_id ?? "") ?? "",
        })}
        confirmLabel={t("networkInterfaces.actions.detach")}
        destructive={false}
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
        title={t("networkInterfaces.deleteConfirm.title")}
        description={t("networkInterfaces.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("networkInterfaces.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteNic(toDelete.id, {
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
