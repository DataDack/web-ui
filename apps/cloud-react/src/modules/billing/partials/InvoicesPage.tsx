import { useCallback, useMemo, useState } from "react"

import { Button } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, FileText } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import {
  dateColumn,
  EmptyState,
  nameColumn,
  ResourceTable,
  statusColumn,
  textColumn,
} from "@/components/console"

import { useInvoices } from "../billing.hooks"
import { billingService } from "../billing.service"
import type { Invoice } from "../billing.types"
import { inr } from "../billing.utils"

export function InvoicesPage() {
  const { t } = useTranslation()
  const { data: invoices = [], isLoading, isError, refetch } = useInvoices()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const downloadPdf = useCallback(
    async (inv: Invoice) => {
      setDownloadingId(inv.id)
      try {
        await billingService.downloadInvoicePdf(inv.id, inv.invoice_number)
      } catch {
        toast.error(t("billing.toasts.pdfFailed"))
      } finally {
        setDownloadingId(null)
      }
    },
    [t],
  )

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      nameColumn<Invoice>({
        header: t("billing.columns.invoice"),
        accessor: (i) => i.invoice_number,
      }),
      dateColumn<Invoice>({
        id: "issued",
        header: t("billing.columns.issued"),
        accessor: (i) => i.issued_at ?? i.created_at,
        responsive: "md",
      }),
      textColumn<Invoice>({
        id: "subtotal",
        header: t("billing.columns.subtotal"),
        accessor: (i) => inr(i.subtotal),
        mono: true,
        responsive: "lg",
      }),
      textColumn<Invoice>({
        id: "tax",
        header: t("billing.columns.gst"),
        accessor: (i) => inr(i.tax),
        mono: true,
        responsive: "md",
      }),
      textColumn<Invoice>({
        id: "total",
        header: t("billing.columns.total"),
        accessor: (i) => inr(i.total),
        mono: true,
      }),
      statusColumn<Invoice>({
        header: t("billing.columns.status"),
        accessor: (i) => i.status,
      }),
      {
        id: "actions",
        header: "",
        meta: { interactive: true },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={downloadingId === row.original.id}
            onClick={() => void downloadPdf(row.original)}
          >
            <Download className="mr-1.5 size-4" />
            {t("billing.actions.downloadPdf")}
          </Button>
        ),
      },
    ],
    [t, downloadingId, downloadPdf],
  )

  return (
    <ResourceTable<Invoice>
      data={invoices}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      getRowId={(i) => i.id}
      initialSorting={[{ id: "issued", desc: true }]}
      emptyState={<EmptyState icon={FileText} title={t("billing.invoices.empty")} />}
    />
  )
}
