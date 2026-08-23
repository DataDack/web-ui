import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { CreditCard } from "lucide-react"

import { DataTable, EmptyState, StatusBadge, dateColumn, textColumn } from "@datadack/common-ui"

import type { PaymentLedgerEntry } from "../superadmin.types"

interface PaymentLedgerTableProps {
  payments: PaymentLedgerEntry[]
  loading: boolean
  error?: string
  refreshing?: boolean
  onRefresh?: () => void
  accountName?: (id: string) => string
  userName?: (id: string) => string
  showMappings?: boolean
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount / 100)

function methodLabel(payment: PaymentLedgerEntry): string {
  const method = payment.method
  if (!method) return "—"
  if (method.description) return method.description
  if (method.card_last4) return `${method.card_network || "Card"} •••• ${method.card_last4}`
  return method.vpa || method.wallet || method.bank || method.type || "—"
}

export function PaymentLedgerTable({
  payments,
  loading,
  error,
  refreshing,
  onRefresh,
  accountName,
  userName,
  showMappings = false,
}: Readonly<PaymentLedgerTableProps>) {
  const columns = useMemo<ColumnDef<PaymentLedgerEntry>[]>(() => {
    const result: ColumnDef<PaymentLedgerEntry>[] = [
      dateColumn({ id: "created", header: "Created", accessor: (p) => p.created_at }),
      textColumn({ id: "description", header: "Description", accessor: (p) => p.description }),
      {
        id: "amount",
        header: () => "Amount",
        accessorFn: (p) => p.amount,
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums">
            {money(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        id: "status",
        header: () => "Status",
        accessorFn: (p) => p.status,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      textColumn({ id: "method", header: "Method", accessor: methodLabel, responsive: "md" }),
    ]
    if (showMappings) {
      result.splice(
        2,
        0,
        textColumn({
          id: "account",
          header: "Account",
          accessor: (p) => accountName?.(p.notes?.account_id ?? "") || p.notes?.account_id || "—",
          responsive: "lg",
        }),
        textColumn({
          id: "user",
          header: "User",
          accessor: (p) => userName?.(p.notes?.user_id ?? "") || p.customer_email || "—",
          responsive: "lg",
        }),
      )
    }
    return result
  }, [accountName, showMappings, userName])

  return (
    <DataTable
      data={payments}
      columns={columns}
      loading={loading}
      error={error}
      onRetry={onRefresh}
      getRowId={(payment) => payment.id}
      defaultSorting={[{ id: "created", desc: true }]}
      empty={
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Payments created through datadack-payments will appear here."
        />
      }
      onRefresh={onRefresh}
      refreshLabel="Refresh"
      refreshing={refreshing}
    />
  )
}
