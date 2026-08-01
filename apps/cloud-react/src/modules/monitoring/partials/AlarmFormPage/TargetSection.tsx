// Section 1 — "What to watch".
//
// This is the question the old form never asked. Everything downstream (which
// signals exist, which namespace the alarm is written under, what the chart
// shows) is derived from the answer.

import { useMemo, useState } from "react"

import { Check, Search } from "lucide-react"

import { getStatusConfig, StatusBadge } from "@/components/console"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { useAlarmTargets, useTargetCounts } from "./useAlarmTargets"
import {
  TARGET_TYPES,
  TARGET_TYPE_META,
  type AlarmTargetType,
  type TargetTypeMeta,
} from "../../monitoring.targets"
import type { AlarmTarget } from "../../monitoring.types"

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
const ERROR_CLASS = "text-[11px] text-destructive"
const MUTED_NOTE_CLASS = "text-[12px] text-muted-foreground"

function TargetTypeCard({
  meta,
  count,
  selected,
  onSelect,
}: Readonly<{
  meta: TargetTypeMeta
  count: number
  selected: boolean
  onSelect: (type: AlarmTargetType) => void
}>) {
  const Icon = meta.icon
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        onSelect(meta.type)
      }}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold/25"
          : "border-border hover:border-brand-gold/40 hover:bg-muted/30",
      )}
    >
      <span className="flex w-full items-center gap-2">
        <Icon
          className={cn("size-4 shrink-0", selected ? "text-brand-gold" : "text-muted-foreground")}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {meta.label}
        </span>
        {meta.type !== "custom" && (
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </span>
      <span className="text-[11px] leading-snug text-muted-foreground">{meta.description}</span>
    </button>
  )
}

function TargetRow({
  target,
  selected,
  onToggle,
}: Readonly<{
  target: AlarmTarget
  selected: boolean
  onToggle: (id: string, next: boolean) => void
}>) {
  const inputId = `alarm-target-${target.id}`
  // Resources that are not healthy stay selectable — an alarm on a stopped
  // instance is exactly how you find out it never came back. We say so instead
  // of disabling the row.
  const healthy = getStatusConfig(target.status).tone === "success"
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all",
        selected ? "border-brand-gold/60 bg-brand-gold/5" : "border-border hover:bg-muted/30",
      )}
    >
      <Checkbox
        id={inputId}
        checked={selected}
        onCheckedChange={(checked) => {
          onToggle(target.id, checked === true)
        }}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">{target.name}</span>
          <StatusBadge status={target.status} />
        </span>
        {target.detail && (
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {target.detail}
          </span>
        )}
        {!healthy && (
          <span className="block text-[11px] text-status-warning">
            Not healthy right now — it may report nothing until it is back.
          </span>
        )}
      </span>
    </label>
  )
}

export function TargetSection({
  targetType,
  targetIds,
  customNamespace,
  customDimensions,
  singleSelect = false,
  errors,
  onTypeChange,
  onTargetIdsChange,
  onCustomNamespaceChange,
  onCustomDimensionsChange,
}: Readonly<{
  targetType: AlarmTargetType
  targetIds: string[]
  customNamespace: string
  customDimensions: string
  /**
   * Edit mode. A saved alarm addresses exactly one series, so picking a second
   * resource would have to silently discard one — the picker swaps instead.
   */
  singleSelect?: boolean
  errors: {
    targetIds?: string
    customNamespace?: string
    customDimensions?: string
  }
  onTypeChange: (type: AlarmTargetType) => void
  onTargetIdsChange: (ids: string[]) => void
  onCustomNamespaceChange: (value: string) => void
  onCustomDimensionsChange: (value: string) => void
}>) {
  const [search, setSearch] = useState("")
  const { targets, isLoading } = useAlarmTargets(targetType)
  const counts = useTargetCounts()
  const meta = TARGET_TYPE_META[targetType]

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return targets
    return targets.filter(
      (target) =>
        target.name.toLowerCase().includes(needle) || target.id.toLowerCase().includes(needle),
    )
  }, [targets, search])

  const toggleOne = (id: string, next: boolean) => {
    if (!next) {
      onTargetIdsChange(targetIds.filter((value) => value !== id))
      return
    }
    onTargetIdsChange(singleSelect ? [id] : [...targetIds, id])
  }

  const selectAllVisible = () => {
    const visible = filtered.map((target) => target.id)
    onTargetIdsChange([...new Set([...targetIds, ...visible])])
  }

  return (
    <div className="space-y-4">
      <div
        role="radiogroup"
        aria-label="What kind of resource to watch"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {TARGET_TYPES.map((type) => (
          <TargetTypeCard
            key={type.type}
            meta={type}
            count={counts[type.type]}
            selected={type.type === targetType}
            onSelect={onTypeChange}
          />
        ))}
      </div>

      {targetType === "custom" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className={LABEL_CLASS}>Namespace</Label>
            <Input
              value={customNamespace}
              onChange={(event) => {
                onCustomNamespaceChange(event.target.value)
              }}
              placeholder="e.g. myapp/api"
              className="font-mono text-[13px]"
              autoComplete="off"
            />
            <p className={MUTED_NOTE_CLASS}>The namespace you push this metric under.</p>
            {errors.customNamespace && <p className={ERROR_CLASS}>{errors.customNamespace}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL_CLASS}>Dimensions</Label>
            <Input
              value={customDimensions}
              onChange={(event) => {
                onCustomDimensionsChange(event.target.value)
              }}
              placeholder="service=api, env=prod"
              className="font-mono text-[13px]"
              autoComplete="off"
            />
            <p className={MUTED_NOTE_CLASS}>Leave empty to watch every series in the namespace.</p>
            {errors.customDimensions && <p className={ERROR_CLASS}>{errors.customDimensions}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                }}
                placeholder={`Search ${meta.plural}`}
                className="h-9 pl-8 text-[13px]"
                autoComplete="off"
              />
            </div>
            {!singleSelect && (
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-[12px] font-medium text-brand-gold hover:underline"
              >
                Select all
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onTargetIdsChange([])
              }}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>

          {isLoading && <p className={MUTED_NOTE_CLASS}>Loading {meta.plural}…</p>}

          {!isLoading && targets.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
              No {meta.plural} in this account yet. Pick another kind of resource, or watch a custom
              metric.
            </p>
          )}

          {!isLoading && targets.length > 0 && filtered.length === 0 && (
            <p className={MUTED_NOTE_CLASS}>
              No {meta.plural} match “{search}”.
            </p>
          )}

          {filtered.length > 0 && (
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filtered.map((target) => (
                <TargetRow
                  key={target.id}
                  target={target}
                  selected={targetIds.includes(target.id)}
                  onToggle={toggleOne}
                />
              ))}
            </div>
          )}

          <p className="text-[11px] tabular-nums text-muted-foreground">
            {targetIds.length} of {targets.length} selected
          </p>

          {singleSelect && (
            <p className={MUTED_NOTE_CLASS}>
              An alarm watches one resource — choosing another moves this alarm to it.
            </p>
          )}

          {!singleSelect && targetIds.length > 1 && (
            <p className="flex items-start gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-3 text-[12px] text-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-brand-gold" />
              <span>
                One alarm is created per resource —{" "}
                <span className="font-medium">{targetIds.length} alarms</span>, each watching its
                own {meta.label.toLowerCase()}.
              </span>
            </p>
          )}

          {errors.targetIds && <p className={ERROR_CLASS}>{errors.targetIds}</p>}
        </div>
      )}
    </div>
  )
}
