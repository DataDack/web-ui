import { useCallback, useMemo, useState } from "react"

import { Switch } from "@datadack/common-ui"
import { Badge } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { BellRing, Plus, RefreshCw, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  actionsColumn,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  ResourceTable,
} from "@/components/console"
import { Button } from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { useScreen } from "@/services/api/screen"

import {
  useChannels,
  useDeleteChannel,
  useTestSavedChannel,
  useUpdateChannel,
} from "../monitoring.hooks"
import { timeAgo } from "../monitoring.meta"
import type { ChannelResponse } from "../monitoring.types"
import { ChannelCreateDialog } from "./ChannelCreateDialog"
import { SEVERITY_BADGE_CLASS, TYPE_META } from "./channels.meta"

const CHIP_CLASS =
  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
const MONO_MUTED = "font-mono text-[12px] text-muted-foreground"

/**
 * The backend writes "sent" on success and "failed: <error>" otherwise, so the
 * status string carries the reason a delivery bounced.
 */
function describeDelivery(channel: ChannelResponse): {
  delivered: boolean
  error?: string
} {
  const status = channel.last_delivery_status.trim()
  if (status === "" || status === "sent" || status === "ok") return { delivered: true }
  const error = status.replace(/^failed:\s*/i, "")
  return { delivered: false, error: error === "" ? undefined : error }
}

function DeliveryCell({ channel }: Readonly<{ channel: ChannelResponse }>) {
  if (!channel.last_delivery_at) {
    return <span className={MONO_MUTED}>never sent</span>
  }
  const { delivered, error } = describeDelivery(channel)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            CHIP_CLASS,
            delivered
              ? "border-status-success/25 bg-status-success-bg text-status-success"
              : "border-status-danger/30 bg-status-danger-bg text-status-danger",
          )}
        >
          {delivered ? "delivered" : "failed"}
        </span>
        <span className={MONO_MUTED}>{timeAgo(channel.last_delivery_at)}</span>
      </div>
      {error && (
        <span
          title={error}
          className="max-w-[22rem] truncate font-mono text-[11px] text-status-danger"
        >
          {error}
        </span>
      )}
    </div>
  )
}

function NameCell({ channel }: Readonly<{ channel: ChannelResponse }>) {
  const meta = TYPE_META[channel.type]
  const TypeIcon = meta.icon
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span
        className={cn(
          "truncate text-[14px] leading-tight font-semibold text-foreground",
          !channel.enabled && "text-muted-foreground",
        )}
      >
        {channel.name}
      </span>
      <Badge variant="outline" className={cn("w-fit gap-1 font-mono text-[10px]", meta.badgeClass)}>
        <TypeIcon className="size-3" />
        {meta.label}
      </Badge>
    </div>
  )
}

function EnabledCell({
  channel,
  busy,
  onToggle,
}: Readonly<{
  channel: ChannelResponse
  busy: boolean
  onToggle: (channel: ChannelResponse, enabled: boolean) => void
}>) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={channel.enabled}
        disabled={busy}
        onCheckedChange={(checked) => {
          onToggle(channel, checked)
        }}
        aria-label={
          channel.enabled ? `Stop sending to ${channel.name}` : `Start sending to ${channel.name}`
        }
      />
      <span className={MONO_MUTED}>{channel.enabled ? "on" : "off"}</span>
    </div>
  )
}

export function ChannelsPage() {
  useScreen("monitoring.channels")
  const { data: channels = [], isLoading, isError, refetch, isFetching } = useChannels()
  const updateChannel = useUpdateChannel()
  const deleteChannel = useDeleteChannel()
  const testSavedChannel = useTestSavedChannel()

  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ChannelResponse | null>(null)

  const togglingId = updateChannel.isPending ? updateChannel.variables.id : null
  const { mutate: mutateUpdate } = updateChannel
  const { mutate: mutateTest } = testSavedChannel

  const toggleEnabled = useCallback(
    (channel: ChannelResponse, enabled: boolean) => {
      mutateUpdate({ id: channel.id, payload: { enabled } })
    },
    [mutateUpdate],
  )

  const sendSavedTest = useCallback(
    (channel: ChannelResponse) => {
      mutateTest(
        { id: channel.id },
        {
          onSuccess: (testResult) => {
            if (!testResult.delivered) {
              toast.error(testResult.error ?? `Test to "${channel.name}" was not delivered`)
              return
            }
            toast.success(
              testResult.issue_key
                ? `Test delivered to "${channel.name}" - ${testResult.issue_key}`
                : `Test delivered to "${channel.name}"`,
              testResult.issue_url
                ? {
                    action: {
                      label: "Open issue",
                      onClick: () =>
                        window.open(testResult.issue_url, "_blank", "noopener,noreferrer"),
                    },
                  }
                : undefined,
            )
          },
        },
      )
    },
    [mutateTest],
  )

  const columns = useMemo<ColumnDef<ChannelResponse>[]>(
    () => [
      {
        id: "name",
        header: () => "Channel",
        accessorFn: (channel) => channel.name,
        cell: ({ row }) => <NameCell channel={row.original} />,
      },
      {
        id: "target",
        header: () => "Delivers to",
        enableSorting: false,
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <span
            title={row.original.config_summary}
            className="block max-w-[20rem] truncate font-mono text-[12px] text-muted-foreground"
          >
            {row.original.config_summary}
          </span>
        ),
      },
      {
        id: "severity",
        header: () => "Notifies from",
        accessorFn: (channel) => channel.min_severity,
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn("font-mono text-[11px]", SEVERITY_BADGE_CLASS[row.original.min_severity])}
          >
            {row.original.min_severity}
          </Badge>
        ),
      },
      {
        id: "enabled",
        header: () => "Sending",
        accessorFn: (channel) => channel.enabled,
        enableSorting: false,
        meta: { interactive: true },
        cell: ({ row }) => (
          <EnabledCell
            channel={row.original}
            busy={togglingId === row.original.id}
            onToggle={toggleEnabled}
          />
        ),
      },
      {
        id: "delivery",
        header: () => "Last delivery",
        enableSorting: false,
        meta: { responsive: "md" },
        cell: ({ row }) => <DeliveryCell channel={row.original} />,
      },
      actionsColumn<ChannelResponse>({
        ariaLabel: "Channel actions",
        actions: () => [
          { label: "Send test", icon: Send, onAction: sendSavedTest },
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onAction: (channel: ChannelResponse) => {
              setToDelete(channel)
            },
          },
        ],
      }),
    ],
    [sendSavedTest, toggleEnabled, togglingId],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BellRing}
        title="Notification channels"
        description="Where alarm notifications land. Add as many targets as you need — Discord, Jira and webhooks can all be active, and each alarm picks which ones to notify."
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh channels"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setCreateOpen(true)
              }}
            >
              <Plus className="size-4" />
              Add channel
            </Button>
          </>
        }
      />

      <ResourceTable<ChannelResponse>
        data={channels}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(channel) => channel.id}
        emptyState={
          <EmptyState
            icon={BellRing}
            title="No channels yet"
            description="Alarms have nowhere to notify until you add a Discord, Jira or webhook target. Add as many as you like."
            action={{
              label: "Add channel",
              onClick: () => {
                setCreateOpen(true)
              },
            }}
          />
        }
      />

      <ChannelCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Delete channel?"
        description={
          <>
            Channel <span className="font-mono">{toDelete?.name}</span> will stop receiving alarm
            notifications.
          </>
        }
        confirmLabel="Delete"
        loading={deleteChannel.isPending}
        onConfirm={() => {
          if (!toDelete) return
          deleteChannel.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
