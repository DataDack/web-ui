import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Receipt, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"

import { type AnimatedTab, AnimatedTabs, StatGrid } from "@/components/console"
import { useMyPromotions } from "@/modules/promotions"

import {
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"

import { useCreditBalance, useCreditPurchases, useLedger } from "../billing.hooks"
import type { LedgerEntry } from "../billing.types"
import { credits, creditSourceLabel, paiseToInr } from "../billing.utils"

interface TopupRow {
  id: string
  label: string
  type: string
  credits: number | null
  base: number | null
  gst: number | null
  total: number | null
  benefit: string
  status: string
  created_at: string
}

export function LedgerPage() {
  const { t } = useTranslation()
  const promotions = useMyPromotions()
  const { data: balance } = useCreditBalance()
  const {
    data: ledger = [],
    isLoading: ledgerLoading,
    isError: ledgerError,
    refetch: refetchLedger,
  } = useLedger(balance?.account_id)
  const {
    data: purchases = [],
    isLoading: purchasesLoading,
    isError: purchasesError,
    refetch: refetchPurchases,
  } = useCreditPurchases()

  const ledgerStats = useMemo(() => {
    const credited = ledger.filter((e) => e.kind === "credit").reduce((s, e) => s + e.amount, 0)
    const debited = ledger.filter((e) => e.kind === "debit").reduce((s, e) => s + e.amount, 0)
    return [
      {
        label: t("billing.ledger.creditedStat"),
        value: credited,
        format: (v: number) => credits(v),
        color: "success" as const,
      },
      {
        label: t("billing.ledger.debitedStat"),
        value: debited,
        format: (v: number) => credits(v),
        color: "danger" as const,
      },
    ]
  }, [ledger, t])

  const ledgerColumns = useMemo<ColumnDef<LedgerEntry>[]>(
    () => [
      dateColumn<LedgerEntry>({
        id: "date",
        header: t("billing.columns.date"),
        accessor: (e) => e.created_at,
      }),
      textColumn<LedgerEntry>({
        id: "description",
        header: t("billing.columns.description"),
        accessor: (e) => e.description || creditSourceLabel(e),
      }),
      textColumn<LedgerEntry>({
        id: "source",
        header: "Source / reason",
        accessor: creditSourceLabel,
      }),
      statusColumn<LedgerEntry>({
        header: t("billing.columns.type"),
        accessor: (e) => t(`billing.ledgerKind.${e.kind}`),
        responsive: "md",
      }),
      textColumn<LedgerEntry>({
        id: "amount",
        header: t("billing.columns.amount"),
        accessor: (e) => `${e.kind === "credit" ? "+" : "−"}${credits(e.amount)}`,
        mono: true,
      }),
      textColumn<LedgerEntry>({
        id: "balance",
        header: "Balance after latest charge",
        accessor: (e) => credits(e.balance),
        mono: true,
        muted: true,
        responsive: "lg",
      }),
    ],
    [t],
  )

  const topups = useMemo<TopupRow[]>(
    () => [
      ...purchases.map((p) => ({
        id: `purchase-${p.id}`,
        label: `#${p.id}`,
        type: p.status === "paid" ? "Purchased credits" : `Top-up (${p.status})`,
        credits: p.status === "paid" ? p.credits : null,
        base: p.base_amount,
        gst: p.status === "paid" ? p.gst_amount : null,
        total: p.status === "paid" ? p.total_amount : null,
        benefit:
          p.status === "paid"
            ? "Purchased credits; GST paid at checkout"
            : "No credits added or GST paid yet",
        status: p.status,
        created_at: p.created_at,
      })),
      ...(promotions.data ?? []).map((p) => ({
        id: `coupon-${p.id}`,
        label: p.description ? `${p.code} — ${p.description}` : p.code,
        type: p.kind === "credit" ? "Promotional coupon credit" : "Discount coupon",
        credits: p.kind === "credit" ? p.credit_amount : null,
        base: null,
        gst: null,
        total: null,
        benefit:
          p.kind === "credit"
            ? credits(p.credit_amount)
            : `${p.discount_pct}% · ${p.applies_to.join(", ") || "All services"}`,
        status: p.status,
        created_at: p.redeemed_at,
      })),
      ...ledger
        .filter((e) => e.kind === "credit" && e.ref_type === "adjustment")
        .map((e) => ({
          id: `grant-${e.id}`,
          label: e.description,
          type: creditSourceLabel(e),
          credits: e.amount,
          base: null,
          gst: null,
          total: null,
          benefit: credits(e.amount),
          status: "posted",
          created_at: e.created_at,
        })),
    ],
    [purchases, promotions.data, ledger],
  )
  const purchaseColumns: ColumnDef<TopupRow>[] = [
    nameColumn<TopupRow>({ header: "Top-up / coupon", accessor: (p) => p.label }),
    textColumn<TopupRow>({ id: "type", header: "Type", accessor: (p) => p.type }),
    textColumn<TopupRow>({
      id: "amount",
      header: "Top-up amount",
      accessor: (p) => (p.base === null ? "—" : paiseToInr(p.base)),
      mono: true,
    }),
    textColumn<TopupRow>({
      id: "gst",
      header: "GST paid",
      accessor: (p) => (p.gst === null ? "Not applicable" : paiseToInr(p.gst)),
      mono: true,
    }),
    textColumn<TopupRow>({
      id: "total",
      header: "Amount paid",
      accessor: (p) => (p.total === null ? "—" : paiseToInr(p.total)),
      mono: true,
    }),
    textColumn<TopupRow>({
      id: "credits",
      header: "Credits added",
      accessor: (p) => (p.credits === null ? "—" : credits(p.credits)),
      mono: true,
    }),
    textColumn<TopupRow>({
      id: "coupon",
      header: "Coupon / grant benefit",
      accessor: (p) => p.benefit,
    }),
    statusColumn<TopupRow>({ header: "Status", accessor: (p) => p.status }),
    dateColumn<TopupRow>({ id: "created", header: "Date", accessor: (p) => p.created_at }),
  ]
  const refreshTopups = () => {
    void refetchPurchases()
    void refetchLedger()
    void promotions.refetch()
  }

  const [activeTab, setActiveTab] = useState<"ledger" | "topups">("ledger")

  const tabs = useMemo<AnimatedTab[]>(
    () => [
      {
        value: "ledger",
        label: t("billing.sections.ledgerTitle"),
        icon: Wallet,
        count: ledger.length,
      },
      {
        value: "topups",
        label: t("billing.sections.topupsTitle"),
        icon: Receipt,
        count: topups.length,
      },
    ],
    [t, ledger.length, topups.length],
  )

  return (
    <div className="space-y-6">
      <StatGrid stats={ledgerStats} />
      <p className="text-sm text-muted-foreground">
        Trial, promotional and admin-provided credits are free credits with no GST. GST applies only
        when you purchase a top-up. Hourly usage accumulates per resource and month; the balance
        column shows the balance after its latest charge.
      </p>

      <AnimatedTabs
        tabs={tabs}
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v as "ledger" | "topups")
        }}
        layoutId="billing-ledger-tabs"
      />

      {activeTab === "ledger" ? (
        <DataTable<LedgerEntry>
          data={ledger}
          columns={ledgerColumns}
          loading={ledgerLoading}
          error={ledgerError ? t("console.table.error") : undefined}
          onRetry={() => void refetchLedger()}
          retryLabel={t("console.table.retry")}
          getRowId={(e) => e.id}
          defaultSorting={[{ id: "date", desc: true }]}
          empty={<EmptyState icon={Wallet} title={t("billing.ledger.empty")} />}
          onRefresh={() => void refetchLedger()}
          refreshLabel={t("console.table.refresh")}
        />
      ) : (
        <DataTable<TopupRow>
          data={topups}
          columns={purchaseColumns}
          loading={purchasesLoading || ledgerLoading || promotions.isLoading}
          error={
            purchasesError || ledgerError || promotions.isError
              ? t("console.table.error")
              : undefined
          }
          onRetry={refreshTopups}
          retryLabel={t("console.table.retry")}
          getRowId={(p) => p.id}
          defaultSorting={[{ id: "created", desc: true }]}
          empty={<EmptyState icon={Wallet} title={t("billing.credits.empty")} />}
          onRefresh={refreshTopups}
          refreshLabel={t("console.table.refresh")}
        />
      )}
    </div>
  )
}
