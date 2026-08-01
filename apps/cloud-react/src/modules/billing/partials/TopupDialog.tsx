import { useState } from "react"

import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useBuyCredits } from "../billing.hooks"
import { inr } from "../billing.utils"

/** Preset top-up amounts (₹). One tap fills a common wallet load. */
const PRESETS = [500, 1000, 5000, 10000] as const

interface TopupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill the amount (e.g. the shortfall from a 402 redirect). */
  initialCredits?: number
}

/**
 * Buy-credits dialog. Wallet top-ups are TAX-FREE: paying ₹1000 grants ₹1000 of
 * credits with no GST (GST is charged later, when credits are spent). Mirrors the
 * server-side ComputeBreakdown (zero GST). On submit it hands off to the gateway's
 * hosted checkout via useBuyCredits.
 */
export function TopupDialog({
  open,
  onOpenChange,
  initialCredits = 0,
}: Readonly<TopupDialogProps>) {
  const { t } = useTranslation()
  const { mutate: buyCredits, isPending: isBuying } = useBuyCredits()
  // Seeded once from initialCredits; the parent remounts (via key) with a fresh
  // shortfall, so no effect is needed to re-seed.
  const [creditsInput, setCreditsInput] = useState(initialCredits > 0 ? String(initialCredits) : "")

  const creditsNum = Math.max(0, Math.floor(Number(creditsInput) || 0))
  const totalRupees = creditsNum // GST-free top-up

  const submitBuy = () => {
    if (creditsNum < 1) return
    // Return the customer here; the gateway appends ?status=&payment_id=.
    const redirectUrl = window.location.origin + window.location.pathname
    buyCredits({ credits: creditsNum, redirect_url: redirectUrl })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setCreditsInput("")
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("billing.buyDialog.title")}</DialogTitle>
          <DialogDescription>{t("billing.buyDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setCreditsInput(String(amount))
                }}
                className={
                  "rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors " +
                  (creditsNum === amount
                    ? "border-brand-gold/50 bg-brand-gold-soft text-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-accent/40 hover:text-foreground")
                }
              >
                {inr(amount)}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="credits-amount">{t("billing.buyDialog.creditsLabel")}</Label>
            <Input
              id="credits-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="1000"
              value={creditsInput}
              onChange={(e) => {
                setCreditsInput(e.target.value)
              }}
            />
            <p className="text-[12px] text-muted-foreground">
              {t("billing.buyDialog.creditsHint")}
            </p>
          </div>

          <dl className="divide-y divide-border/60 rounded-md border border-border/60 text-sm">
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-muted-foreground">{t("billing.buyDialog.credits")}</dt>
              <dd className="font-mono">{inr(creditsNum)}</dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="font-medium">{t("billing.buyDialog.total")}</dt>
              <dd className="font-mono font-semibold">{inr(totalRupees)}</dd>
            </div>
          </dl>
          <p className="text-[12px] text-muted-foreground">{t("billing.buyDialog.taxFreeNote")}</p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
            disabled={isBuying}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="gold" onClick={submitBuy} disabled={creditsNum < 1 || isBuying}>
            {isBuying
              ? t("billing.buyDialog.redirecting")
              : t("billing.buyDialog.payCta", { amount: inr(totalRupees) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
