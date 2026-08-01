import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Ban, CheckCircle2, Clock, LayoutGrid, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
    actionsColumn,
    ConfirmDialog,
    EmptyState,
    nameColumn,
    PageHeader,
    ResourceTable,
    textColumn,
    type RowAction,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useScreen } from "@/services/api/screen"

import { useAdminServices, useDeleteService, useUpdateServiceState } from "../superadmin.hooks"
import type { CatalogServiceAdmin, ServiceState } from "../superadmin.types"
import { ServiceFormSheet } from "./ServiceFormSheet"

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
                STATE_STYLES[state]
            )}
        >
            {t(`superAdmin.services.states.${state}`)}
        </span>
    )
}

interface ActionHelpers {
    t: (key: string) => string
    onEdit: (svc: CatalogServiceAdmin) => void
    onSetState: (id: string, state: ServiceState) => void
    onDelete: (svc: CatalogServiceAdmin) => void
}

// Row actions: edit, the two state transitions not already active, then delete.
// Kept at module scope so the column callback stays shallow (lint: nesting).
function buildServiceActions(
    svc: CatalogServiceAdmin,
    h: ActionHelpers
): RowAction<CatalogServiceAdmin>[] {
    const actions: RowAction<CatalogServiceAdmin>[] = [
        { label: h.t("superAdmin.actions.edit"), icon: Pencil, onAction: h.onEdit },
    ]
    if (svc.state !== "enabled") {
        actions.push({
            label: h.t("superAdmin.services.actions.enable"),
            icon: CheckCircle2,
            onAction: (s) => {
                h.onSetState(s.id, "enabled")
            },
        })
    }
    if (svc.state !== "coming_soon") {
        actions.push({
            label: h.t("superAdmin.services.actions.comingSoon"),
            icon: Clock,
            onAction: (s) => {
                h.onSetState(s.id, "coming_soon")
            },
        })
    }
    if (svc.state !== "disabled") {
        actions.push({
            label: h.t("superAdmin.services.actions.disable"),
            icon: Ban,
            onAction: (s) => {
                h.onSetState(s.id, "disabled")
            },
        })
    }
    actions.push({
        label: h.t("superAdmin.actions.delete"),
        icon: Trash2,
        destructive: true,
        onAction: h.onDelete,
    })
    return actions
}

export function ServicesPage() {
    useScreen("superadmin.services")
    const { t } = useTranslation()
    const { data: services = [], isLoading, isError, refetch, isFetching } = useAdminServices()
    const { mutate: setServiceState } = useUpdateServiceState()
    const { mutate: removeService, isPending: isDeleting } = useDeleteService()

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<CatalogServiceAdmin | null>(null)
    const [deleting, setDeleting] = useState<CatalogServiceAdmin | null>(null)

    const openCreate = () => {
        setEditing(null)
        setFormOpen(true)
    }
    const openEdit = (svc: CatalogServiceAdmin) => {
        setEditing(svc)
        setFormOpen(true)
    }

    const columns = useMemo<ColumnDef<CatalogServiceAdmin>[]>(() => {
        const helpers: ActionHelpers = {
            t,
            onEdit: openEdit,
            onSetState: (id, state) => {
                setServiceState({ id, payload: { state } })
            },
            onDelete: (svc) => {
                setDeleting(svc)
            },
        }
        return [
            nameColumn<CatalogServiceAdmin>({
                header: t("superAdmin.services.fields.name"),
                accessor: (s) => s.name,
            }),
            textColumn<CatalogServiceAdmin>({
                id: "key",
                header: t("superAdmin.services.fields.key"),
                accessor: (s) => s.key,
                muted: true,
            }),
            textColumn<CatalogServiceAdmin>({
                id: "category",
                header: t("superAdmin.services.fields.category"),
                accessor: (s) => s.category,
                muted: true,
                responsive: "md",
            }),
            {
                id: "state",
                header: () => t("superAdmin.services.fields.state"),
                enableSorting: false,
                cell: ({ row }) => <StateBadge state={row.original.state} />,
            },
            textColumn<CatalogServiceAdmin>({
                id: "metrics",
                header: t("superAdmin.services.fields.metrics"),
                accessor: (s) => String(s.metrics.length),
                muted: true,
                responsive: "lg",
            }),
            actionsColumn<CatalogServiceAdmin>({
                ariaLabel: t("console.table.actions"),
                actions: (svc) => buildServiceActions(svc, helpers),
            }),
        ]
    }, [t, setServiceState])

    return (
        <div className="space-y-5">
            <PageHeader
                icon={LayoutGrid}
                breadcrumbs={[
                    { label: t("superAdmin.title") },
                    { label: t("superAdmin.services.title") },
                ]}
                title={t("superAdmin.services.title")}
                description={t("superAdmin.services.formSubtitle")}
                actions={
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void refetch()}
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

            <ResourceTable<CatalogServiceAdmin>
                data={services}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(s) => s.id}
                onRowClick={openEdit}
                emptyState={
                    <EmptyState
                        icon={LayoutGrid}
                        title={t("superAdmin.services.empty")}
                        description={t("superAdmin.services.emptySubtitle")}
                        action={{ label: t("superAdmin.services.add"), onClick: openCreate }}
                    />
                }
            />

            <ServiceFormSheet open={formOpen} onOpenChange={setFormOpen} service={editing} />

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
                        }
                    )
                }}
            />
        </div>
    )
}
