// The sticky right rail: what you have said, what is still missing, and save.
//
// The checklist is the replacement for a stepper. It gives the same "am I done?"
// answer without sequencing anybody: every row is a jump link, nothing is
// hidden, and the page never refuses to show you a later question because an
// earlier one is unanswered.
//
// Stateless on purpose so it can live next to the page component.

import { Check, Circle, Send } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"

import { Button, cn } from "@datadack/common-ui"

import type { ReadinessRow, SectionId } from "./schema"
import { SeverityChip } from "../../components/StateChips"
import type { AlertSeverity } from "../../monitoring.types"

const SUMMARY_LABEL_CLASS = "text-[11px] uppercase tracking-wide text-muted-foreground"

export function SummaryRail({
  targetLine,
  metricLine,
  conditionLine,
  severity,
  channelCount,
  rows,
  blocker,
  isSubmitting,
  submitLabel,
  onJump,
  onCancel,
}: Readonly<{
  targetLine: string
  metricLine: string
  conditionLine: string
  severity: AlertSeverity
  channelCount: number
  rows: ReadinessRow[]
  /** Why saving is not possible yet, or null when it is. */
  blocker: string | null
  isSubmitting: boolean
  submitLabel: string
  onJump: (id: SectionId) => void
  onCancel: () => void
}>) {
  const { t } = useTranslation()
  const channelWord = channelCount === 1 ? "channel" : "channels"
  const channelLine =
    channelCount === 0 ? "no channels — tracked silently" : `${String(channelCount)} ${channelWord}`

  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      <Section variant="panel" title={t("monitoring.summaryRail.thisAlarm")} className="space-y-3">
        <div className="space-y-1">
          <p className={SUMMARY_LABEL_CLASS}>Watching</p>
          <p className="text-[13px] text-foreground">{targetLine}</p>
        </div>
        <div className="space-y-1">
          <p className={SUMMARY_LABEL_CLASS}>Signal</p>
          <p className="text-[13px] text-foreground">{metricLine}</p>
        </div>
        <div className="space-y-1">
          <p className={SUMMARY_LABEL_CLASS}>Rule</p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{conditionLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border-glass pt-3">
          <SeverityChip severity={severity} />
          <span className="text-[12px] tabular-nums text-muted-foreground">{channelLine}</span>
        </div>
      </Section>

      <Section
        variant="panel"
        title={t("monitoring.summaryRail.beforeYouSave")}
        className="space-y-1"
      >
        <ul className="space-y-0.5">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => {
                  onJump(row.id)
                }}
                className="flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/40"
              >
                {row.ok ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-status-success" />
                ) : (
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[13px]",
                      row.ok ? "text-foreground" : "font-medium text-foreground",
                    )}
                  >
                    {row.label}
                  </span>
                  {!row.ok && (
                    <span className="block text-[11px] leading-snug text-muted-foreground">
                      {row.hint}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <div className="space-y-2">
        {blocker && <p className="text-[12px] text-muted-foreground">{blocker}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="gap-2"
            disabled={isSubmitting || blocker !== null}
            loading={isSubmitting}
          >
            <Send className="size-4" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
