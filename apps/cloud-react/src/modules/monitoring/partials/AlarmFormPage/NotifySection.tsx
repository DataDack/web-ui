import { useTranslation } from "react-i18next"
// Section 4 — "Notifications".
//
// Two things went wrong in the old flow and are fixed here:
//   1. Every binding was written as "both" with no way to say otherwise, so
//      recovery-only routing was impossible. Each selected channel now carries
//      its own direction.
//   2. Picking a channel whose minimum severity is above the alarm's severity
//      silently swallowed every notification. That consequence is now stated
//      before you save, next to the channel it applies to.
//
// The "+ New channel" button opens a dialog rather than linking to the channels
// page: navigating away from a half-filled form is how drafts got lost.

import { useState } from "react"

import { Badge, Button, Checkbox, Label } from "@datadack/common-ui"
import { AlertTriangle, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

import type { ChannelBinding } from "./schema"
import { ChannelCreateDialog } from "../../channels/ChannelCreateDialog"
import { SEVERITY_BADGE_CLASS, TYPE_META } from "../../channels/channels.meta"
import { useChannels } from "../../monitoring.hooks"
import {
  DEFAULT_TRANSITIONS,
  describeTransitions,
  orderTransitions,
  TRANSITION_OPTIONS,
  timeAgo,
} from "../../monitoring.meta"
import type { AlarmTransition, AlertSeverity, ChannelResponse } from "../../monitoring.types"

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
}

const SEVERITY_OPTIONS: readonly {
  value: AlertSeverity
  label: string
  dotClass: string
}[] = [
  { value: "info", label: "Info", dotClass: "bg-status-info" },
  { value: "warning", label: "Warning", dotClass: "bg-status-warning" },
  { value: "critical", label: "Critical", dotClass: "bg-status-danger" },
]

function isSilent(channel: ChannelResponse, severity: AlertSeverity): boolean {
  return SEVERITY_RANK[channel.min_severity] > SEVERITY_RANK[severity]
}

/** What choosing this severity costs, in channels that will never hear about it. */
function silenceNote(channels: ChannelResponse[], severity: AlertSeverity): string {
  if (channels.length === 0) return ""
  const silent = channels.filter((channel) => isSilent(channel, severity))
  if (silent.length === 0) {
    return `Every channel you have accepts ${severity} alerts.`
  }
  const names = silent.map((channel) => channel.name).join(", ")
  return `${String(silent.length)} of ${String(channels.length)} channels stay silent at ${severity}: ${names}. Their own minimum is higher.`
}

