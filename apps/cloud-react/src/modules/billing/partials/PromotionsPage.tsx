import { useEffect, useMemo, useRef, useState } from "react"

import { Button, cn, EmptyState, Input, Skeleton } from "@datadack/common-ui"
import { CheckCircle2, Coins, Gift, Percent, Ticket, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { Section } from "@/components/console"
import {
  PROMO_CODE_PARAM,
  type MyPromotion,
  type PromoScope,
  type RedeemResult,
  usePreviewPromo,
  usePromoErrorMessage,
  useMyPromotions,
  useRedeemPromo,
  useWalletSplit,
} from "@/modules/promotions"
import { useScreen } from "@/services/api/screen"

import { inr } from "../billing.utils"

/** Resource-kind slug → the service name a customer recognises. */
function useScopeLabels(): Record<PromoScope, string> {
  const { t } = useTranslation()
  return {
    compute: t("billing.promotions.scopes.compute"),
    storage: t("billing.promotions.scopes.storage"),
    network: t("billing.promotions.scopes.network"),
    loadbalancer: t("billing.promotions.scopes.loadbalancer"),
    hosting: t("billing.promotions.scopes.hosting"),
    managedapps: t("billing.promotions.scopes.managedapps"),
  }
}

/**
 * Billing → Promotions.
 *
 * Two jobs, in this order: apply a code, and understand what applying one did.
 * The second is the part that is usually missing — a customer who redeems ₹500
 * of credit and then sees a single wallet number cannot tell what it did, and a
 * customer running on a discount cannot tell what it covers or when it stops.
 *
 * A shared link lands here with ?code=…: the box is pre-filled and previewed
 * automatically, so the visitor sees what they have been given before deciding
 * to take it, rather than the link silently spending itself on arrival.
 */
export function PromotionsPage() {
  useScreen("billing.promotions")
  const { t } = useTranslation()
  const scopeLabels = useScopeLabels()

  const [params, setParams] = useSearchParams()
  const [code, setCode] = useState("")
  const [preview, setPreview] = useState<RedeemResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: split, isLoading: splitLoading } = useWalletSplit()
  const { data: promotions = [], isLoading } = useMyPromotions()
  const { mutate: runPreview, isPending: previewing } = usePreviewPromo()
  const { mutate: redeem, isPending: redeeming } = useRedeemPromo()
  const describeError = usePromoErrorMessage()

  // A shared link is previewed once, on arrival. The param is stripped straight
  // after so a refresh doesn't re-run it, and so the code isn't left sitting in
  // the address bar of a screen-shared browser.
  const consumedLink = useRef(false)
  useEffect(() => {
    const linked = params.get(PROMO_CODE_PARAM)
    if (!linked || consumedLink.current) return
    consumedLink.current = true
    const normalized = linked.trim().toUpperCase()
    setCode(normalized)
    runPreview(normalized, {
      onSuccess: (res) => {
        setPreview(res)
        setError(null)
      },
      onError: (e) => {
        setPreview(null)
        setError(describeError(e))
      },
    })
    params.delete(PROMO_CODE_PARAM)
    setParams(params, { replace: true })
  }, [params, setParams, runPreview, describeError])

  const check = () => {
    const value = code.trim().toUpperCase()
    if (!value) return
    setError(null)
    runPreview(value, {
      onSuccess: (res) => {
        setPreview(res)
      },
      onError: (e) => {
        setPreview(null)
        setError(describeError(e))
      },
    })
  }

  const apply = () => {
    const value = (preview?.code ?? code).trim().toUpperCase()
    if (!value) return
    redeem(value, {
      onSuccess: () => {
        setPreview(null)
        setCode("")
        setError(null)
      },
      onError: (e) => {
        setError(describeError(e))
      },
    })
  }

  const { active, past } = useMemo(
    () => ({
      active: promotions.filter((p) => p.status === "active"),
      past: promotions.filter((p) => p.status !== "active"),
    }),
    [promotions],
  )

  return (
    <div className="space-y-5">
      {/* ── Redeem ──────────────────────────────────────────────────────── */}
      <div className="glass-2 relative overflow-hidden p-5 md:p-6">
        <div className="bg-gradient-surface pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Ticket className="size-4 text-brand-gold" />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em]">
              {t("billing.promotions.redeem.label")}
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
            {t("billing.promotions.redeem.title")}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            {t("billing.promotions.redeem.subtitle")}
          </p>

          <form
            className="mt-4 flex max-w-md flex-wrap items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (preview) apply()
              else check()
            }}
          >
            <div className="min-w-[200px] flex-1">
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  // Any edit invalidates what was previewed: applying a code the
                  // customer is no longer looking at is the one outcome this
                  // screen must never produce.
                  setPreview(null)
                  setError(null)
                }}
                placeholder={t("billing.promotions.redeem.placeholder")}
                aria-label={t("billing.promotions.redeem.label")}
                spellCheck={false}
                autoCapitalize="characters"
                className="font-mono uppercase tracking-widest"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              disabled={!code.trim() || previewing || redeeming}
            >
              {preview
                ? t("billing.promotions.redeem.apply")
                : t("billing.promotions.redeem.check")}
            </Button>
          </form>

          {error && <p className="mt-2 text-[13px] text-status-danger">{error}</p>}

          {preview && (
            <div className="mt-4 max-w-md rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                <CheckCircle2 className="size-4 text-brand-gold" />
                {preview.kind === "credit"
                  ? t("billing.promotions.preview.credit", {
                      amount: inr(preview.credit_amount ?? 0),
                    })
                  : t("billing.promotions.preview.discount", { pct: preview.discount_pct ?? 0 })}
              </p>
              {preview.description && (
                <p className="mt-1 text-[12px] text-muted-foreground">{preview.description}</p>
              )}
              {preview.kind === "percent_off" && (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {t("billing.promotions.preview.covers", {
                    scope:
                      !preview.applies_to || preview.applies_to.length === 0
                        ? t("billing.promotions.allServices")
                        : preview.applies_to.map((s) => scopeLabels[s]).join(", "),
                  })}
                  {preview.expires_at &&
                    ` · ${t("billing.promotions.preview.until", {
                      date: new Date(preview.expires_at).toLocaleDateString(),
                    })}`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Where the balance came from ─────────────────────────────────── */}
      <Section
        variant="panel"
        title={t("billing.promotions.wallet.title")}
        description={t("billing.promotions.wallet.subtitle")}
      >
        {splitLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/40 sm:grid-cols-3">
              <SplitCell
                icon={<Wallet className="size-4 text-status-success" />}
                label={t("billing.promotions.wallet.purchased")}
                value={inr(split?.purchased ?? 0)}
                hint={t("billing.promotions.wallet.purchasedHint")}
              />
              <SplitCell
                icon={<Gift className="size-4 text-brand-gold" />}
                label={t("billing.promotions.wallet.granted")}
                value={inr(split?.granted ?? 0)}
                hint={t("billing.promotions.wallet.grantedHint")}
                accent
              />
              <SplitCell
                icon={<Coins className="size-4 text-muted-foreground" />}
                label={t("billing.promotions.wallet.balance")}
                value={inr(split?.balance ?? 0)}
                hint={t("billing.promotions.wallet.balanceHint")}
              />
            </div>
            {/* Said plainly, because it is the thing customers assume wrongly:
                granted credit is not a second, restricted wallet. */}
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              {(split?.granted ?? 0) > 0
                ? t("billing.promotions.wallet.note", {
                    amount: inr(split?.granted_share ?? 0),
                  })
                : t("billing.promotions.wallet.noneYet")}
            </p>
          </>
        )}
      </Section>

      {/* ── What is applied ─────────────────────────────────────────────── */}
      <Section
        variant="panel"
        title={t("billing.promotions.active.title")}
        description={t("billing.promotions.active.subtitle")}
      >
        <ActivePromotions
          loading={isLoading}
          promotions={active}
          scopeLabels={scopeLabels}
        />
      </Section>

      {past.length > 0 && (
        <Section
          variant="panel"
          title={t("billing.promotions.past.title")}
          description={t("billing.promotions.past.subtitle")}
        >
          <ul className="space-y-2">
            {past.map((p) => (
              <PromotionRow key={p.id} promo={p} scopeLabels={scopeLabels} muted />
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

/** Loading / empty / list, split out so the section body is one element. */
function ActivePromotions({
  loading,
  promotions,
  scopeLabels,
}: Readonly<{
  loading: boolean
  promotions: MyPromotion[]
  scopeLabels: Record<PromoScope, string>
}>) {
  const { t } = useTranslation()
  if (loading) return <Skeleton className="h-20 w-full" />
  if (promotions.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title={t("billing.promotions.active.empty")}
        description={t("billing.promotions.active.emptyHint")}
      />
    )
  }
  return (
    <ul className="space-y-2">
      {promotions.map((p) => (
        <PromotionRow key={p.id} promo={p} scopeLabels={scopeLabels} />
      ))}
    </ul>
  )
}

function SplitCell({
  icon,
  label,
  value,
  hint,
  accent,
}: Readonly<{
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  accent?: boolean
}>) {
  return (
    <div className={cn("px-4 py-3", accent ? "bg-brand-gold/5" : "bg-card/60")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[13px]">{label}</span>
      </div>
      <span className="mt-0.5 block font-mono text-lg font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
    </div>
  )
}

function PromotionRow({
  promo,
  scopeLabels,
  muted,
}: Readonly<{
  promo: MyPromotion
  scopeLabels: Record<PromoScope, string>
  muted?: boolean
}>) {
  const { t } = useTranslation()
  const isCredit = promo.kind === "credit"

  // Four outcomes, read top to bottom: withdrawn beats ended beats a deadline
  // beats "runs indefinitely". A revoked promotion that also happens to have
  // passed its date must still read as withdrawn — that is the fact the customer
  // needs, and the one support will be asked about.
  const status = (() => {
    if (promo.status === "revoked") return t("billing.promotions.row.revoked")
    if (promo.status === "expired") return t("billing.promotions.row.ended")
    if (promo.expires_at)
      return t("billing.promotions.row.until", {
        date: new Date(promo.expires_at).toLocaleDateString(),
      })
    return t("billing.promotions.row.noExpiry")
  })()

  const detail = isCredit
    ? t("billing.promotions.row.credited", { amount: inr(promo.credit_amount) })
    : t("billing.promotions.row.covers", {
        scope:
          promo.applies_to.length === 0
            ? t("billing.promotions.allServices")
            : promo.applies_to.map((s) => scopeLabels[s]).join(", "),
      })

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/40 px-4 py-3",
        muted && "opacity-70",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            isCredit ? "bg-status-success-bg text-status-success" : "bg-brand-gold/10 text-brand-gold",
          )}
        >
          {isCredit ? <Coins className="size-4" /> : <Percent className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-foreground">
            {promo.description || promo.code}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            <span className="font-mono tracking-wider">{promo.code}</span> · {detail}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {isCredit ? inr(promo.credit_amount) : `${String(promo.discount_pct)}%`}
        </p>
        <p className="text-[11px] text-muted-foreground">{status}</p>
      </div>
    </li>
  )
}
