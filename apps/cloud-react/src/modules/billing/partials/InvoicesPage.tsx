import { useState } from "react"

import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { FileText } from "lucide-react"
import { toast } from "sonner"

import { Button, DataTable, EmptyState, textColumn, dateColumn } from "@datadack/common-ui"

import { billingApi } from "../billing.api"
import { useCreditPurchases } from "../billing.hooks"
import type { CreditPurchase, CreditStatement } from "../billing.types"
import { credits, paiseToInr } from "../billing.utils"

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function InvoicesPage() {
  const purchases = useCreditPurchases()
  const statements = useQuery({
    queryKey: ["billing", "statements"],
    queryFn: billingApi.listStatements,
  })
  const [downloading, setDownloading] = useState<string | null>(null)
  async function download(id: string, kind: "invoice" | "statement" | "statement-pdf", month = "") {
    setDownloading(id)
    try {
      if (kind === "invoice") {
        const invoice = await billingApi.topupInvoice(id)
        const bytes = Uint8Array.from(atob(invoice.pdf), (c) => c.charCodeAt(0))
        saveBlob(new Blob([bytes], { type: "application/pdf" }), invoice.filename)
      } else {
        saveBlob(
          await billingApi.downloadStatement(id, kind === "statement-pdf" ? "pdf" : "excel"),
          `credit-statement-${month}.${kind === "statement-pdf" ? "pdf" : "xlsx"}`,
        )
      }
    } catch {
      toast.error("Could not download the document. Please try again.")
    } finally {
      setDownloading(null)
    }
  }
  const invoiceColumns: ColumnDef<CreditPurchase>[] = [
    dateColumn<CreditPurchase>({
      id: "date",
      header: "Paid",
      accessor: (p) => p.paid_at ?? p.created_at,
    }),
    textColumn<CreditPurchase>({
      id: "credits",
      header: "Credits",
      accessor: (p) => credits(p.credits),
    }),
    textColumn<CreditPurchase>({
      id: "base",
      header: "Top-up amount",
      accessor: (p) => paiseToInr(p.base_amount),
    }),
    textColumn<CreditPurchase>({
      id: "gst",
      header: "GST",
      accessor: (p) => paiseToInr(p.gst_amount),
    }),
    textColumn<CreditPurchase>({
      id: "total",
      header: "Total paid",
      accessor: (p) => paiseToInr(p.total_amount),
    }),
    {
      id: "download",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={downloading !== null}
          onClick={() => void download(row.original.id, "invoice")}
        >
          Download GST invoice
        </Button>
      ),
    },
  ]
  const statementColumns: ColumnDef<CreditStatement>[] = [
    textColumn<CreditStatement>({ id: "month", header: "Month (UTC)", accessor: (s) => s.month }),
    textColumn<CreditStatement>({
      id: "opening",
      header: "Opening balance",
      accessor: (s) => credits(s.opening_balance),
    }),
    textColumn<CreditStatement>({
      id: "added",
      header: "Added",
      accessor: (s) => credits(s.credits_added),
    }),
    textColumn<CreditStatement>({
      id: "used",
      header: "Billed resource usage",
      accessor: (s) => credits(s.usage_credits),
    }),
    textColumn<CreditStatement>({
      id: "closing",
      header: "Closing balance",
      accessor: (s) => credits(s.closing_balance),
    }),
    {
      id: "download",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={downloading !== null}
            onClick={() => void download(row.original.id, "statement-pdf", row.original.month)}
          >
            Download PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={downloading !== null}
            onClick={() => void download(row.original.id, "statement", row.original.month)}
          >
            Download Excel
          </Button>
        </div>
      ),
    },
  ]
  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="topup-invoices-title">
        <h2 id="topup-invoices-title" className="text-lg font-semibold">
          Top-up GST invoices
        </h2>
        <p className="text-sm text-muted-foreground">
          1 credit = ₹1. GST is charged when you top up. Subscriptions and runtime consume credits.
        </p>
        <DataTable
          data={(purchases.data ?? []).filter((p) => p.status === "paid")}
          columns={invoiceColumns}
          loading={purchases.isLoading}
          error={purchases.isError ? "Could not load top-up invoices" : undefined}
          onRetry={() => void purchases.refetch()}
          onRefresh={() => void purchases.refetch()}
          getRowId={(p) => p.id}
          empty={<EmptyState icon={FileText} title="No paid top-ups yet" />}
        />
      </section>
      <section className="space-y-3" aria-labelledby="credit-statements-title">
        <h2 id="credit-statements-title" className="text-lg font-semibold">
          Monthly credit-usage statements
        </h2>
        <p className="text-sm text-muted-foreground">
          One consolidated monthly statement covers billed resources across all services. Hourly
          usage is cumulative. Free usage, credit grants and fully reversed charges are excluded
          from the line items. No additional GST or payment is due. Late usage appears in the month
          it was charged.
        </p>
        <DataTable
          data={statements.data ?? []}
          columns={statementColumns}
          loading={statements.isLoading}
          error={statements.isError ? "Could not load statements" : undefined}
          onRetry={() => void statements.refetch()}
          onRefresh={() => void statements.refetch()}
          getRowId={(s) => s.id}
          empty={<EmptyState icon={FileText} title="Statements appear after month-end" />}
        />
      </section>
    </div>
  )
}
