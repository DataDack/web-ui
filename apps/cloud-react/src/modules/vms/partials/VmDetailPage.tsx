import { useState } from "react"

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TagList,
} from "@datadack/common-ui"
import {
  Activity,
  Cpu,
  HardDrive,
  Info,
  Loader2,
  MoreHorizontal,
  Network,
  Pause,
  Play,
  Radio,
  RotateCw,
  Server,
  Square,
  Terminal as TerminalIcon,
  Trash2,
  Unlink,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  ConfirmDialog,
  DetailPage,
  FadeIn,
  KeyValueGrid,
  MetricChart,
  Section,
  Stagger,
  StaggerItem,
  StatusBadge,
  type KeyValueItem,
} from "@/components/console"
import { parseTags } from "@/lib/tags"
import { cn } from "@/lib/utils"
import { useDetachDisk, useDisks } from "@/modules/disks/disks.hooks"
import { useSSHKeys } from "@/modules/ssh-keys/ssh-keys.hooks"
import { useVPC, useVPCSubnets } from "@/modules/vpc/vpc.hooks"
import { useScreen } from "@/services/api/screen"

import { isVmTransitional, VMS_ROUTES, vmDisplayStatus } from "../vms.constants"
import { InstanceSecurityGroupsSection } from "./InstanceSecurityGroupsSection"
import {
  useDeleteInstance,
  useInstance,
  useInstanceAction,
  useInstanceEvents,
  useInstanceMetrics,
  useUpdateInstance,
} from "../vms.hooks"
import type { Instance } from "../vms.types"

