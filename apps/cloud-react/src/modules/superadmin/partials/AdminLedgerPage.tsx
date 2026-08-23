import { useCallback, useMemo } from "react"

import { CreditCard, IndianRupee, ReceiptText } from "lucide-react"

import { PageHeader, StatGrid, type StatCardProps } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { PaymentLedgerTable } from "../components/PaymentLedgerTable"
import { useAdminPaymentLedger, useAdminPlatformOverview } from "../superadmin.hooks"

export function AdminLedgerPage() {
  useScreen("superadmin.ledger")
  const ledger = useAdminPaymentLedger()
  const { data: overview } = useAdminPlatformOverview()
  const payments = ledger.data ?? []
  const accounts = useMemo(
    () => new Map((overview?.accounts ?? []).map((account) => [account.id, account.name])),
    [overview],
  )
  const users = useMemo(
    () => new Map((overview?.users ?? []).map((user) => [user.id, user.name || user.email])),
    [overview],
  )
  const accountName = useCallback((id: string) => accounts.get(id) ?? "", [accounts])
  const userName = useCallback((id: string) => users.get(id) ?? "", [users])
  const paid = payments.filter((payment) => payment.status === "paid")
  const stats: StatCardProps[] = [
    { label: "Payments", value: payments.length, icon: ReceiptText },
    { label: "Captured", value: paid.length, icon: CreditCard },
    {
      label: "Captured value",
      value: paid.reduce((sum, payment) => sum + payment.amount, 0) / 100,
      icon: IndianRupee,
      format: (value) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ReceiptText}
        breadcrumbs={[{ label: "Super Admin" }, { label: "Payment ledger" }]}
        title="Payment ledger"
        description="Canonical checkout and settlement records from datadack-payments."
      />
      <StatGrid stats={stats} />
      <PaymentLedgerTable
        payments={payments}
        loading={ledger.isLoading}
        error={ledger.isError ? "Failed to load the payment ledger" : undefined}
        refreshing={ledger.isFetching}
        onRefresh={() => void ledger.refetch()}
        accountName={accountName}
        userName={userName}
        showMappings
      />
    </div>
  )
}
