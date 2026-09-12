import {
  Badge,
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@datadack/common-ui"
import { ChevronRight, GripVertical } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ServiceIcon } from "@/modules/services/ServiceIcon"

import { HealthBadge, StateBadge } from "./catalog-badges"
import { ModuleList } from "./ModuleList"
import { buildServiceActions, type ServiceActionHandlers } from "./row-actions"
import { RowActionsMenu } from "./RowActionsMenu"
import type { CatalogModuleAdmin, CatalogServiceAdmin, ServiceState } from "../../superadmin.types"

/** Everything the page's drag-and-drop needs to wire into one card. */
export interface CardDrag {
  canDrag: boolean
  dragging: boolean
  /** Which edge to draw the insertion line on, if this card is the drop target. */
  dropEdge: "above" | "below" | null
  label: string
  blockedHint?: string
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (below: boolean) => void
  onDrop: () => void
  /** Keyboard reordering from the grip: -1 is one place up, 1 one place down. */
  onMoveBy: (delta: number) => void
}

interface ServiceCardProps {
  service: CatalogServiceAdmin
  modules: readonly CatalogModuleAdmin[]
  /** Total before the search filtered it, so the summary line stays honest. */
  moduleTotal: number
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: ServiceActionHandlers
  onEditModule: (mod: CatalogModuleAdmin) => void
  onSetModuleState: (id: string, state: ServiceState) => void
  moduleEmptyLabel: string
  drag: CardDrag
}

/**
 * One catalog service, and the sidebar pages inside it.
 *
 * The header is the service — the Console home tile, its state and whether it
 * is in maintenance. The body is what the sidebar shows once a tenant is inside
 * it. They used to be two admin pages, which meant answering "why can't they
 * see Kubernetes" took two places: the service could be coming-soon, or the one
 * nav item could be.
 */
export function ServiceCard({
  service,
  modules,
  moduleTotal,
  open,
  onOpenChange,
  actions,
  onEditModule,
  onSetModuleState,
  moduleEmptyLabel,
  drag,
}: Readonly<ServiceCardProps>) {
  const { t } = useTranslation()
  const soon = modules.filter((m) => m.state === "coming_soon").length
  const hidden = modules.filter((m) => m.state === "disabled").length

  return (
    <div
      data-service-card
      className={cn(
        "rounded-xl border border-border bg-card transition-opacity",
        drag.dragging && "opacity-40",
        drag.dropEdge === "above" && "shadow-[inset_0_2px_0_0_var(--primary)]",
        drag.dropEdge === "below" && "shadow-[inset_0_-2px_0_0_var(--primary)]",
      )}
      onDragOver={
        drag.canDrag
          ? (event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = "move"
              // Which half the pointer is over decides whether the drop lands
              // above or below, so a drop is unambiguous at both ends of the list.
              const box = event.currentTarget.getBoundingClientRect()
              drag.onDragOver(event.clientY > box.top + box.height / 2)
            }
          : undefined
      }
      onDrop={
        drag.canDrag
          ? (event) => {
              event.preventDefault()
              drag.onDrop()
            }
          : undefined
      }
    >
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-center gap-1.5 p-2.5">
          <button
            type="button"
            draggable={drag.canDrag}
            disabled={!drag.canDrag}
            aria-label={drag.label}
            title={drag.canDrag ? undefined : drag.blockedHint}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move"
              // Firefox ignores a drag that carries no data at all.
              event.dataTransfer.setData("text/plain", service.id)
              const card = event.currentTarget.closest("[data-service-card]")
              if (card instanceof HTMLElement) {
                event.dataTransfer.setDragImage(card, 24, card.clientHeight / 2)
              }
              drag.onDragStart()
            }}
            onDragEnd={drag.onDragEnd}
            onKeyDown={(event) => {
              // The grip is reachable by tab, so the order is reachable without
              // a pointer — a drag is the only other way to write it.
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
              event.preventDefault()
              drag.onMoveBy(event.key === "ArrowUp" ? -1 : 1)
            }}
            className="grid size-6 shrink-0 cursor-grab place-items-center rounded-md text-muted-foreground opacity-55 transition-opacity hover:bg-muted hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-25"
          >
            <GripVertical className="size-3.5" />
          </button>

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
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                <ServiceIcon name={service.icon} className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {service.name}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {service.key}
                  </Badge>
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono">{service.path || "—"}</span>
                  <span aria-hidden>·</span>
                  <span>{service.category}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {t("superAdmin.serviceCatalog.moduleCount", { count: moduleTotal })}
                  </span>
                  {soon > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      · {t("superAdmin.serviceCatalog.soonCount", { count: soon })}
                    </span>
                  )}
                  {hidden > 0 && (
                    <span>· {t("superAdmin.serviceCatalog.hiddenCount", { count: hidden })}</span>
                  )}
                </span>
              </span>
            </button>
          </CollapsibleTrigger>

          <div className="flex shrink-0 items-center gap-1.5">
            <StateBadge state={service.state} />
            <HealthBadge status={service.status} />
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-7 text-[11px] lg:inline-flex"
              onClick={() => {
                actions.onEdit(service)
              }}
            >
              {t("superAdmin.actions.edit")}
            </Button>
            <RowActionsMenu
              row={service}
              actions={buildServiceActions(service, actions)}
              ariaLabel={t("console.table.actions")}
            />
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 pb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("superAdmin.serviceCatalog.modulesHeading")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("superAdmin.serviceCatalog.modulesHint")}
              </p>
            </div>
            <ModuleList
              modules={modules}
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
