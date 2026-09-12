import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Ban, CheckCircle2, Clock, ListTree, RefreshCw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import {
  actionsColumn,
  Button,
  cn,
  DataTable,
  EmptyState,
  Input,
  nameColumn,
  type RowAction,
  textColumn,
} from "@datadack/common-ui"

import { useAdminServiceModules, useUpdateServiceModuleState } from "../superadmin.hooks"
import type { CatalogModuleAdmin, ServiceState } from "../superadmin.types"

const STATE_STYLES: Record<ServiceState, string> = {
  enabled: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  coming_soon: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  disabled: "border-border-glass bg-muted/50 text-muted-foreground",
}

function StateBadge({ state }: Readonly<{ state: ServiceState }>) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STATE_STYLES[state],
      )}
    >
      {t(`superAdmin.services.states.${state}`)}
    </span>
  )
}

/** The two transitions that are not already this module's state. */
function buildModuleActions(
  mod: CatalogModuleAdmin,
  t: (k: string) => string,
  setState: (id: string, state: ServiceState) => void,
): RowAction<CatalogModuleAdmin>[] {
  const all: { state: ServiceState; label: string; icon: typeof Ban }[] = [
    { state: "enabled", label: t("superAdmin.services.actions.enable"), icon: CheckCircle2 },
    { state: "coming_soon", label: t("superAdmin.services.actions.comingSoon"), icon: Clock },
    { state: "disabled", label: t("superAdmin.services.actions.disable"), icon: Ban },
  ]
  return all
    .filter((a) => a.state !== mod.state)
    .map((a) => ({
      label: a.label,
      icon: a.icon,
      destructive: a.state === "disabled",
      onAction: (row: CatalogModuleAdmin) => { setState(row.id, a.state); },
    }))
}

/**
 * Per-nav-item visibility for the tenant console sidebar.
 *
 * Sibling of the Services table, one level down: Services controls whether a
 * whole product appears, this controls the individual pages inside it. The row
 * set mirrors the frontend's sidebar definition — a nav item with no row here
 * simply keeps whatever the frontend declares, so this table adds control
 * without becoming a second place navigation can break.
 *
 * There is no create/delete here on purpose. Rows exist because the frontend
 * ships a nav item; inventing one in the admin would produce a row that points
 * at nothing.
 */
export function ServiceModulesPage() {
  useScreen("superadmin.serviceModules")
  const { t } = useTranslation()
  const { data: modules = [], isLoading, isError, refetch, isFetching } = useAdminServiceModules()
  const { mutate: setModuleState } = useUpdateServiceModuleState()

  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return modules
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.service_key.toLowerCase().includes(q) ||
        m.path.toLowerCase().includes(q),
    )
  }, [modules, query])

  const columns = useMemo<ColumnDef<CatalogModuleAdmin>[]>(() => {
    return [
      nameColumn<CatalogModuleAdmin>({
        header: t("superAdmin.serviceModules.fields.name"),
        accessor: (m) => m.name,
      }),
      textColumn<CatalogModuleAdmin>({
        id: "service_key",
        header: t("superAdmin.serviceModules.fields.service"),
        accessor: (m) => m.service_key,
        mono: true,
      }),
      textColumn<CatalogModuleAdmin>({
        id: "path",
        header: t("superAdmin.serviceModules.fields.path"),
        accessor: (m) => m.path,
        mono: true,
        muted: true,
        responsive: "md",
      }),
      {
        id: "state",
        header: () => t("superAdmin.services.fields.state"),
        cell: ({ row }) => <StateBadge state={row.original.state} />,
      },
      actionsColumn<CatalogModuleAdmin>({
        ariaLabel: t("console.table.actions"),
        actions: (mod) =>
          buildModuleActions(mod, t, (id, state) => { setModuleState({ id, payload: { state } }); }),
      }),
    ]
  }, [t, setModuleState])

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ListTree}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.serviceModules.title") },
        ]}
        title={t("superAdmin.serviceModules.title")}
        description={t("superAdmin.serviceModules.subtitle")}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={t("common.refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          placeholder={t("superAdmin.serviceModules.searchPlaceholder")}
          aria-label={t("superAdmin.serviceModules.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <DataTable<CatalogModuleAdmin>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(m) => m.id}
        empty={
          <EmptyState
            icon={ListTree}
            title={t("superAdmin.serviceModules.empty")}
            description={t("superAdmin.serviceModules.emptySubtitle")}
          />
        }
      />
    </div>
  )
}
