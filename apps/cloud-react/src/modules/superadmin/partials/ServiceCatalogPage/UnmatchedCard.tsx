import {
  Badge,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@datadack/common-ui"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { UnmatchedGroup } from "./group-modules"
import { ModuleList } from "./ModuleList"
import type { CatalogModuleAdmin, ServiceState } from "../../superadmin.types"

/**
 * A sidebar group whose key names no catalog service.
 *
 * Deliberately visible, like the unassigned-nodes section on the cluster page:
 * these modules still control real nav items, but nothing here sets a Console
 * home tile for them — either the catalog row was never created, or the two
 * vocabularies drifted apart again.
 */
export function UnmatchedCard({
  group,
  open,
  onOpenChange,
  onEditModule,
  onSetModuleState,
  moduleEmptyLabel,
}: Readonly<{
  group: UnmatchedGroup
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditModule: (mod: CatalogModuleAdmin) => void
  onSetModuleState: (id: string, state: ServiceState) => void
  moduleEmptyLabel: string
}>) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-dashed border-amber-500/30 bg-card">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-center gap-1.5 p-2.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-90",
                )}
              />
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {group.labelKey ? t(group.labelKey) : group.serviceKey}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {group.serviceKey}
                  </Badge>
                  <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-600 dark:text-amber-400">
                    {t("superAdmin.serviceCatalog.unmatchedBadge")}
                  </Badge>
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {t("superAdmin.serviceCatalog.moduleCount", { count: group.modules.length })}
                </span>
              </span>
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border p-2">
            <p className="px-3 pb-1.5 text-[11px] text-muted-foreground">
              {t("superAdmin.serviceCatalog.unmatchedSubtitle")}
            </p>
            <ModuleList
              modules={group.modules}
              onEdit={onEditModule}
              onSetState={onSetModuleState}
              emptyLabel={moduleEmptyLabel}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
