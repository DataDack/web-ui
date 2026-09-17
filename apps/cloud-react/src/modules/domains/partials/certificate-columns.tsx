import { dateColumn } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"
import { RefreshCw } from "lucide-react"

import type { Certificate } from "../certificates.types"
import { ExpiryText, SourceBadge } from "./CertificateFacts"
import { CertificateStatusBadge } from "./CertificateStatusBadge"

export function buildCertificateColumns(t: TFunction): ColumnDef<Certificate>[] {
  return [
    {
      id: "subject",
      accessorFn: (c) => c.subject,
      header: () => t("domains.certificates.columns.domain"),
      enableSorting: false,
      cell: ({ row }) => {
        const cert = row.original
        const extra = cert.sans.filter((name) => name !== cert.subject).length
        return (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-[13px]">{cert.subject}</span>
            {extra > 0 && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("domains.certificates.moreNames", { count: extra })}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "status",
      accessorFn: (c) => c.status,
      header: () => t("domains.certificates.columns.status"),
      enableSorting: false,
      cell: ({ row }) => (
        <CertificateStatusBadge status={row.original.status} autoRenew={row.original.auto_renew} />
      ),
    },
    {
      id: "source",
      accessorFn: (c) => c.source,
      header: () => t("domains.certificates.columns.type"),
      enableSorting: false,
      meta: { responsive: "md" },
      cell: ({ row }) => <SourceBadge cert={row.original} t={t} />,
    },
    {
      id: "renewal",
      accessorFn: (c) => c.auto_renew,
      header: () => t("domains.certificates.columns.renewal"),
      enableSorting: false,
      meta: { responsive: "lg" },
      cell: ({ row }) =>
        row.original.auto_renew ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3" />
            {t("domains.certificates.autoRenew")}
          </span>
        ) : (
          <span className="text-xs text-status-warning">
            {t("domains.certificates.manualRenew")}
          </span>
        ),
    },
    {
      id: "expires",
      accessorFn: (c) => c.not_after ?? "",
      header: () => t("domains.certificates.columns.expires"),
      enableSorting: false,
      cell: ({ row }) => <ExpiryText cert={row.original} t={t} />,
    },
    dateColumn<Certificate>({
      header: t("domains.certificates.columns.issued"),
      accessor: (c) => c.issued_at ?? "",
      responsive: "xl",
    }),
  ]
}
