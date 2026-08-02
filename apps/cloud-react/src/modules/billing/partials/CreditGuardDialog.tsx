import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import { AlertTriangle, Wallet } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { BILLING_ROUTES } from "../billing.constants"
import {
  HOURLY_RUNWAY_HOURS,
  LOW_RUNWAY_WARN_HOURS,
  type CreditGuardVerdict,
} from "../billing.guard"

const formatCredits = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)

function AmountRow({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          accent
            ? "font-mono font-semibold text-destructive"
            : "font-mono font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  )
}

const COPY: Record<CreditGuardVerdict["kind"], { title: string; description: string }> = {
  overdue: {
    title: "Account overdue",
    description:
      "Your account has overdue charges — one or more resources could not be billed because the credit balance ran out. Add credits to bring the account current before creating new resources.",
  },
  insufficient: {
    title: "Insufficient credits",
    description: `Hourly resources need credits covering at least the next ${String(HOURLY_RUNWAY_HOURS)} hours of usage (monthly resources need the full month upfront). Your current balance doesn't cover it.`,
  },
  "low-runway": {
    title: "Your account is about to go overdue",
    description: `At your current hourly usage, the remaining credits cover less than ${String(LOW_RUNWAY_WARN_HOURS)} hours. Once they run out your account goes overdue and resources get suspended after the grace period.`,
  },
}

/**
 * Dialog popup shown when evaluateCreditGuard (billing.guard) blocks or warns.
 * Blocking verdicts (overdue / insufficient) only offer "Add credits"; the
 * low-runway warning also lets the user continue with the create via
 * `onContinue`.
 */
export function CreditGuardDialog({
  verdict,
  onOpenChange,
  onContinue,
}: Readonly<{
  verdict: CreditGuardVerdict | null
  onOpenChange: (open: boolean) => void
  /** Proceed despite the warning — only rendered for the low-runway verdict. */
  onContinue?: () => void
}>) {
  const navigate = useNavigate()
  if (!verdict) return null
  const copy = COPY[verdict.kind]
  const topup = verdict.kind === "insufficient" ? Math.ceil(verdict.shortfall) : 0
  const billingUrl =
    topup > 0 ? `${BILLING_ROUTES.ROOT}?topup=${String(topup)}` : BILLING_ROUTES.ROOT

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {verdict.kind === "insufficient" && (
          <div className="space-y-2 rounded-lg border border-border-glass bg-muted/20 p-4">
            <AmountRow label="Required" value={formatCredits(verdict.required)} />
            <AmountRow label="Current balance" value={formatCredits(verdict.balance)} />
            <AmountRow label="Shortfall" value={formatCredits(verdict.shortfall)} accent />
          </div>
        )}
        {verdict.kind === "low-runway" && (
          <div className="space-y-2 rounded-lg border border-border-glass bg-muted/20 p-4">
            <AmountRow label="Current balance" value={formatCredits(verdict.balance)} />
            <AmountRow
              label="Runway left"
              value={`~${verdict.runwayHours.toFixed(1)} hours`}
              accent
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          {verdict.kind === "low-runway" && onContinue && (
            <Button type="button" variant="outline" onClick={onContinue}>
              Continue anyway
            </Button>
          )}
          <Button type="button" onClick={() => void navigate(billingUrl)}>
            <Wallet className="mr-2 size-4" />
            Add credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
