import { useState } from "react"

import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@datadack/common-ui"
import { AlertTriangle, Boxes, Crosshair, Ear, Info, Layers, Network, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  ConfirmDialog,
  CopyButton,
  DetailPage,
  EmptyState,
  KeyValueGrid,
  Section,
  staggerDelay,
  StatusBadge,
  TagList,
} from "@/components/console"
import { parseTags } from "@/lib/tags"
import { TargetGroupsPanel } from "@/modules/target-groups/partials/TargetGroupsPanel"
import { TG_ROUTES } from "@/modules/target-groups/target-groups.constants"
import { useTargetGroups, useTargets } from "@/modules/target-groups/target-groups.hooks"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useAllSubnets, useVPC, useVPCs } from "@/modules/vpc/vpc.hooks"
import { useScreen } from "@/services/api/screen"

import { isLbTransitional, LB_ROUTES } from "../load-balancers.constants"
import {
  useDeleteLoadBalancer,
  useLBListeners,
  useLBSubnets,
  useLoadBalancer,
} from "../load-balancers.hooks"
import type { LoadBalancer } from "../load-balancers.types"
import { ListenersTab } from "./ListenersTab"

export function LoadBalancerDetailPage() {
  useScreen("load-balancers.load-balancer-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: lb, isLoading } = useLoadBalancer(id)
  const { mutate: deleteLB, isPending: isDeleting } = useDeleteLoadBalancer()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading || !lb) {
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
        backTo={LB_ROUTES.ROOT}
        backLabel={t("loadBalancers.title")}
        icon={Layers}
        title={lb.name}
        status={lb.status}
        id={`LB-${String(lb.tenant_serial)}`}
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
            {t("loadBalancers.actions.delete")}
          </Button>
        }
        tabs={[
          {
            value: "overview",
            label: t("vms.tabs.overview"),
            icon: Info,
            content: <OverviewTab lb={lb} />,
          },
          {
            value: "listeners",
            label: t("loadBalancers.tabs.listeners"),
            icon: Ear,
            content: <ListenersTab lb={lb} />,
          },
          {
            value: "targets",
            label: t("loadBalancers.tabs.targets"),
            icon: Crosshair,
            content: <TargetsTab lb={lb} />,
          },
          {
            value: "target-groups",
            label: t("loadBalancers.tabs.targetGroups"),
            icon: Boxes,
            content: <TargetGroupsPanel />,
          },
        ]}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("loadBalancers.deleteConfirm.title")}
        description={t("loadBalancers.deleteConfirm.description", { name: lb.name })}
        confirmLabel={t("loadBalancers.actions.delete")}
        confirmText={lb.name}
        loading={isDeleting}
        onConfirm={() => {
          deleteLB(lb.id, {
            onSuccess: () => void navigate(LB_ROUTES.ROOT),
          })
        }}
      />
    </>
  )
}

