import { useMemo, useState } from "react"

import { Button, EmptyState, Input, Skeleton } from "@datadack/common-ui"
import { ChevronsDownUp, ChevronsUpDown, LayoutGrid, Plus, RefreshCw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import type { CatalogModuleAdmin, CatalogServiceAdmin } from "../../superadmin.types"
import { ServiceFormSheet } from "../ServiceFormSheet"
import { groupModules, moduleMatches, serviceMatches } from "./group-modules"
import { ModuleStateSheet } from "./ModuleStateSheet"
import { type CardDrag, ServiceCard } from "./ServiceCard"
import { UnmatchedCard } from "./UnmatchedCard"
import {
  useAdminServiceModules,
  useAdminServices,
  useDeleteService,
  useReorderServices,
  useUpdateServiceModuleState,
  useUpdateServiceState,
} from "../../superadmin.hooks"

interface DropTarget {
  id: string
  below: boolean
}

/**
 * The service catalog and the sidebar modules inside each service, as one page.
 *
 * They were two sibling tables and the split cost more than it saved: the same
 * question — "why can't a tenant see this page" — had two possible answers on
 * two screens (the service is coming-soon, or that one nav item is), and the
 * flat module table repeated its service key on all sixty-odd rows. Here a
 * service is a row you expand to find its pages, and both levels are edited
 * through a sheet.
 */
export function ServiceCatalogPage() {
  useScreen("superadmin.serviceCatalog")
  const { t } = useTranslation()

  const services = useAdminServices()
  const modules = useAdminServiceModules()
  const { mutate: setServiceState } = useUpdateServiceState()
  const { mutate: setModuleState } = useUpdateServiceModuleState()
  const { mutate: removeService, isPending: isDeleting } = useDeleteService()
  const { mutate: reorderServices, isPending: isReordering } = useReorderServices()

  const [query, setQuery] = useState("")
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogServiceAdmin | null>(null)
  const [deleting, setDeleting] = useState<CatalogServiceAdmin | null>(null)
  const [editingModule, setEditingModule] = useState<CatalogModuleAdmin | null>(null)
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false)

  // Memoised because it is a useMemo dependency below: `?? []` would be a new
  // array, and so a new dependency, on every render.
  const serviceList = useMemo(() => services.data ?? [], [services.data])
  const q = query.trim().toLowerCase()

  // Grouped once, then filtered. A service that matches keeps all of its
  // modules — you searched for the service, so you want to see what is in it —
  // while a service that does not match is kept only for the modules that do.
  const { groups, unmatched } = useMemo(() => {
    const joined = groupModules(serviceList, modules.data ?? [])
    if (!q) {
      return {
        groups: joined.groups.map((g) => ({ ...g, shown: g.modules })),
        unmatched: joined.unmatched,
      }
    }
    return {
      groups: joined.groups
        .map((g) => ({
          ...g,
          shown: serviceMatches(g.service, q) ? g.modules : g.modules.filter((m) => moduleMatches(m, q)),
        }))
        .filter((g) => g.shown.length > 0 || serviceMatches(g.service, q)),
      unmatched: joined.unmatched
        .map((g) => ({ ...g, modules: g.modules.filter((m) => moduleMatches(m, q)) }))
        .filter((g) => g.modules.length > 0 || g.serviceKey.toLowerCase().includes(q)),
    }
  }, [serviceList, modules.data, q])

  // A search shows its hits open; without one, expansion is the operator's.
  const isOpen = (id: string) => q !== "" || openIds.has(id)
  const toggle = (id: string, open: boolean) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const visibleIds = [...groups.map((g) => g.service.id), ...unmatched.map((g) => g.serviceKey)]
  const allOpen = visibleIds.length > 0 && visibleIds.every((id) => isOpen(id))
  const toggleAll = () => {
    setOpenIds(allOpen ? new Set() : new Set(visibleIds))
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEditModule = (mod: CatalogModuleAdmin) => {
    setEditingModule(mod)
    setModuleSheetOpen(true)
  }

  const serviceActions = {
    t,
    onEdit: (svc: CatalogServiceAdmin) => {
      setEditing(svc)
      setFormOpen(true)
    },
    onSetState: (id: string, state: CatalogServiceAdmin["state"]) => {
      setServiceState({ id, payload: { state } })
    },
    // The quick PATCH takes state as required, so a status-only change sends
    // the row's current state back unchanged.
    onSetStatus: (svc: CatalogServiceAdmin, status: CatalogServiceAdmin["status"]) => {
      setServiceState({ id: svc.id, payload: { state: svc.state, status } })
    },
    onDelete: (svc: CatalogServiceAdmin) => {
      setDeleting(svc)
    },
  }

  // Searching hides cards, so the visible order is not the stored one and a drop
  // would write something the operator did not mean.
  const canDrag = q === "" && !isReordering

  // The whole list in its new order, which is the only shape the server takes:
  // it rejects anything that does not name every service exactly once.
  const commitMove = (from: number, to: number) => {
    if (from < 0 || to < 0 || to >= serviceList.length || from === to) return
    const ordered = [...serviceList]
    const moved = ordered.splice(from, 1)
    ordered.splice(to, 0, ...moved)
    reorderServices({ ordered })
  }

  const applyDrop = (targetId: string) => {
    const source = dragId
    setDragId(null)
    setDropTarget(null)
    if (!source) return
    const from = serviceList.findIndex((s) => s.id === source)
    const at = serviceList.findIndex((s) => s.id === targetId)
    if (from < 0 || at < 0) return
    // Landing below the target means one place further down — but only when
    // coming from above it, where removing the row first shifts everything up.
    let to = at + (dropTarget?.id === targetId && dropTarget.below ? 1 : 0)
    if (from < to) to -= 1
    commitMove(from, to)
  }

  // Which edge the insertion line goes on, or nothing when this card is not the
  // drop target of a drag in progress.
  const dropEdgeFor = (id: string): "above" | "below" | null => {
    if (dragId === null || dragId === id) return null
    if (dropTarget?.id !== id) return null
    return dropTarget.below ? "below" : "above"
  }

  const dragFor = (id: string): CardDrag => ({
    canDrag,
    dragging: dragId === id,
    dropEdge: dropEdgeFor(id),
    label: t("superAdmin.services.reorderRow"),
    blockedHint: t("superAdmin.serviceCatalog.reorderBlocked"),
    onDragStart: () => {
      setDragId(id)
    },
    onDragEnd: () => {
      setDragId(null)
      setDropTarget(null)
    },
    onDragOver: (below: boolean) => {
      setDropTarget((prev) => (prev?.id === id && prev.below === below ? prev : { id, below }))
    },
    onDrop: () => {
      applyDrop(id)
    },
    onMoveBy: (delta: number) => {
      const from = serviceList.findIndex((s) => s.id === id)
      commitMove(from, from + delta)
    },
  })

  const isLoading = services.isLoading || modules.isLoading
  const isFetching = services.isFetching || modules.isFetching
  const refetch = () => {
    void services.refetch()
    void modules.refetch()
  }

  return (
    <div className="space-y-3">
      <PageHeader
        icon={LayoutGrid}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.serviceCatalog.title") },
        ]}
        title={t("superAdmin.serviceCatalog.title")}
        description={t("superAdmin.serviceCatalog.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {t("superAdmin.services.add")}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
            placeholder={t("superAdmin.serviceCatalog.searchPlaceholder")}
            aria-label={t("superAdmin.serviceCatalog.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-1.5" onClick={toggleAll} disabled={q !== ""}>
          {allOpen ? (
            <ChevronsDownUp className="size-3.5" />
          ) : (
            <ChevronsUpDown className="size-3.5" />
          )}
          {allOpen
            ? t("superAdmin.serviceCatalog.collapseAll")
            : t("superAdmin.serviceCatalog.expandAll")}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (services.isError || modules.isError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] text-destructive">{t("console.table.error")}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
            {t("console.table.retry")}
          </Button>
        </div>
      )}

      {!isLoading && !services.isError && !modules.isError && (
        <div className="space-y-2">
          {groups.map((group) => (
            <ServiceCard
              key={group.service.id}
              service={group.service}
              modules={group.shown}
              moduleTotal={group.modules.length}
              open={isOpen(group.service.id)}
              onOpenChange={(open) => {
                toggle(group.service.id, open)
              }}
              actions={serviceActions}
              onEditModule={openEditModule}
              onSetModuleState={(id, state) => {
                setModuleState({ id, payload: { state } })
              }}
              moduleEmptyLabel={
                q === ""
                  ? t("superAdmin.serviceCatalog.noModules")
                  : t("superAdmin.serviceCatalog.noMatchingModules")
              }
              drag={dragFor(group.service.id)}
            />
          ))}

          {unmatched.map((group) => (
            <UnmatchedCard
              key={group.serviceKey}
              group={group}
              open={isOpen(group.serviceKey)}
              onOpenChange={(open) => {
                toggle(group.serviceKey, open)
              }}
              onEditModule={openEditModule}
              onSetModuleState={(id, state) => {
                setModuleState({ id, payload: { state } })
              }}
              moduleEmptyLabel={t("superAdmin.serviceCatalog.noMatchingModules")}
            />
          ))}

          {groups.length === 0 && unmatched.length === 0 && (
            <EmptyState
              icon={LayoutGrid}
              title={
                q === ""
                  ? t("superAdmin.services.empty")
                  : t("superAdmin.serviceCatalog.noMatches")
              }
              description={
                q === ""
                  ? t("superAdmin.services.emptySubtitle")
                  : t("superAdmin.serviceCatalog.noMatchesSubtitle")
              }
              action={q === "" ? { label: t("superAdmin.services.add"), onClick: openCreate } : undefined}
            />
          )}
        </div>
      )}

      <ServiceFormSheet open={formOpen} onOpenChange={setFormOpen} service={editing} />

      <ModuleStateSheet
        open={moduleSheetOpen}
        onOpenChange={setModuleSheetOpen}
        module={editingModule}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t("superAdmin.services.deleteTitle")}
        description={t("superAdmin.services.deleteConfirm", { name: deleting?.name ?? "" })}
        confirmLabel={t("superAdmin.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleting) return
          removeService(
            { id: deleting.id },
            {
              onSuccess: () => {
                setDeleting(null)
              },
            },
          )
        }}
      />
    </div>
  )
}
