import { useCallback, useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Disc3, Layers, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

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
import { Button } from "@datadack/common-ui"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminImages, useDeleteImage } from "../superadmin.hooks"
import type { Image } from "../superadmin.types"
import { ImageFormSheet } from "./ImageFormSheet"

// Kept in ?filter= rather than component state, so a filtered list is a URL an
// operator can share or come back to.
const ACTIVE_FILTERS = ["all", "active", "inactive"] as const
type ActiveFilter = (typeof ACTIVE_FILTERS)[number]

interface ImageActionHelpers {
  t: (key: string) => string
  onManageVersions: (image: Image) => void
  onEdit: (image: Image) => void
  onDelete: (image: Image) => void
}

function buildImageActions(helpers: ImageActionHelpers): RowAction<Image>[] {
  return [
    {
      label: helpers.t("superAdmin.images.versions.manage"),
      icon: Layers,
      onAction: helpers.onManageVersions,
    },
    { label: helpers.t("superAdmin.actions.edit"), icon: Pencil, onAction: helpers.onEdit },
    {
      label: helpers.t("superAdmin.actions.delete"),
      icon: Trash2,
      destructive: true,
      onAction: helpers.onDelete,
    },
  ]
}

export function ImagesPage() {
  useScreen("superadmin.images")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: images = [], isLoading, isError, refetch, isFetching } = useAdminImages()
  const { mutate: removeImage, isPending: isDeleting } = useDeleteImage()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Image | null>(null)
  const [deleting, setDeleting] = useState<Image | null>(null)
  const [activeFilter, setActiveFilter] = useQueryParamState<ActiveFilter>(
    "filter",
    ACTIVE_FILTERS,
    "all",
  )

  const counts = useMemo(
    () => ({
      all: images.length,
      active: images.filter((i) => i.is_active).length,
      inactive: images.filter((i) => !i.is_active).length,
    }),
    [images],
  )
  const visibleImages = useMemo(() => {
    if (activeFilter === "active") return images.filter((i) => i.is_active)
    if (activeFilter === "inactive") return images.filter((i) => !i.is_active)
    return images
  }, [images, activeFilter])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = useCallback((image: Image) => {
    setEditing(image)
    setFormOpen(true)
  }, [])
  const openVersions = useCallback(
    (image: Image) => {
      void navigate(`/admin/images/${image.id}/versions`)
    },
    [navigate],
  )

  const columns = useMemo<ColumnDef<Image>[]>(() => {
    const helpers: ImageActionHelpers = {
      t,
      onManageVersions: openVersions,
      onEdit: openEdit,
      onDelete: (image) => {
        setDeleting(image)
      },
    }
    return [
      {
        id: "icon",
        header: () => null,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.icon_url ? (
            <img
              src={row.original.icon_url}
              alt=""
              className="size-7 rounded-md border border-border-glass object-contain"
            />
          ) : (
            <div className="size-7 rounded-md border border-border-glass bg-muted/50" />
          ),
      },
      nameColumn<Image>({
        header: t("superAdmin.images.fields.name"),
        accessor: (i) => i.name,
      }),
      textColumn<Image>({
        id: "display_name",
        header: t("superAdmin.images.fields.displayName"),
        accessor: (i) => i.display_name,
      }),
      textColumn<Image>({
        id: "versions",
        header: t("superAdmin.images.fields.versions"),
        accessor: (i) => String(i.versions.length),
        muted: true,
        responsive: "md",
      }),
      textColumn<Image>({
        id: "vmids",
        header: t("superAdmin.images.fields.vmids"),
        accessor: (i) => {
          const ids = i.versions.filter((v) => (v.vmid ?? 0) > 0).map((v) => String(v.vmid))
          return ids.length > 0 ? ids.join(", ") : null
        },
        mono: true,
        muted: true,
        responsive: "md",
      }),
      textColumn<Image>({
        id: "sort_order",
        header: t("superAdmin.images.fields.sortOrder"),
        accessor: (i) => String(i.sort_order),
        muted: true,
        responsive: "lg",
      }),
      {
        id: "is_active",
        header: () => t("superAdmin.fields.active"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      actionsColumn<Image>({
        ariaLabel: t("console.table.actions"),
        actions: () => buildImageActions(helpers),
      }),
    ]
  }, [openEdit, openVersions, t])

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Disc3}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.images.title") }]}
        title={t("superAdmin.images.title")}
        description={t("superAdmin.images.formSubtitle")}
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
              {t("superAdmin.images.add")}
            </Button>
          </>
        }
      />

      <Tabs
        value={activeFilter}
        onValueChange={(value) => {
          setActiveFilter(value as ActiveFilter)
        }}
      >
        <TabsList variant="line">
          <TabsTrigger value="all">
            {t("superAdmin.images.filters.all")} ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="active">
            {t("superAdmin.images.filters.active")} ({counts.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            {t("superAdmin.images.filters.inactive")} ({counts.inactive})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ResourceTable<Image>
        data={visibleImages}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(i) => i.id}
        onRowClick={openVersions}
        emptyState={
          <EmptyState
            icon={Disc3}
            title={t("superAdmin.images.empty")}
            description={t("superAdmin.images.emptySubtitle")}
            action={{ label: t("superAdmin.images.add"), onClick: openCreate }}
          />
        }
      />

      <ImageFormSheet open={formOpen} onOpenChange={setFormOpen} image={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t("superAdmin.images.deleteTitle")}
        description={t("superAdmin.images.deleteDescription", {
          name: deleting?.display_name ?? "",
        })}
        confirmLabel={t("superAdmin.actions.delete")}
        confirmText={deleting?.name}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleting) return
          removeImage(
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
