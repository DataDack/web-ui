import { ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"

import { StateBadge } from "./catalog-badges"
import { buildModuleActions } from "./row-actions"
import { RowActionsMenu } from "./RowActionsMenu"
import type { CatalogModuleAdmin, ServiceState } from "../../superadmin.types"

interface ModuleListProps {
  modules: readonly CatalogModuleAdmin[]
  onEdit: (mod: CatalogModuleAdmin) => void
  onSetState: (id: string, state: ServiceState) => void
  /** Shown instead of rows — differs for a service with none and a search with none. */
  emptyLabel: string
}

/**
 * The sidebar pages inside one service.
 *
 * The row opens the module's sheet; the ellipsis flips its state in one click.
 * Both exist on purpose: the sheet is for reading what a state means before
 * changing it, the menu for an operator working down a list.
 */
export function ModuleList({ modules, onEdit, onSetState, emptyLabel }: Readonly<ModuleListProps>) {
  const { t } = useTranslation()

  if (modules.length === 0) {
    return <p className="px-3 py-3 text-[11px] text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="space-y-0.5">
      {modules.map((mod) => (
        <div
          key={mod.id}
          className="flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-muted/50"
        >
          <button
            type="button"
            onClick={() => {
              onEdit(mod)
            }}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
              {mod.name}
            </span>
            <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
              {mod.key}
            </span>
            <span className="hidden min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground md:inline">
              {mod.path}
            </span>
            <StateBadge state={mod.state} />
          </button>
          {mod.path ? (
            <a
              href={mod.path}
              target="_blank"
              rel="noreferrer"
              aria-label={t("superAdmin.serviceCatalog.openPage")}
              title={t("superAdmin.serviceCatalog.openPage")}
              className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <span className="size-7 shrink-0" aria-hidden />
          )}
          <RowActionsMenu
            row={mod}
            actions={buildModuleActions(mod, t, onSetState)}
            ariaLabel={t("console.table.actions")}
          />
        </div>
      ))}
    </div>
  )
}
