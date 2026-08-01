import { useMemo, useState } from "react"

import { Skeleton } fro@DataDack/ck/common-ui"
import { ArrowRight, Ear, @DataDack/h2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ConfirmDialog, EmptyState, Section, staggerDelay } from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  const { data: listeners = [], isLoading } = useLBListeners(lb.id)
  const { data: groups = [] } = useTargetGroups()
  const { mutate: remove, isPending: isDeleting } = useDeleteListener(lb.id)

  const [addOpen, setAddOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<LBListener | null>(null)

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />

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
        {listeners.length === 0 ? (
          <EmptyState
            icon={Ear}
            title={t("loadBalancers.listeners.empty")}
            description={t("loadBalancers.listeners.emptySubtitle")}
          />
        ) : (
          <div className="glass-1 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {[
                    t("loadBalancers.listeners.protocol"),
                    t("loadBalancers.listeners.port"),
                    t("loadBalancers.listeners.targetGroup"),
                    "",
                  ].map((header, i) => (
                    <TableHead
                      key={header || `actions-${String(i)}`}
                      className="px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {listeners.map((listener, index) => (
                  <TableRow
                    key={listener.id}
                    className="animate-content-enter"
                    style={staggerDelay(index)}
                  >
                    <TableCell className="px-3 font-mono text-[13px]">
                      {listener.protocol}
                    </TableCell>
                    <TableCell className="px-3 font-mono text-[13px]">{listener.port}</TableCell>
                    <TableCell className="px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <Link
                          to={TG_ROUTES.detail(listener.default_target_group_id)}
                          className="font-mono text-[13px] text-status-info hover:underline"
                        >
                          {groupName(listener.default_target_group_id)}
                        </Link>
                      </span>
                    </TableCell>
                    <TableCell className="px-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("loadBalancers.listeners.remove")}
                        onClick={() => {
                          setPendingDelete(listener)
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
