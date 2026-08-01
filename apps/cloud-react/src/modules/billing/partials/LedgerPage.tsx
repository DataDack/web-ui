import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Receipt, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  type AnimatedTab,
  AnimatedTabs,
  dateColumn,
  EmptyState,
  nameColumn,
  ResourceTable,
  StatGrid,
  statusColumn,
  textColumn,
} from "@/components/console"

import { useCreditBalance, useCreditPurchases, useLedger } from "../billing.hooks"
import type { CreditPurchase, LedgerEntry } from "../billing.types"
import { inr, paiseToInr } from "../billing.utils"

export function LedgerPage() {
  const { t } = useTranslation()
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
        format: (v: number) => inr(v),
        color: "success" as const,
      },
      {
        label: t("billing.ledger.debitedStat"),
        value: debited,
        format: (v: number) => inr(v),
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
        accessor: (e) => e.description,
      }),
      statusColumn<LedgerEntry>({
        header: t("billing.columns.type"),
        accessor: (e) => t(`billing.ledgerKind.${e.kind}`),
        responsive: "md",
      }),
      textColumn<LedgerEntry>({
        id: "amount",
        header: t("billing.columns.amount"),
        accessor: (e) => `${e.kind === "credit" ? "+" : "−"}${inr(e.amount)}`,
        mono: true,
      }),
      textColumn<LedgerEntry>({
        id: "balance",
        header: t("billing.columns.balance"),
        accessor: (e) => inr(e.balance),
        mono: true,
        muted: true,
        responsive: "lg",
      }),
    ],
    [t],
  )

  const purchaseColumns = useMemo<ColumnDef<CreditPurchase>[]>(
    () => [
      nameColumn<CreditPurchase>({
        header: t("billing.columns.purchase"),
        accessor: (p) => `#${p.id}`,
      }),
      textColumn<CreditPurchase>({
        id: "credits",
        header: t("billing.columns.credits"),
        accessor: (p) => inr(p.credits),
        mono: true,
      }),
      textColumn<CreditPurchase>({
        id: "gst",
        header: t("billing.columns.gst"),
        accessor: (p) => paiseToInr(p.gst_amount),
        mono: true,
        responsive: "md",
      }),
      textColumn<CreditPurchase>({
        id: "total",
        header: t("billing.columns.total"),
        accessor: (p) => paiseToInr(p.total_amount),
        mono: true,
      }),
      statusColumn<CreditPurchase>({
        header: t("billing.columns.status"),
        accessor: (p) => p.status,
      }),
      dateColumn<CreditPurchase>({
        id: "created",
        header: t("billing.columns.created"),
        accessor: (p) => p.created_at,
        responsive: "lg",
      }),
    ],
    [t],
  )

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
        count: purchases.length,
      },
    ],
    [t, ledger.length, purchases.length],
  )

  return (
    <div className="space-y-6">
      <StatGrid stats={ledgerStats} />

      <AnimatedTabs
        tabs={tabs}
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v as "ledger" | "topups")
        }}
        layoutId="billing-ledger-tabs"
      />

      {activeTab === "ledger" ? (
        <ResourceTable<LedgerEntry>
          data={ledger}
          columns={ledgerColumns}
          isLoading={ledgerLoading}
          isError={ledgerError}
          onRetry={() => void refetchLedger()}
          getRowId={(e) => e.id}
          initialSorting={[{ id: "date", desc: true }]}
          emptyState={<EmptyState icon={Wallet} title={t("billing.ledger.empty")} />}
        />
      ) : (
        <ResourceTable<CreditPurchase>
          data={purchases}
          columns={purchaseColumns}
          isLoading={purchasesLoading}
          isError={purchasesError}
          onRetry={() => void refetchPurchases()}
          getRowId={(p) => p.id}
          initialSorting={[{ id: "created", desc: true }]}
          emptyState={<EmptyState icon={Wallet} title={t("billing.credits.empty")} />}
        />
      )}
    </div>
  )
}
