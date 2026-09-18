import { useCallback, useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Construction, Disc3, Layers, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { useScreen } from "@/services/api/screen"

import {
  actionsColumn,
  Button,
  DataTable,
  EmptyState,
  nameColumn,
  type RowAction,
  Tabs,
  TabsList,
  TabsTrigger,
  textColumn,
} from "@datadack/common-ui"

import { ActiveBadge } from "../components/ActiveBadge"
import { sortVersionsByVmid } from "../image-utils"
import { useAdminImages, useDeleteImage, useReorderImages } from "../superadmin.hooks"
import type { Image } from "../superadmin.types"
import { ImageFormSheet } from "./ImageFormSheet"

// Kept in ?filter= rather than component state, so a filtered list is a URL an
// operator can share or come back to.
const ACTIVE_FILTERS = ["all", "active", "inactive"] as const
type ActiveFilter = (typeof ACTIVE_FILTERS)[number]

/**
 * What an image is FOR. Only "vm" is backed by anything today — the appliance
 * kinds are tabs over an empty shelf, put here so the shape of the page is
 * settled before the images behind them exist. Each one needs a catalog of its
 * own (an image carries no kind yet), so they stay deliberately inert rather
 * than filtering the VM list down to nothing and reading as a bug.
 */
const IMAGE_KINDS = [
  "vm",
  "load-balancer",
  "vpn-gateway",
  "firewall",
  "database",
  "k8s-control-plane",
  "k8s-worker",
] as const
type ImageKind = (typeof IMAGE_KINDS)[number]

// Tab label per kind. Kept beside the list so adding a kind is one edit.
const KIND_LABEL_KEYS: Record<ImageKind, string> = {
  vm: "superAdmin.images.kinds.vm",
  "load-balancer": "superAdmin.images.kinds.loadBalancer",
  "vpn-gateway": "superAdmin.images.kinds.vpnGateway",
  firewall: "superAdmin.images.kinds.firewall",
  database: "superAdmin.images.kinds.database",
  "k8s-control-plane": "superAdmin.images.kinds.k8sControlPlane",
  "k8s-worker": "superAdmin.images.kinds.k8sWorker",
}

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
  const { mutate: reorderImages, isPending: isReordering } = useReorderImages()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Image | null>(null)
  const [deleting, setDeleting] = useState<Image | null>(null)
  const [activeFilter, setActiveFilter] = useQueryParamState<ActiveFilter>(
    "filter",
    ACTIVE_FILTERS,
    "all",
  )
  const [kind, setKind] = useQueryParamState<ImageKind>("kind", IMAGE_KINDS, "vm")
  const isVMKind = kind === "vm"

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

  // A drag under the Active/Inactive tabs reorders only the rows on screen, so
  // the hidden families keep the slots they already held and the visible ones
  // are dealt back into the slots they occupied. Sending just the visible subset
  // would be refused — the server wants every family exactly once.
  const handleReorder = useCallback(
    (rows: Image[]) => {
      if (activeFilter === "all") {
        reorderImages({ ordered: rows })
        return
      }
      const moved = [...rows]
      const merged = images.map((image) =>
        rows.some((r) => r.id === image.id) ? (moved.shift() ?? image) : image,
      )
      reorderImages({ ordered: merged })
    },
    [activeFilter, images, reorderImages],
  )

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
          const ids = sortVersionsByVmid(i.versions)
            .filter((v) => (v.vmid ?? 0) > 0)
            .map((v) => String(v.vmid))
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
            {isVMKind && (
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" />
                {t("superAdmin.images.add")}
              </Button>
            )}
          </>
        }
      />

      <Tabs
        value={kind}
        onValueChange={(value) => {
          setKind(value as ImageKind)
        }}
      >
        <TabsList>
          {IMAGE_KINDS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(KIND_LABEL_KEYS[k])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isVMKind ? (
        <>
          <Tabs
            value={activeFilter}
            onValueChange={(value) => {
              setActiveFilter(value as ActiveFilter)
            }}
          >
            <TabsList>
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

          <DataTable<Image>
            data={visibleImages}
            columns={columns}
            loading={isLoading}
            error={isError ? t("console.table.error") : undefined}
            onRetry={() => void refetch()}
            retryLabel={t("console.table.retry")}
            getRowId={(i) => i.id}
            onRowClick={openVersions}
            reorder={{
              onReorder: handleReorder,
              disabled: isReordering,
              label: t("superAdmin.images.reorderRow"),
              blockedHint: t("superAdmin.images.reorderBlocked"),
            }}
            empty={
              <EmptyState
                icon={Disc3}
                title={t("superAdmin.images.empty")}
                description={t("superAdmin.images.emptySubtitle")}
                action={{ label: t("superAdmin.images.add"), onClick: openCreate }}
              />
            }
          />
        </>
      ) : (
        <EmptyState
          icon={Construction}
          title={t(KIND_LABEL_KEYS[kind])}
          description={t("superAdmin.images.kindComingSoon")}
        />
      )}

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
