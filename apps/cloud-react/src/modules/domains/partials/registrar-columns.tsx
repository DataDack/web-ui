import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import { StatusBadge, type ColumnMeta } from "@/components/console"

import { Badge, CopyButton, dateColumn } from "@datadack/common-ui"

import type { RegisteredDomain } from "../registrar.types"

/**
 * Columns for the registrar table: one row per domain the account has claimed.
 *
 * Deliberately narrower than the hostname table's. A registration has no type,
 * no region and no attached resource — it is a name and a proof — and padding the
 * table with the hostname columns would suggest a registration routes traffic,
 * which is exactly the misunderstanding the two tables exist to keep apart.
 */
export function buildRegistrarColumns(t: TFunction): ColumnDef<RegisteredDomain>[] {
  return [
    {
      id: "domain",
      accessorFn: (d) => d.domain,
      header: () => t("domains.registrar.columns.domain"),
      enableSorting: false,
      // The copy button lives here; clicks on it must not bubble to the row.
      meta: { interactive: true } satisfies ColumnMeta,
      cell: ({ row }) => (
        <CopyButton value={row.original.domain} copiedLabel={t("console.copy.copied")} />
      ),
    },
    {
      id: "status",
      accessorFn: (d) => d.status,
      header: () => t("domains.registrar.columns.status"),
      cell: ({ row }) => (
        // "verified" is the resting state and the one worth a steady badge;
        // pending pulses because it is genuinely in flight and resolves on its
        // own once the tenant publishes the record.
        <StatusBadge
          status={row.original.status}
          pulse={row.original.status === "pending"}
        />
      ),
    },
    {
      id: "hostnames",
      accessorFn: (d) => d.hostnames.length,
      header: () => t("domains.registrar.columns.inUse"),
      enableSorting: false,
      cell: ({ row }) => {
        const count = row.original.hostnames.length
        if (count === 0) {
          // Not an error state — it is what every domain looks like between
          // being proven and being attached — so it reads as a dash, not a zero
          // badge demanding attention.
          return <span className="text-muted-foreground">—</span>
        }
        return (
          <Badge variant="outline" className="text-[11px]">
            {t("domains.registrar.hostnameCount", { count })}
          </Badge>
        )
      },
    },
    dateColumn<RegisteredDomain>({
      header: t("domains.registrar.columns.verifiedAt"),
      accessor: (d) => d.verified_at ?? "",
      responsive: "md",
    }),
    dateColumn<RegisteredDomain>({
      header: t("common.created"),
      accessor: (d) => d.created_at,
      responsive: "xl",
    }),
  ]
}