function OverviewTab({ lb }: Readonly<{ lb: LoadBalancer }>) {
  const { t } = useTranslation()
  const { data: vpc } = useVPC(lb.vpc_id)

  return (
    <div className="space-y-5">
      {/* A failed load balancer knows exactly why it failed. Say so here,
                rather than leaving a red badge and no explanation. */}
      {lb.status === "failed" && lb.provision_error && (
        <Section variant="panel" title={t("loadBalancers.detail.provisionFailed")}>
          <div className="flex items-start gap-2.5 text-[13px]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="font-mono text-[12px] leading-relaxed text-muted-foreground">
              {lb.provision_error}
            </p>
          </div>
        </Section>
      )}

      <Section variant="panel" title={t("vms.detail.configuration")}>
        <KeyValueGrid
          columns={3}
          items={[
            {
              label: t("loadBalancers.columns.type"),
              value: t(`loadBalancers.types.${lb.type}`),
            },
            {
              label: t("loadBalancers.columns.scheme"),
              value: t(`loadBalancers.schemes.${lb.scheme}`),
            },
            {
              label: t("vms.detail.vpc"),
              value: vpc ? (
                <Link
                  to={`/networking/${lb.vpc_id}`}
                  className="font-mono text-[13px] text-status-info hover:underline"
                >
                  {vpc.name}
                </Link>
              ) : (
                lb.vpc_id
              ),
            },
            {
              label: t("loadBalancers.detail.dnsName"),
              value: lb.dns_name ? (
                <CopyButton value={lb.dns_name} />
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
            },
            {
              label: t("loadBalancers.detail.publicIp"),
              value: lb.public_ip ? (
                <CopyButton value={lb.public_ip} />
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
            },
            {
              label: t("loadBalancers.detail.privateIp"),
              value: lb.private_ip || "—",
              mono: true,
            },
            {
              label: t("common.created"),
              value: new Date(lb.created_at).toLocaleString(),
            },
          ]}
        />
      </Section>

      <NetworksSection lb={lb} />

      <Section variant="panel" title={t("console.tags.label")}>
        <TagList tags={parseTags(lb.tags)} />
      </Section>
    </div>
  )
}

/**
 * Every subnet the load balancer is attached to, with its per-subnet private
 * IP. A load balancer can span N subnets across any VPCs — one NIC + IP each —
 * so this reflects the `vm_lb_subnets` rows rather than the single legacy
 * private IP shown in the configuration grid.
 *
 * Private IPs are assigned by Proxmox during provisioning, so the query keeps
 * polling (matching the LB row's transitional cadence) until they settle.
 */
function NetworksSection({ lb }: Readonly<{ lb: LoadBalancer }>) {
  const { t } = useTranslation()
  const { data: subnets = [], isLoading } = useLBSubnets(lb.id, isLbTransitional(lb.status))
  const { data: vpcs = [] } = useVPCs()
  const { data: allSubnets = [] } = useAllSubnets()

  const vpcName = (id: string) => vpcs.find((v) => v.id === id)?.name ?? id
  const subnetLabel = (id: string) => {
    const s = allSubnets.find((sn) => sn.id === id)
    return s ? `${s.name} (${s.cidr})` : id
  }

  let content
  if (isLoading) {
    content = <Skeleton className="h-32 rounded-xl" />
  } else if (subnets.length === 0) {
    content = (
      <EmptyState
        icon={Network}
        title={t("loadBalancers.detail.noNetworks")}
        description={t("loadBalancers.detail.noNetworksSubtitle")}
      />
    )
  } else {
    content = (
      <div className="glass-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {[
                t("loadBalancers.detail.nic"),
                t("vms.detail.vpc"),
                t("loadBalancers.wizard.subnet"),
                t("loadBalancers.detail.privateIp"),
              ].map((header) => (
                <TableHead
                  key={header}
                  className="px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...subnets]
              .sort((a, b) => a.nic_index - b.nic_index)
              .map((s, index) => (
                <TableRow key={s.id} className="animate-content-enter" style={staggerDelay(index)}>
                  <TableCell className="px-3 font-mono text-[13px]">eth{s.nic_index}</TableCell>
                  <TableCell className="px-3">
                    <Link
                      to={`/networking/${s.vpc_id}`}
                      className="font-mono text-[13px] text-status-info hover:underline"
                    >
                      {vpcName(s.vpc_id)}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 font-mono text-[13px]">
                    {subnetLabel(s.subnet_id)}
                  </TableCell>
                  <TableCell className="px-3">
                    {s.private_ip ? (
                      <CopyButton value={s.private_ip} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <Section
      variant="panel"
      title={t("loadBalancers.detail.networks")}
      description={t("loadBalancers.detail.networksDescription")}
    >
      {content}
    </Section>
  )
}

/**
 * Targets, reached through the load balancer's listeners.
 *
 * A load balancer does not own targets — its listeners point at target groups,
 * and those groups hold the targets. So this tab shows the union of the targets
 * behind every listener, grouped by the target group they belong to, and links
 * out to the group for editing. That mirrors the data model instead of
 * pretending the LB owns them.
 */
function TargetsTab({ lb }: Readonly<{ lb: LoadBalancer }>) {
  const { t } = useTranslation()
  const { data: listeners = [], isLoading } = useLBListeners(lb.id)

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />

  const groupIds = [...new Set(listeners.map((l) => l.default_target_group_id))]

  if (groupIds.length === 0) {
    return (
      <EmptyState
        icon={Crosshair}
        title={t("loadBalancers.targets.empty")}
        description={t("loadBalancers.targets.emptySubtitle")}
      />
    )
  }

  return (
    <div className="space-y-5">
      {groupIds.map((groupId) => (
        <TargetGroupTargets key={groupId} groupId={groupId} />
      ))}
    </div>
  )
}

function TargetGroupTargets({ groupId }: Readonly<{ groupId: string }>) {
  const { t } = useTranslation()
  const { data: groups = [] } = useTargetGroups()
  const { data: targets = [], isLoading } = useTargets(groupId)
  const { data: instances = [] } = useInstances()

  const group = groups.find((g) => g.id === groupId)

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />

  return (
    <Section
      variant="panel"
      title={group?.name ?? groupId}
      description={t("loadBalancers.targets.description")}
      actions={
        <Link
          to={TG_ROUTES.detail(groupId)}
          className="text-[12px] text-status-info hover:underline"
        >
          {t("loadBalancers.targets.manage")}
        </Link>
      }
    >
      {targets.length === 0 ? (
        <EmptyState
          icon={Crosshair}
          title={t("targetGroups.targets.empty")}
          description={t("targetGroups.targets.emptySubtitle")}
        />
      ) : (
        <div className="glass-1 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {[
                  t("loadBalancers.targets.instance"),
                  t("loadBalancers.targets.port"),
                  t("loadBalancers.targets.health"),
                ].map((header) => (
                  <TableHead
                    key={header}
                    className="px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target, index) => {
                const instance = instances.find((i) => i.id === target.instance_id)
                return (
                  <TableRow
                    key={target.id}
                    className="animate-content-enter"
                    style={staggerDelay(index)}
                  >
                    <TableCell className="px-3">
                      {instance ? (
                        <Link
                          to={VMS_ROUTES.detail(instance.id)}
                          className="font-mono text-[13px] text-status-info hover:underline"
                        >
                          {instance.name}
                        </Link>
                      ) : (
                        <CopyButton value={target.instance_id} />
                      )}
                    </TableCell>
                    <TableCell className="px-3 font-mono text-[13px]">{target.port}</TableCell>
                    <TableCell className="px-3">
                      <StatusBadge
                        status={target.health_status}
                        pulse={target.health_status === "healthy"}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  )
}
