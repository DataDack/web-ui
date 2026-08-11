import { useEffect, useId, useState } from "react"

import { CalendarClock } from "lucide-react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  css,
  cx,
  fontMono,
  glass3,
  mix,
} from "@datadack/common-ui"

import type { FunctionDetailLabels } from "../labels"
import {
  EMPTY_SCHEDULE_DRAFT,
  checkDraft,
  triggerTypeFor,
  type IntervalUnit,
  type ScheduleDraft,
  type ScheduleMode,
} from "./schedule"
import { summaryText } from "./scheduleText"

const content = css`
  max-width: 30rem;
`

const titleRow = css`
  display: flex;
  align-items: center;
  gap: 8px;
`

const titleIcon = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--brand-gold);
`

const form = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/* "Every [ 5 ] [ minutes ]" on one line — the sentence reads left to right
   rather than as three stacked form controls. */
const inlineRow = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const inlineLabel = css`
  font-size: 14px;
  color: var(--muted-foreground);
`

const numberInput = css`
  width: 88px;
  font-family: ${fontMono};
`

const timeInput = css`
  width: 120px;
  font-family: ${fontMono};
`

const unitSelect = css`
  width: 130px;
`

const monoInput = css`
  font-family: ${fontMono};
  font-size: 13px;
`

const hint = css`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted-foreground);
`

/* The answer to "what did I just describe?", in a panel of its own so it reads
   as the form's output rather than as one more thing to fill in. */
const preview = css`
  border-radius: 0.5rem;
  border: 1px solid ${mix("--border", 70)};
  padding: 10px 12px;
  font-size: 13px;
`

const previewProblem = css`
  border-color: ${mix("--destructive", 60)};
  color: var(--destructive);
`

const previewNote = css`
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted-foreground);
`

const MODES: readonly ScheduleMode[] = ["interval", "daily", "hourly", "once", "expression"]
const UNITS: readonly IntervalUnit[] = ["minutes", "hours", "days"]

/** "09:30" → the two halves the draft keeps separately. */
function splitTime(value: string): { hour: string; minute: string } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  return { hour: match[1] ?? "", minute: match[2] ?? "" }
}

export interface TriggerDialogProps {
  open: boolean
  functionName: string
  labels: FunctionDetailLabels
  /** In flight; the submit button spins and the form stays put. */
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: ScheduleDraft, name: string) => void
}

/**
 * The schedule picker.
 *
 * Built around what someone actually wants to say — "every five minutes", "at
 * half past nine" — rather than around the wire format. Cron is one option in
 * the list, not the entry fee, because the control plane accepts so little of
 * it (a daily time and nothing else) that leading with an expression box would
 * mostly be a way to collect 400s.
 *
 * The preview line under the form is the load-bearing part: it restates the
 * schedule in words before anything is submitted, so "every 90 minutes" and
 * "every 90 days" are told apart at a glance instead of after a day of silence.
 */
export function TriggerDialog({
  open,
  functionName,
  labels,
  saving,
  onOpenChange,
  onSubmit,
}: Readonly<TriggerDialogProps>) {
  const copy = labels.configuration.triggers
  const fieldId = useId()
  const [draft, setDraft] = useState<ScheduleDraft>(EMPTY_SCHEDULE_DRAFT)
  const [name, setName] = useState("")

  // A dialog that reopens holding the last schedule is a dialog that adds the
  // same trigger twice — and since the control plane creates rather than
  // upserts, the second one is a real second schedule, not a no-op.
  useEffect(() => {
    if (open) {
      setDraft(EMPTY_SCHEDULE_DRAFT)
      setName("")
    }
  }, [open])

  const check = checkDraft(draft)
  const patch = (next: Partial<ScheduleDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const time = `${draft.hour}:${draft.minute}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cx(glass3, content)}>
        <DialogHeader>
          <DialogTitle className={titleRow}>
            <CalendarClock className={titleIcon} aria-hidden />
            {copy.addTitle}
          </DialogTitle>
          <DialogDescription>{copy.addDescription}</DialogDescription>
        </DialogHeader>

        <div className={form}>
          <div className={field}>
            <Label htmlFor={`${fieldId}-mode`}>{copy.whenLabel}</Label>
            <Select
              value={draft.mode}
              onValueChange={(mode) => {
                patch({ mode: mode as ScheduleMode })
              }}
            >
              <SelectTrigger id={`${fieldId}-mode`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {copy.modes[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draft.mode === "interval" && (
            <div className={inlineRow}>
              <span className={inlineLabel}>{copy.everyLabel}</span>
              <Input
                aria-label={copy.everyLabel}
                className={numberInput}
                inputMode="numeric"
                value={draft.every}
                onChange={(event) => {
                  patch({ every: event.target.value })
                }}
              />
              <Select
                value={draft.unit}
                onValueChange={(unit) => {
                  patch({ unit: unit as IntervalUnit })
                }}
              >
                <SelectTrigger aria-label={copy.everyLabel} className={unitSelect}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {copy.units[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {draft.mode === "daily" && (
            <div className={inlineRow}>
              <span className={inlineLabel}>{copy.atLabel}</span>
              {/* A native time input, so the browser supplies the stepper, the
                  keyboard and the locale's 12/24-hour display — while the value
                  it hands back is always 24-hour "HH:MM". */}
              <Input
                type="time"
                aria-label={copy.atLabel}
                className={timeInput}
                value={time}
                onChange={(event) => {
                  const next = splitTime(event.target.value)
                  if (next) patch(next)
                }}
              />
              <span className={inlineLabel}>UTC</span>
            </div>
          )}

          {draft.mode === "expression" && (
            <div className={field}>
              <Label htmlFor={`${fieldId}-expression`}>{copy.expressionLabel}</Label>
              <Input
                id={`${fieldId}-expression`}
                value={draft.expression}
                placeholder={copy.expressionPlaceholder}
                className={monoInput}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  patch({ expression: event.target.value })
                }}
              />
              <p className={hint}>{copy.expressionHint}</p>
            </div>
          )}

          <div className={cx(preview, !check.ok && previewProblem)}>
            {check.ok
              ? copy.preview(summaryText(check.summary, copy.summary))
              : copy.problems[check.problem]}
            {check.ok && <p className={previewNote}>{copy.eventNote}</p>}
          </div>

          <div className={field}>
            <Label htmlFor={`${fieldId}-name`}>{copy.nameLabel}</Label>
            <Input
              id={`${fieldId}-name`}
              value={name}
              // The control plane names an unnamed trigger `<type>-<function>`,
              // so the placeholder shows exactly what leaving this blank gets.
              placeholder={copy.namePlaceholder(`${triggerTypeFor(draft)}-${functionName}`)}
              className={monoInput}
              autoComplete="off"
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {copy.cancel}
          </Button>
          <Button
            variant="gold"
            loading={saving}
            disabled={saving || !check.ok}
            onClick={() => {
              onSubmit(draft, name)
            }}
          >
            {copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
