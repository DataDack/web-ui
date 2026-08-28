import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"

import type { Insight, InsightSeverity } from "./insights"

/**
 * What the numbers on this page add up to, in words.
 *
 * The charts show what happened; this says what it means, and it is the part a
 * general-purpose dashboard cannot do — it needs to know that a latency chart
 * and a fleet chart are the same incident, and that three nodes on one host is
 * not redundancy. Those are facts about this platform's topology.
 */

const TONE: Record<InsightSeverity, { icon: typeof Info; className: string }> = {
  critical: { icon: AlertCircle, className: "text-status-danger border-status-danger/40" },
  warning: { icon: AlertTriangle, className: "text-status-warning border-status-warning/40" },
  info: { icon: Info, className: "text-muted-foreground border-border" },
}

export function InsightsPanel({
  insights,
  loading,
}: Readonly<{ insights: Insight[]; loading: boolean }>) {
  if (loading) return null

  // Saying "nothing is wrong" is worth a line. A panel that renders only on
  // trouble is indistinguishable from a panel that is broken, and the reader
  // cannot tell which until something breaks.
  if (insights.length === 0) {
    return (
      <div className="border-border text-muted-foreground mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]">
        <CheckCircle2 className="text-status-success size-4" />
        Nothing stands out in this window — error rate, latency trend and fleet headroom are all
        within range.
      </div>
    )
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      {insights.map((insight) => {
        const tone = TONE[insight.severity]
        const Icon = tone.icon
        return (
          <div
            key={insight.id}
            className={`bg-card flex items-start gap-3 rounded-xl border px-3 py-2 ${tone.className}`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-[13px] font-medium">{insight.title}</span>
              <span className="text-muted-foreground text-[12px]">{insight.detail}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