function DeliveryHealth({ channel }: Readonly<{ channel: ChannelResponse }>) {
  if (!channel.last_delivery_at) {
    return <span className="block text-[11px] text-muted-foreground">no deliveries yet</span>
  }
  const ok = channel.last_delivery_status === "ok" || channel.last_delivery_status === "sent"
  if (ok) {
    return (
      <span className="block text-[11px] text-muted-foreground">
        last delivery ok · {timeAgo(channel.last_delivery_at)}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-status-danger">
      <AlertTriangle className="size-3 shrink-0" />
      last delivery failed ({channel.last_delivery_status || "unknown"}) ·{" "}
      {timeAgo(channel.last_delivery_at)}
    </span>
  )
}

function ChannelRow({
  channel,
  binding,
  silent,
  onToggle,
  onTransitionToggle,
}: Readonly<{
  channel: ChannelResponse
  binding: ChannelBinding | undefined
  silent: boolean
  onToggle: (channelId: string, next: boolean) => void
  onTransitionToggle: (channelId: string, state: AlarmTransition) => void
}>) {
  const { t } = useTranslation()
  const inputId = `alarm-channel-${channel.id}`
  const meta = TYPE_META[channel.type]
  const TypeIcon = meta.icon
  const selected = binding !== undefined
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all",
        selected ? "border-brand-gold/60 bg-brand-gold/5" : "border-border",
      )}
    >
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          id={inputId}
          checked={selected}
          onCheckedChange={(checked) => {
            onToggle(channel.id, checked === true)
          }}
          className="mt-0.5"
        />
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="flex items-center gap-1.5">
            <TypeIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-[13px] font-medium text-foreground">{channel.name}</span>
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("gap-1 font-mono text-[10px]", meta.badgeClass)}>
              {meta.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn("font-mono text-[10px]", SEVERITY_BADGE_CLASS[channel.min_severity])}
            >
              min {channel.min_severity}
            </Badge>
            {!channel.enabled && (
              <Badge
                variant="outline"
                className="border-dashed font-mono text-[10px] text-muted-foreground"
              >
                disabled
              </Badge>
            )}
          </span>
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {channel.config_summary}
          </span>
          <DeliveryHealth channel={channel} />
          {silent && (
            <span className="block text-[11px] text-status-warning">
              Stays silent at this alarm’s severity — raise the severity or lower the channel’s
              minimum.
            </span>
          )}
        </span>
      </label>

      {selected && (
        <div className="mt-2.5 space-y-1.5 border-t border-border-glass pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-muted-foreground">{t("monitoring.notifySection.notifyOn")}</span>
            {/*
                          Three independent toggles, not one exclusive choice —
                          each maps to its own CloudWatch action list, so any
                          combination is valid. The last remaining state cannot be
                          un-ticked: a selected channel that hears about nothing is
                          a channel you would never know was silent.
                        */}
            {TRANSITION_OPTIONS.map((option) => {
              const on = binding.on_transitions.includes(option.value)
              const last = on && binding.on_transitions.length === 1
              return (
                <button
                  type="button"
                  key={option.value}
                  title={
                    last
                      ? "Keep at least one — otherwise this channel is never notified."
                      : option.hint
                  }
                  aria-pressed={on}
                  disabled={last}
                  onClick={() => {
                    onTransitionToggle(channel.id, option.value)
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all",
                    on
                      ? "border-brand-gold bg-brand-gold/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-brand-gold/40 hover:text-foreground",
                    last && "cursor-not-allowed opacity-80",
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {describeTransitions(binding.on_transitions)}
          </p>
        </div>
      )}
    </div>
  )
}

export function NotifySection({
  severity,
  channels,
  onSeverityChange,
  onChannelsChange,
}: Readonly<{
  severity: AlertSeverity
  channels: ChannelBinding[]
  onSeverityChange: (value: AlertSeverity) => void
  onChannelsChange: (next: ChannelBinding[]) => void
}>) {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: available = [], isLoading } = useChannels()

  const toggle = (channelId: string, next: boolean) => {
    if (next) {
      onChannelsChange([
        ...channels,
        { channel_id: channelId, on_transitions: [...DEFAULT_TRANSITIONS] },
      ])
      return
    }
    onChannelsChange(channels.filter((binding) => binding.channel_id !== channelId))
  }

  // Add or remove one state from a binding's set. Removing the last one is
  // refused rather than silently producing a channel nobody ever hears from —
  // the button is disabled too, so this is the belt to that braces.
  const toggleTransition = (channelId: string, state: AlarmTransition) => {
    onChannelsChange(
      channels.map((binding) => {
        if (binding.channel_id !== channelId) return binding
        const on = binding.on_transitions.includes(state)
        if (on && binding.on_transitions.length === 1) return binding
        const next = on
          ? binding.on_transitions.filter((value) => value !== state)
          : [...binding.on_transitions, state]
        return { ...binding, on_transitions: orderTransitions(next) }
      }),
    )
  }

  const note = silenceNote(available, severity)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className={LABEL_CLASS}>Severity</Label>
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={option.value === severity}
              onClick={() => {
                onSeverityChange(option.value)
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                option.value === severity
                  ? "border-brand-gold bg-brand-gold/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-brand-gold/40 hover:text-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full", option.dotClass)} />
              {option.label}
            </button>
          ))}
        </div>
        {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className={LABEL_CLASS}>Channels</Label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="gap-1 text-brand-gold"
            onClick={() => {
              setDialogOpen(true)
            }}
          >
            <Plus className="size-3" />
            {t("monitoring.notifySection.newChannel")}
          </Button>
        </div>

        {isLoading && <p className="text-[13px] text-muted-foreground">{t("monitoring.notifySection.loadingChannels")}</p>}

        {!isLoading && available.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-[13px] text-muted-foreground">
              No channels yet. The alarm will still track state and record every transition — but
              nobody is told when it breaches.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => {
                setDialogOpen(true)
              }}
            >
              <Plus className="size-3.5" />
              {t("monitoring.notifySection.newChannel2")}
            </Button>
          </div>
        )}

        {available.length > 0 && (
          <div className="grid gap-2 lg:grid-cols-2">
            {available.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                binding={channels.find((binding) => binding.channel_id === channel.id)}
                silent={isSilent(channel, severity)}
                onToggle={toggle}
                onTransitionToggle={toggleTransition}
              />
            ))}
          </div>
        )}

        {available.length > 0 && (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {channels.length} of {available.length} channels selected
          </p>
        )}
      </div>

      <ChannelCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(created: ChannelResponse) => {
          onChannelsChange([
            ...channels,
            { channel_id: created.id, on_transitions: [...DEFAULT_TRANSITIONS] },
          ])
        }}
      />
    </div>
  )
}
