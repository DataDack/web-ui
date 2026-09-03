import { Badge, CopyButton, dateColumn, textColumn } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"
import { CornerDownRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { StatusBadge, type ColumnMeta } from "@/components/console"
import { TONE_CLASSES } from "@/components/console/status-config"
import { LB_ROUTES } from "@/modules/load-balancers/load-balancers.constants"
import { MANAGED_APPS_ROUTES } from "@/modules/managed-apps/managed-apps.constants"
import { SERVERLESS_ROUTES } from "@/modules/serverless/serverless.constants"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"

import type { Domain } from "../domains.types"

/**
 * Where "Attached to" links. Functions are addressed by name (their detail
 * route is name-keyed); the rest by the resource row id. Null means there is
 * no navigable page for the attachment and the cell falls back to a copyable
 * raw id instead of a dead link.
 */
function resourceRoute(domain: Domain): string | null {
  switch (domain.type) {
    case "vm":
      return domain.resource_id ? VMS_ROUTES.detail(domain.resource_id) : null
    case "lb":
      return domain.resource_id ? LB_ROUTES.detail(domain.resource_id) : null
    case "app":
      return domain.resource_id ? MANAGED_APPS_ROUTES.projectDomains(domain.resource_id) : null
    case "func":
      return domain.function_name ? SERVERLESS_ROUTES.detail(domain.function_name) : null
    default:
      return null
  }
}

/** What the attachment reads as: named resources where known, otherwise the id. */
function resourceLabel(domain: Domain, resourceNames?: ReadonlyMap<string, string>): string {
  if (domain.type === "app") {
    return resourceNames?.get(domain.resource_id) ?? domain.resource_id
  }
  return domain.type === "func" && domain.function_name ? domain.function_name : domain.resource_id
}

function AttachedToCell({
  domain,
  link,
  resourceNames,
}: Readonly<{
  domain: Domain
  link: boolean
  resourceNames?: ReadonlyMap<string, string>
}>) {
  // Hooks first, before any conditional return.
  const { t } = useTranslation()
  const route = link ? resourceRoute(domain) : null
  const label = resourceLabel(domain, resourceNames)
  if (route) {
    return (
      <Link
        to={route}
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="max-w-56 truncate font-mono text-[12px] text-foreground hover:text-brand-gold hover:underline"
      >
        {label}
      </Link>
    )
  }
  // No navigable page — hand over the raw id instead of a dead link.
  if (domain.resource_id) {
    return <CopyButton value={domain.resource_id} copiedLabel={t("console.copy.copied")} />
  }
  return <span className="text-muted-foreground">—</span>
}

/**
 * The one column set both domain registry tables render. The superadmin table
 * asks for the extra Account column; everything else is identical, so the
 * tenant and admin pages can never drift apart on how a hostname row reads.
 */
export function buildDomainColumns(
  t: TFunction,
  options: {
    linkResources?: boolean
    forResource?: boolean
    resourceNames?: ReadonlyMap<string, string>
  } = {},
): ColumnDef<Domain>[] {
  // The tenant table links each attachment to its detail page. The superadmin
  // table must NOT: those routes fetch under the operator's own X-Account-Id,
  // so for any other tenant's resource the link lands on a not-found page.
  // There the cell degrades to the copyable raw id.
  const linkResources = options.linkResources ?? true
  const columns: ColumnDef<Domain>[] = [
    {
      id: "hostname",
      accessorFn: (d) => d.hostname,
      header: () => t("domains.columns.hostname"),
      enableSorting: false,
      // The copy button lives here; clicks on it must not bubble to the row.
      meta: { interactive: true } satisfies ColumnMeta,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <CopyButton value={row.original.hostname} copiedLabel={t("console.copy.copied")} />
            {row.original.is_primary && (
              <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("domains.primary")}
              </span>
            )}
          </div>
          {/* Where it actually goes, on the row. A hostname that redirects does
              NOT serve the resource this table is attached to, and a row that
              looks identical to its neighbours while answering 308 is the kind
              of configuration people rediscover during an incident. */}
          {row.original.policy?.redirect && (
            <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <CornerDownRight className="size-3 shrink-0" aria-hidden />
              <span className="shrink-0 rounded border border-border/60 px-1 py-px text-[10px]">
                {row.original.policy.redirect.status}
              </span>
              <span className="truncate">{row.original.policy.redirect.to}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      id: "source",
      accessorFn: (d) => d.managed,
      header: () => t("domains.columns.source"),
      enableSorting: false,
      cell: ({ row }) => (
        // managed=true is a SYSTEM-provided hostname (unremarkable, neutral);
        // managed=false is the tenant's own CUSTOM domain (info, worth a glance).
        <Badge
          variant="outline"
          className={`text-[11px] ${row.original.managed ? TONE_CLASSES.neutral : TONE_CLASSES.info}`}
        >
          {row.original.managed ? t("domains.source.system") : t("domains.source.custom")}
        </Badge>
      ),
    },
    textColumn<Domain>({
      id: "type",
      header: t("domains.columns.type"),
      accessor: (d) => t(`domains.types.${d.type}`, { defaultValue: d.type }),
      responsive: "md",
    }),
    {
      id: "attachedTo",
      accessorFn: (d) => resourceLabel(d, options.resourceNames),
      header: () => t("domains.columns.attachedTo"),
      enableSorting: false,
      meta: { interactive: true } satisfies ColumnMeta,
      cell: ({ row }) => (
        <AttachedToCell
          domain={row.original}
          link={linkResources}
          resourceNames={options.resourceNames}
        />
      ),
    },
    textColumn<Domain>({
      id: "region",
      header: t("domains.columns.region"),
      accessor: (d) => d.region,
      mono: true,
      muted: true,
      responsive: "lg",
    }),
    {
      id: "status",
      accessorFn: (d) => d.status,
      header: () => t("domains.columns.status"),
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} pulse={row.original.status === "active"} />
      ),
    },
    dateColumn<Domain>({
      header: t("common.created"),
      accessor: (d) => d.created_at,
      responsive: "xl",
    }),
  ]

  if (options.forResource) {
    // Embedded in one resource's own detail page, "attached to" answers a
    // question nobody asked — every row IS that resource — and the type column
    // repeats the page the reader is on. Drop both, keep everything else, so
    // the standalone and embedded tables cannot drift on how a row reads.
    //
    // Region goes with them, and for a third reason: it is EMPTY on every row
    // here. A hostname inherits its region from the resource it points at, and
    // a managed app's rows carry none — so the column rendered a full width of
    // em-dashes and read as data that had failed to load. Every row on this
    // table belongs to the resource whose page the reader is already on, so
    // even once it is populated it would only restate that page's own header.
    return columns.filter((c) => c.id !== "attachedTo" && c.id !== "type" && c.id !== "region")
  }

  // There is no owning-account column. This table is tenant-scoped: every row on
  // it belongs to the account reading it. The cross-tenant view, which is the only
  // place that question is worth asking, moved to the serverless console.

  return columns
}
