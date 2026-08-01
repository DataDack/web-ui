import { useCallback, useEffect, useState } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { CreditCard, Plus, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink, Outlet } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/console"
import { Button } from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { useScreen } from "@/services/api/screen"
import { publishConsoleEvent } from "@/services/broadcast"

import { BILLING_ROUTES } from "../billing.constants"
import type { BillingOutletContext } from "../billing.context"
import { TopupDialog } from "./TopupDialog"

interface NavTab {
  to: string
  labelKey: string
  end?: boolean
  soon?: boolean
}

const NAV_TABS: NavTab[] = [
  { to: BILLING_ROUTES.OVERVIEW, labelKey: "billing.nav.overview", end: true },
  { to: BILLING_ROUTES.INVOICES, labelKey: "billing.nav.invoices" },
  { to: BILLING_ROUTES.USAGE, labelKey: "billing.nav.usage" },
  { to: BILLING_ROUTES.LEDGER, labelKey: "billing.nav.ledger" },
  { to: BILLING_ROUTES.PAYMENT_METHODS, labelKey: "billing.nav.paymentMethods", soon: true },
  { to: BILLING_ROUTES.BUDGETS, labelKey: "billing.nav.budgets", soon: true },
]

/** Route-linked secondary nav — the billing section's tab bar. */
function BillingNav() {
  const { t } = useTranslation()
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {NAV_TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {t(tab.labelKey)}
              {tab.soon && (
                <span className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-brand-gold/90">
                  {t("console.nav.soon")}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-brand" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * Read the pre-fill credits amount from the `?topup=<shortfall>` redirect param
 * that the 402 insufficient-balance interceptor appends.
 */
function readTopupParam() {
  const raw = new URLSearchParams(window.location.search).get("topup")
  return raw ? Math.max(0, Math.floor(Number(raw) || 0)) : 0
}

export function BillingLayout() {
  useScreen("billing")
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ queryKey: ["billing"] }) > 0

  const [buyOpen, setBuyOpen] = useState(() => readTopupParam() > 0)
  const [topupCredits, setTopupCredits] = useState(() => readTopupParam())

  const openTopup = useCallback((credits = 0) => {
    setTopupCredits(credits)
    setBuyOpen(true)
  }, [])

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["billing"] })
  }, [queryClient])

  // Returning from the gateway's hosted checkout: it appends ?status=&payment_id=.
  // Acknowledge, refetch (settlement arrives via webhook, which may lag), and
  // strip the params so a refresh doesn't replay it.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status")
    if (!status) return
    if (status === "paid") {
      toast.success(t("billing.toasts.purchaseReturnPaid"))
      // The tab that sent the user here — a blocked upgrade, a create
      // flow — is still open behind this one and holds a balance that is
      // now wrong. Tell it, instead of leaving it to be reloaded by hand.
      publishConsoleEvent({ type: "billing:credited" })
    } else if (status === "cancelled") toast(t("billing.toasts.purchaseReturnCancelled"))
    else if (status === "failed") toast.error(t("billing.toasts.purchaseReturnFailed"))
    else toast(t("billing.toasts.purchaseReturnPending"))
    refreshAll()
    const retry = window.setTimeout(refreshAll, 4000)
    window.history.replaceState({}, "", window.location.pathname)
    return () => {
      window.clearTimeout(retry)
    }
  }, [refreshAll, t])

  // The dialog state is already seeded from ?topup=. Here we only notify and
  // strip the param so a refresh doesn't reopen it.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("topup")) return
    if (readTopupParam() > 0) toast(t("billing.toasts.topupNeeded"))
    window.history.replaceState({}, "", window.location.pathname + window.location.hash)
  }, [t])

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CreditCard}
        breadcrumbs={[{ label: t("console.nav.groups.governance") }, { label: t("billing.title") }]}
        title={t("billing.title")}
        description={t("billing.overview.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshAll}
              disabled={fetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={cn("size-4", fetching && "animate-spin")} />
            </Button>
            <Button
              variant="gold"
              onClick={() => {
                openTopup()
              }}
            >
              <Plus className="mr-1.5 size-4" />
              {t("billing.actions.buy")}
            </Button>
          </div>
        }
      />

      <BillingNav />

      <Outlet context={{ openTopup } satisfies BillingOutletContext} />

      {/* keyed by shortfall so a fresh 402 amount re-seeds the input via remount */}
      <TopupDialog
        key={topupCredits}
        open={buyOpen}
        onOpenChange={setBuyOpen}
        initialCredits={topupCredits}
      />
    </div>
  )
}
