import { useMemo, useState } from "react"

import {
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
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
  textColumn,
  type DataTableColumnMeta,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowRight, Ear, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ConfirmDialog, Section } from "@/components/console"
import { TG_ROUTES } from "@/modules/target-groups/target-groups.constants"
import { useTargetGroups } from "@/modules/target-groups/target-groups.hooks"

import {
  useCreateListener,
  useDeleteListener,
  useLBListeners,
  useLBSubnets,
} from "../load-balancers.hooks"
import {
  PROTOCOLS_BY_LB_TYPE,
  type LBListener,
  type ListenerProtocol,
  type LoadBalancer,
} from "../load-balancers.types"

export function ListenersTab({ lb }: Readonly<{ lb: LoadBalancer }>) {
  const { t } = useTranslation()
  const {
    data: listeners = [],
    isLoading,
    isError: listenersError,
    refetch: refetchListeners,
  } = useLBListeners(lb.id)
  const { data: groups = [] } = useTargetGroups()
  const { mutate: remove, isPending: isDeleting } = useDeleteListener(lb.id)

  const [addOpen, setAddOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<LBListener | null>(null)

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id

  const columns = useMemo<ColumnDef<LBListener>[]>(
    () => [
      textColumn({
        id: "protocol",
        header: t("loadBalancers.listeners.protocol"),
        accessor: (listener) => listener.protocol,
        mono: true,
      }),
      textColumn({
        id: "port",
        header: t("loadBalancers.listeners.port"),
        accessor: (listener) => listener.port,
        mono: true,
      }),
      {
        id: "targetGroup",
        header: t("loadBalancers.listeners.targetGroup"),
        // Holds a link out to the target group.
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <ArrowRight className="size-3 text-muted-foreground" />
            <Link
              to={TG_ROUTES.detail(row.original.default_target_group_id)}
              className="font-mono text-[13px] text-status-info hover:underline"
            >
              {groupName(row.original.default_target_group_id)}
            </Link>
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("loadBalancers.listeners.remove")}
              onClick={() => {
                setPendingDelete(row.original)
              }}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    // groupName closes over `groups`, so the identity of that list is the dep.
    [groups, t],
  )

  return (
    <>
      <Section
        variant="panel"
        title={t("loadBalancers.tabs.listeners")}
        description={t("loadBalancers.listeners.description")}
        actions={
          <Button
            size="sm"
            variant="gold"
            className="gap-1.5"
            onClick={() => {
              setAddOpen(true)
            }}
          >
            <Plus className="size-3.5" />
            {t("loadBalancers.listeners.add")}
          </Button>
        }
      >
        <DataTable<LBListener>
          data={listeners}
          columns={columns}
          getRowId={(listener) => listener.id}
          empty={
            <EmptyState
              icon={Ear}
              title={t("loadBalancers.listeners.empty")}
              description={t("loadBalancers.listeners.emptySubtitle")}
            />
          }
          error={listenersError ? t("console.table.error") : undefined}
          onRetry={() => void refetchListeners()}
          retryLabel={t("console.table.retry")}
                  loading={isLoading}
/>
      </Section>

      <AddListenerDialog lb={lb} open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={t("loadBalancers.listeners.deleteConfirm.title")}
        description={t("loadBalancers.listeners.deleteConfirm.description", {
          port: pendingDelete?.port ?? "",
        })}
        confirmLabel={t("loadBalancers.listeners.remove")}
        loading={isDeleting}
        onConfirm={() => {
          if (pendingDelete) {
            remove(pendingDelete.id, {
              onSuccess: () => {
                setPendingDelete(null)
              },
            })
          }
        }}
      />
    </>
  )
}

function AddListenerDialog({
  lb,
  open,
  onOpenChange,
}: Readonly<{ lb: LoadBalancer; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { data: groups = [] } = useTargetGroups()
  const { data: lbSubnets = [] } = useLBSubnets(lb.id)
  const { mutate: create, isPending } = useCreateListener(lb.id)

  // An application load balancer is HAProxy in `mode http`, a network one in
  // `mode tcp`. The backend rejects a listener whose protocol contradicts the
  // type, so only the legal set is ever offered.
  //
  // HTTPS/TLS is absent everywhere: there is no certificate store in the
  // platform, so the backend refuses it outright.
  const protocols = useMemo(() => PROTOCOLS_BY_LB_TYPE[lb.type], [lb.type])

  const [protocol, setProtocol] = useState<ListenerProtocol>(protocols[0])
  const [port, setPort] = useState("")
  const [targetGroupId, setTargetGroupId] = useState("")

  // A target group is only usable if it lives in a VPC the load balancer is
  // attached to — it reaches targets over that VPC's private network. A Gen-3
  // LB can span multiple subnets/VPCs, so match against every attached VPC
  // (from vm_lb_subnets), not just the legacy primary lb.vpc_id.
  const lbVpcIds = new Set<string>([lb.vpc_id, ...lbSubnets.map((s) => s.vpc_id)])
  const eligible = groups.filter((g) => lbVpcIds.has(g.vpc_id))

  const portNum = Number(port)
  const valid = !!targetGroupId && Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535

  const reset = () => {
    setProtocol(protocols[0])
    setPort("")
    setTargetGroupId("")
  }

  const submit = () => {
    create(
      { protocol, port: portNum, default_target_group_id: targetGroupId },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("loadBalancers.listeners.add")}</DialogTitle>
          <DialogDescription>{t("loadBalancers.listeners.addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("loadBalancers.listeners.protocol")}
            </Label>
            <Select
              value={protocol}
              onValueChange={(v) => {
                setProtocol(v as ListenerProtocol)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {protocols.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t("loadBalancers.listeners.protocolHint", {
                type: t(`loadBalancers.types.${lb.type}`),
              })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("loadBalancers.listeners.port")}
            </Label>
            <Input
              value={port}
              onChange={(e) => {
                setPort(e.target.value)
              }}
              inputMode="numeric"
              placeholder="80"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("loadBalancers.listeners.targetGroup")}
            </Label>
            <Select value={targetGroupId} onValueChange={setTargetGroupId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("loadBalancers.listeners.targetGroupPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} · {g.protocol}:{String(g.port)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eligible.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.listeners.noTargetGroups")}{" "}
                <Link to={TG_ROUTES.CREATE} className="text-status-info hover:underline">
                  {t("targetGroups.actions.create")}
                </Link>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("console.wizard.cancel")}
          </Button>
          <Button variant="gold" disabled={!valid || isPending} onClick={submit}>
            {isPending ? t("loadBalancers.listeners.adding") : t("loadBalancers.listeners.add")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