export function VmDetailPage() {
  useScreen("vms.vm-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: instance, isLoading } = useInstance(id)
  const { mutate: runAction, isPending: isActing } = useInstanceAction()
  const { mutate: deleteInstance, isPending: isDeleting } = useDeleteInstance()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading || !instance) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  // While the VM still surfaces as "Provisioning", lifecycle actions
  // (restart/pause/stop) aren't meaningful yet — hide them until it's truly up.
  const isProvisioning = vmDisplayStatus(instance.status) === "provisioning"
  // Any in-flight transition (provisioning/starting/stopping/deleting) locks
  // the action buttons; the status badge carries the spinner and the detail
  // query keeps polling until the backend settles the row.
  const isTransitional = isVmTransitional(instance.status)

  return (
    <>
      <DetailPage
        backTo={VMS_ROUTES.ROOT}
        backLabel={t("vms.title")}
        icon={Server}
        title={instance.name}
        status={vmDisplayStatus(instance.status)}
        id={`VM-${instance.tenant_serial}`}
        actions={
          <>
            {isTransitional && (
              <Button size="sm" className="gap-1.5" disabled>
                <Loader2 className="size-3.5 animate-spin" />
                {t(`status.${vmDisplayStatus(instance.status)}`, {
                  defaultValue: vmDisplayStatus(instance.status),
                })}
              </Button>
            )}
            {instance.status === "stopped" && (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={isActing}
                onClick={() => {
                  runAction({ id: instance.id, action: "start" })
                }}
              >
                {isActing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {t("vms.actions.start")}
              </Button>
            )}
            {instance.status === "running" && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => void navigate(VMS_ROUTES.connect(instance.id))}
              >
                <TerminalIcon className="size-3.5" />
                {t("vms.actions.connect", "Connect")}
              </Button>
            )}
            {instance.status === "paused" && (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={isActing}
                onClick={() => {
                  runAction({ id: instance.id, action: "resume" })
                }}
              >
                <Play className="size-3.5" />
                {t("vms.actions.resume", "Resume")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={isActing || isTransitional}
                  aria-label={t("vms.actions.more", "More actions")}
                >
                  {isActing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {instance.status === "running" && !isProvisioning && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        runAction({ id: instance.id, action: "restart" })
                      }}
                    >
                      <RotateCw className="size-3.5" />
                      {t("vms.actions.restart", "Restart")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        runAction({ id: instance.id, action: "pause" })
                      }}
                    >
                      <Pause className="size-3.5" />
                      {t("vms.actions.pause", "Pause")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        runAction({ id: instance.id, action: "stop" })
                      }}
                    >
                      <Square className="size-3.5" />
                      {t("vms.actions.stop", "Stop")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 className="size-3.5" />
                  {t("vms.actions.terminate", "Terminate")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tabs={[
          {
            value: "overview",
            label: t("vms.tabs.overview"),
            icon: Info,
            content: <OverviewTab instance={instance} />,
          },
          {
            value: "networking",
            label: t("vms.tabs.networking"),
            icon: Network,
            content: <NetworkingTab instance={instance} />,
          },
          {
            value: "disks",
            label: t("vms.tabs.disks"),
            icon: HardDrive,
            content: <DisksTab instance={instance} />,
          },
          {
            value: "activity",
            label: t("vms.tabs.activity"),
            icon: Activity,
            content: <ActivityTab instanceId={instance.id} />,
          },
          {
            value: "monitoring",
            label: t("vms.tabs.monitoring", "Monitoring"),
            icon: Activity,
            content: <MonitoringTab instanceId={instance.id} provisioning={isProvisioning} />,
          },
        ]}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("vms.deleteConfirm.title", { count: 1 })}
        description={
          <>
            {t("vms.deleteConfirm.description", {
              count: 1,
              name: instance.name,
            })}
            {instance.termination_protection && (
              <span className="mt-2 block font-medium text-destructive">
                {t(
                  "vms.deleteConfirm.protectionWarning",
                  "Termination protection is enabled on this instance. Disable it under Overview → Infrastructure Profile, or this request will be rejected.",
                )}
              </span>
            )}
          </>
        }
        confirmLabel={t("vms.actions.terminate", "Terminate")}
        confirmText={instance.name}
        loading={isDeleting}
        onConfirm={() => {
          deleteInstance(instance.id, {
            onSuccess: () => void navigate(VMS_ROUTES.ROOT),
          })
        }}
      />
    </>
  )
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */

function OverviewTab({ instance }: Readonly<{ instance: Instance }>) {
  const { t } = useTranslation()
  const { data: sshKeys = [] } = useSSHKeys()
  const sshKey = sshKeys.find((k) => k.id === instance.ssh_key_id)
  const { mutate: updateInstance, isPending: isUpdating } = useUpdateInstance()
  const [disableProtectionOpen, setDisableProtectionOpen] = useState(false)
  // Termination protection is a pure API-side flag (AWS parity) — editable in
  // any state except terminated, which is terminal.
  const canEdit = instance.status !== "terminated"

  return (
    <div className="space-y-5">
      <Section variant="panel" title={t("vms.detail.configuration")}>
        <KeyValueGrid
          columns={3}
          items={[
            {
              label: t("vms.columns.machineType"),
              value: instance.machine_type,
              mono: true,
            },
            {
              label: t("vms.detail.cpu"),
              value: `${String(instance.cpu_count)} vCPU`,
              mono: true,
            },
            {
              label: t("vms.detail.memory"),
              value: `${String(instance.memory_gb)} GB`,
              mono: true,
            },
            { label: t("vms.detail.os"), value: instance.os, mono: true },
            {
              label: t("vms.detail.sshKey"),
              value: sshKey ? (
                <Link
                  to="/compute/ssh-keys"
                  className="font-mono text-[13px] text-status-info hover:underline"
                >
                  {sshKey.name}
                </Link>
              ) : (
                "—"
              ),
            },
            {
              label: t("vms.columns.zone"),
              value: `${instance.region} / ${instance.zone}`,
              mono: true,
            },
            {
              label: t("common.created"),
              value: new Date(instance.created_at).toLocaleString(),
            },
            {
              label: t("common.updated"),
              value: new Date(instance.updated_at).toLocaleString(),
            },
          ]}
        />
      </Section>

      <Section variant="panel" title="Infrastructure Profile">
        <KeyValueGrid
          columns={3}
          items={[
            {
              label: "Hostname",
              value: instance.hostname ?? instance.name,
              mono: true,
            },
            { label: "Description", value: instance.description ?? "—" },
            { label: "Architecture", value: instance.architecture, mono: true },
            { label: "OS Version", value: instance.os_version, mono: true },
            ...(instance.iam_profile_id
              ? [
                  {
                    label: "IAM Profile ID",
                    value: instance.iam_profile_id,
                    mono: true,
                  },
                ]
              : []),
            {
              label: "Root Disk Size",
              value: `${String(instance.disk_size_gb)} GB`,
              mono: true,
            },
            {
              label: "Termination Protection",
              value: (
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <Switch
                      checked={instance.termination_protection}
                      disabled={isUpdating || !canEdit}
                      onCheckedChange={(checked) => {
                        // Disabling drops the accidental-delete guard —
                        // route through an explicit confirmation.
                        if (!checked) {
                          setDisableProtectionOpen(true)
                          return
                        }
                        updateInstance({
                          id: instance.id,
                          payload: { termination_protection: true },
                        })
                      }}
                      aria-label="Termination Protection"
                    />
                    <span>{instance.termination_protection ? "Enabled" : "Disabled"}</span>
                  </span>
                  {!canEdit && (
                    <span className="text-[11px] text-muted-foreground">
                      {t(
                        "vms.detail.editBlocked",
                        "This setting cannot be changed on a terminated instance.",
                      )}
                    </span>
                  )}
                </span>
              ),
            },
          ]}
        />
      </Section>

      <Section variant="panel" title={t("console.tags.label")}>
        <TagList tags={parseTags(instance.tags)} />
      </Section>

      <ConfirmDialog
        open={disableProtectionOpen}
        onOpenChange={setDisableProtectionOpen}
        title={t("vms.detail.protectionDisableTitle", "Disable termination protection?")}
        description={t(
          "vms.detail.protectionDisableWarning",
          'Without termination protection, "{{name}}" can be permanently terminated — along with its boot disk — by anyone with delete access. Only disable it if you intend to terminate this instance.',
          { name: instance.name },
        )}
        confirmLabel={t("vms.detail.protectionDisableConfirm", "Disable protection")}
        loading={isUpdating}
        onConfirm={() => {
          updateInstance(
            { id: instance.id, payload: { termination_protection: false } },
            {
              onSuccess: () => {
                setDisableProtectionOpen(false)
              },
            },
          )
        }}
      />
    </div>
  )
}

function NetworkingTab({ instance }: Readonly<{ instance: Instance }>) {
  const { t } = useTranslation()
  const inVpc = !!instance.vpc_id
  const { data: vpc } = useVPC(instance.vpc_id)
  const { data: subnets = [] } = useVPCSubnets(instance.vpc_id)
  const subnet = subnets.find((s) => s.id === instance.subnet_id)

  // Build the field list to match how the instance is actually wired: a VPS is
  // internet-facing with no VPC/subnet, so those rows would only ever read "—".
  const items: KeyValueItem[] = [
    {
      label: t("vms.detail.networkType"),
      value: inVpc ? t("vms.detail.networkVpc") : t("vms.detail.networkVps"),
    },
  ]

  if (instance.public_ip_type !== "none") {
    const pendingIp =
      !instance.public_ip && instance.status === "pending"
        ? t("vms.detail.publicIpPending")
        : undefined
    items.push(
      {
        label: t("vms.detail.publicIp"),
        value: instance.public_ip || pendingIp,
        copyable: !!instance.public_ip,
        mono: !!instance.public_ip,
      },
      {
        label: t("vms.detail.publicIpType"),
        value:
          instance.public_ip_type === "static"
            ? t("vms.detail.publicIpStatic")
            : t("vms.detail.publicIpDynamic"),
      },
    )
  }

  items.push({
    label: t("vms.detail.privateIp"),
    value: instance.private_ip || undefined,
    copyable: !!instance.private_ip,
    mono: true,
  })

  if (inVpc) {
    items.push(
      {
        label: t("vms.detail.vpc"),
        value: vpc ? (
          <Link to="/networking" className="font-mono text-[13px] text-status-info hover:underline">
            {vpc.name}
          </Link>
        ) : (
          instance.vpc_id
        ),
      },
      {
        label: t("vms.detail.subnet"),
        value: subnet ? `${subnet.name} (${subnet.cidr})` : instance.subnet_id,
        mono: true,
      },
    )
  }

  return (
    <div className="space-y-5">
      <Section variant="panel" title={t("vms.tabs.networking")}>
        <KeyValueGrid columns={2} items={items} />
      </Section>
      <InstanceSecurityGroupsSection instanceId={instance.id} />
    </div>
  )
}

function DisksTab({ instance }: Readonly<{ instance: Instance }>) {
  const { t } = useTranslation()
  const { data: disks = [] } = useDisks()
  const { mutate: detachDisk } = useDetachDisk()
  // Boot disk first, then by name; the boot volume can't be detached while the
  // instance is running (matches the backend guard).
  const attached = disks
    .filter((disk) => disk.instance_id === instance.id)
    .sort((a, b) => Number(b.is_boot) - Number(a.is_boot) || a.name.localeCompare(b.name))
  const instanceActive = instance.status === "running"

  return (
    <Section
      variant="panel"
      title={t("vms.tabs.disks")}
      description={t("vms.detail.disksDescription")}
    >
      <div className="glass-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {[
                t("vms.columns.name"),
                t("vms.detail.diskType"),
                t("vms.detail.diskSize"),
                t("vms.columns.status"),
                "",
              ].map((header) => (
                <TableHead
                  key={`index-${header}`}
                  className="px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attached.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  {t("vms.detail.disksEmpty")}
                </TableCell>
              </TableRow>
            )}
            {attached.map((disk) => {
              const detachBlocked = disk.is_boot && instanceActive
              return (
                <TableRow key={disk.id}>
                  <TableCell className="px-3 font-mono text-[13px] font-medium">
                    <span className="flex items-center gap-2">
                      {disk.name}
                      {disk.is_boot && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {t("vms.detail.bootDisk")}
                        </Badge>
                      )}
                    </span>
                    {disk.device_name && (
                      <span className="text-[11px] text-muted-foreground">{disk.device_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 text-sm text-muted-foreground">
                    {t("disks.title")} · {disk.disk_type.toUpperCase()}
                  </TableCell>
                  <TableCell className="px-3 font-mono text-[13px]">{disk.size_gb} GB</TableCell>
                  <TableCell className="px-3">
                    <StatusBadge status={disk.status} />
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={detachBlocked}
                      title={detachBlocked ? t("vms.detail.bootDetachBlocked") : undefined}
                      className="h-7 gap-1.5 text-muted-foreground"
                      onClick={() => {
                        detachDisk(disk.id)
                      }}
                    >
                      <Unlink className="size-3" />
                      {t("disks.actions.detach")}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground flex items-center gap-1.5">
        <Cpu className="size-3.5" />
        {t("vms.detail.disksHint")}
      </p>
    </Section>
  )
}

/** Timeline dot color by event status (running pulses). */
function eventDotClass(status: string): string {
  if (status === "error") return "bg-status-danger"
  if (status === "running") return "bg-status-info animate-pulse"
  return "bg-status-success"
}

/** Compact human duration for a Proxmox task (e.g. "820ms", "3.4s", "2m 5s"). */
function formatEventDuration(ms: number): string {
  if (ms < 1000) return `${String(ms)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`
  const m = Math.floor(s / 60)
  return `${String(m)}m ${String(Math.round(s % 60))}s`
}

function ActivityTab({ instanceId }: Readonly<{ instanceId: string }>) {
  const { t } = useTranslation()
  const { data: events = [], isLoading } = useInstanceEvents(instanceId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-12 rounded-lg" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return <EmptyState icon={Activity} title={t("vms.detail.noActivity")} />
  }

  return (
    <FadeIn>
      <Stagger className="relative space-y-0 pl-5 before:absolute before:left-1.75 before:top-2 before:bottom-2 before:w-px before:bg-border-glass">
        {events.map((event) => (
          <StaggerItem key={event.id} className="relative pb-5 last:pb-0">
            <span
              className={`absolute -left-5 top-1.5 size-1.75 rounded-full ${eventDotClass(event.status)}`}
            />
            <div className="flex items-center gap-2">
              <p className="font-mono text-[13px] text-foreground">{event.action}</p>
              {event.status === "running" && (
                <span className="text-[11px] text-status-info">
                  {t("vms.activities.running", "running")}
                </span>
              )}
              {event.status === "error" && (
                <span className="text-[11px] text-status-danger">
                  {t("vms.activities.failed", "failed")}
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {event.actor} · {new Date(event.started_at || event.created_at).toLocaleString()}
              {typeof event.duration_ms === "number" && event.duration_ms > 0
                ? ` · ${formatEventDuration(event.duration_ms)}`
                : ""}
            </p>
            {event.status === "error" && event.detail && (
              <p className="mt-1 rounded-md bg-status-danger/10 px-2 py-1 font-mono text-[11px] text-status-danger">
                {event.detail}
              </p>
            )}
          </StaggerItem>
        ))}
      </Stagger>
    </FadeIn>
  )
}

// Selectable monitoring windows. `value` is the API/Proxmox timeframe; `ago`
// labels the left edge of each chart's time axis.
const METRIC_RANGES = [
  { value: "hour", label: "1h", ago: "1h ago" },
  { value: "day", label: "24h", ago: "24h ago" },
  { value: "week", label: "7d", ago: "7d ago" },
  { value: "month", label: "30d", ago: "30d ago" },
] as const

function MonitoringTab({
  instanceId,
  provisioning = false,
}: Readonly<{ instanceId: string; provisioning?: boolean }>) {
  const { t } = useTranslation()
  const [range, setRange] = useState<string>("hour")
  // While the VM is still provisioning there are no guest metrics to poll, so
  // skip the request entirely and render disabled chart placeholders instead.
  const { data, isLoading } = useInstanceMetrics(instanceId, range, {
    enabled: !provisioning,
  })

  const points = data?.points ?? []
  const cpu = points.map((p) => p.cpu)
  const mem = points.map((p) => p.mem)
  const disk = points.map((p) => p.disk)
  const io = points.map((p) => p.io)
  const net = points.map((p) => p.net)
  const cpuPsiSome = points.map((p) => p.cpu_psi_some)
  const cpuPsiFull = points.map((p) => p.cpu_psi_full)
  const ioPsiSome = points.map((p) => p.io_psi_some)
  const ioPsiFull = points.map((p) => p.io_psi_full)
  const memPsiSome = points.map((p) => p.mem_psi_some)
  const memPsiFull = points.map((p) => p.mem_psi_full)
  const ready = !isLoading && points.length >= 2
  const agoLabel = METRIC_RANGES.find((r) => r.value === range)?.ago ?? "24h ago"

  return (
    <FadeIn>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {provisioning ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>
                {t("vms.monitoring.provisioning", "Metrics available once provisioning completes")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12px]">
              <Radio className="size-3.5 text-status-success" />
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-success/70" />
                <span className="relative inline-flex size-2 rounded-full bg-status-success" />
              </span>
              <span className="text-foreground">{t("vms.monitoring.live", "Live")}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {data?.source === "proxmox"
                  ? t("vms.monitoring.sourceProxmox", "Proxmox")
                  : t("vms.monitoring.sourceSimulated", "Simulated")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-0.5 rounded-lg border border-border-glass p-0.5">
            {METRIC_RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setRange(r.value)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  range === r.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <MetricPanel
          title={t("vms.monitoring.cpu", "CPU Utilization (%)")}
          data={cpu}
          color="rgb(34,197,94)"
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
        <MetricPanel
          title={t("vms.monitoring.memory", "Memory Usage (%)")}
          data={mem}
          color="rgb(99,102,241)"
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
        <MetricPanel
          title={t("vms.monitoring.disk", "Disk Usage (%)")}
          data={disk}
          color="rgb(234,179,8)"
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
        <MetricPanel
          title={t("vms.monitoring.io", "Disk I/O (MB/s)")}
          data={io}
          color="rgb(244,114,182)"
          unit=" MB/s"
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
        <MetricPanel
          title={t("vms.monitoring.network", "Network (MB/s)")}
          data={net}
          color="rgb(56,189,248)"
          unit=" MB/s"
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
        <PressurePanel
          title={t("vms.monitoring.cpuPressure", "CPU Pressure Stall (%)")}
          some={cpuPsiSome}
          full={cpuPsiFull}
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
        <PressurePanel
          title={t("vms.monitoring.ioPressure", "IO Pressure Stall (%)")}
          some={ioPsiSome}
          full={ioPsiFull}
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
        <PressurePanel
          title={t("vms.monitoring.memoryPressure", "Memory Pressure Stall (%)")}
          some={memPsiSome}
          full={memPsiFull}
          ready={ready}
          provisioning={provisioning}
          agoLabel={agoLabel}
        />
      </div>
    </FadeIn>
  )
}

/**
 * ChartDisabledOverlay renders a shaded, disabled-looking placeholder in place
 * of a metric chart while the VM is still provisioning (no guest metrics yet).
 * The `height` matches the real chart so the panel layout stays stable.
 */
function ChartDisabledOverlay({
  height = 160,
  label,
}: Readonly<{ height?: number; label: string }>) {
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-lg border border-border-glass bg-muted/20"
      style={{ height }}
    >
      {/* Diagonal hatch shading to read as "disabled". */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, color-mix(in srgb, var(--muted-foreground) 12%, transparent) 0, color-mix(in srgb, var(--muted-foreground) 12%, transparent) 1px, transparent 1px, transparent 8px)",
        }}
      />
      <div className="relative flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  )
}

function MetricPanel({
  title,
  data,
  color,
  ready,
  provisioning = false,
  unit = "%",
  agoLabel = "24h ago",
}: Readonly<{
  title: string
  data: number[]
  color: string
  ready: boolean
  /** While true the chart is replaced by a disabled placeholder (VM provisioning). */
  provisioning?: boolean
  /** Value suffix and axis mode. "%" locks the 0..100 domain; anything else auto-scales. */
  unit?: string
  /** Label for the left (oldest) edge of the time axis. */
  agoLabel?: string
}>) {
  const { t } = useTranslation()
  const current = data.length > 0 ? data[data.length - 1] : 0
  const peak = data.length > 0 ? Math.max(...data) : 0
  const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0
  const isPercent = unit === "%"

  if (provisioning) {
    return (
      <Section variant="panel" title={title}>
        <div className="space-y-3">
          <p className="font-mono text-3xl font-semibold tabular-nums text-muted-foreground/50">
            —
          </p>
          <ChartDisabledOverlay
            label={t("vms.monitoring.provisioningShort", "Available after provisioning")}
          />
        </div>
      </Section>
    )
  }

  return (
    <Section variant="panel" title={title}>
      {ready ? (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                {current.toFixed(1)}
                {unit}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                peak {peak.toFixed(1)}
                {unit} · avg {avg.toFixed(1)}
                {unit}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <MetricChart
              data={data}
              color={color}
              unit={isPercent ? "%" : ""}
              min={isPercent ? 0 : undefined}
              max={isPercent ? 100 : undefined}
              height={160}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2 border-t border-border-glass pt-2">
            <span>{agoLabel}</span>
            <span>Now</span>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      )}
    </Section>
  )
}

// Pressure-stall (PSI) colours, matching the Proxmox summary legend.
const PSI_SOME_COLOR = "rgb(234,179,8)" // amber — at least one task delayed
const PSI_FULL_COLOR = "rgb(239,68,68)" // red — full starvation

// PressurePanel renders a paired PSI series — "Some" (at least one task stalled)
// and "Full" (every task stalled) — on a shared, auto-scaled Y-domain. Pressure
// values sit near zero on a healthy host, so the domain is NOT locked to 0..100
// (that would flatten the line); we auto-scale and label the headline off "Some".
function PressurePanel({
  title,
  some,
  full,
  ready,
  provisioning = false,
  agoLabel = "24h ago",
}: Readonly<{
  title: string
  some: number[]
  full: number[]
  ready: boolean
  /** While true the chart is replaced by a disabled placeholder (VM provisioning). */
  provisioning?: boolean
  agoLabel?: string
}>) {
  const { t } = useTranslation()
  const current = some.length > 0 ? some[some.length - 1] : 0
  const peak = some.length > 0 ? Math.max(...some) : 0

  if (provisioning) {
    return (
      <Section variant="panel" title={title}>
        <div className="space-y-3">
          <p className="font-mono text-3xl font-semibold tabular-nums text-muted-foreground/50">
            —
          </p>
          <ChartDisabledOverlay
            label={t("vms.monitoring.provisioningShort", "Available after provisioning")}
          />
        </div>
      </Section>
    )
  }

  return (
    <Section variant="panel" title={title}>
      {ready ? (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                {current.toFixed(2)}%
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                some · peak {peak.toFixed(2)}%
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: PSI_SOME_COLOR }} />
                Some
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: PSI_FULL_COLOR }} />
                Full
              </span>
            </div>
          </div>
          <div className="mt-3">
            <MetricChart
              data={some}
              color={PSI_SOME_COLOR}
              unit="%"
              min={0}
              overlay={{ data: full, color: PSI_FULL_COLOR }}
              height={160}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2 border-t border-border-glass pt-2">
            <span>{agoLabel}</span>
            <span>Now</span>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      )}
    </Section>
  )
}
