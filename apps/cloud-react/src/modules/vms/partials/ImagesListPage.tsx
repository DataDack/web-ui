import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Cpu, Disc, HardDrive, RefreshCw, Rocket } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PageHeader, StatGrid } from "@/components/console"
import { useImageCatalog } from "@/modules/catalog/catalog.hooks"
import type { ImageCatalogFamily } from "@/modules/catalog/catalog.types"
import { OSIcon } from "@/modules/catalog/os-icons"
import { useScreen } from "@/services/api/screen"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@datadack/common-ui"

import { VMS_ROUTES } from "../vms.constants"

/** One selectable system image (AMI), flattened from a catalog family version. */
interface CatalogImage {
  /** The version (AMI) id used when launching an instance. */
  id: string
  /** Image display name, falling back to "<family> <version>". */
  name: string
  /** Owning OS family (e.g. Ubuntu) display name. */
  family: string
  /** Raw family key, used to resolve the built-in brand glyph. */
  familyKey: string
  /** Family's catalog icon (CDN-hosted); preferred over the glyph. */
  iconUrl?: string
  os_version: string
  architecture: string
  min_disk_gb: number
  is_default: boolean
}

/** Flatten the OS-family catalog into one row per image version (AMI). */
function flattenImages(families: ImageCatalogFamily[]): CatalogImage[] {
  return families.flatMap((family) =>
    family.versions.map((v) => ({
      id: v.id,
      name: v.name || `${family.display_name} ${v.os_version}`,
      family: family.display_name,
      familyKey: family.name,
      iconUrl: family.icon_url || undefined,
      os_version: v.os_version,
      architecture: v.architecture,
      min_disk_gb: v.min_disk_gb,
      is_default: v.is_default,
    })),
  )
}

export function ImagesListPage() {
  useScreen("vms.images")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: families = [], isLoading, isError, refetch, isFetching } = useImageCatalog()

  const images = useMemo(() => flattenImages(families), [families])

  const stats = useMemo(
    () => [
      { label: t("vms.images.stats.total"), value: images.length, loading: isLoading },
      {
        label: t("vms.images.stats.families"),
        value: families.length,
        loading: isLoading,
      },
      {
        label: t("vms.images.stats.architectures"),
        value: new Set(images.map((i) => i.architecture).filter(Boolean)).size,
        loading: isLoading,
      },
    ],
    [images, families.length, isLoading, t],
  )

  const columns = useMemo<ColumnDef<CatalogImage>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.images.columns.name")}
          </span>
        ),
        accessorFn: (i) => i.name,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <OSIcon
              osFamily={row.original.familyKey}
              iconUrl={row.original.iconUrl}
              className="size-6 shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] leading-tight text-foreground">
                {row.original.name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {row.original.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "family",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.images.columns.family")}
          </span>
        ),
        accessorFn: (i) => i.family,
        cell: ({ row }) => (
          <span className="text-[13px] text-foreground">{row.original.family}</span>
        ),
        meta: { responsive: "md" },
      },
      {
        id: "version",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.images.columns.version")}
          </span>
        ),
        accessorFn: (i) => i.os_version,
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-muted-foreground">
            {row.original.os_version || "—"}
          </span>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "architecture",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.images.columns.architecture")}
          </span>
        ),
        accessorFn: (i) => i.architecture,
        cell: ({ row }) =>
          row.original.architecture ? (
            <Badge
              variant="outline"
              className="w-fit font-mono text-[11px] bg-accent/20 border-accent/40 text-accent-foreground"
            >
              <Cpu className="size-3 mr-1" />
              {row.original.architecture}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: { responsive: "md" },
      },
      {
        id: "minDisk",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.images.columns.minDisk")}
          </span>
        ),
        accessorFn: (i) => i.min_disk_gb,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 font-mono text-[12px] text-foreground">
            <HardDrive className="size-3 text-muted-foreground" />
            {row.original.min_disk_gb > 0 ? `${String(row.original.min_disk_gb)} GB` : "—"}
          </span>
        ),
        meta: { responsive: "lg" },
      },
      actionsColumn<CatalogImage>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("vms.images.useToCreate"),
            icon: Rocket,
            onAction: () => void navigate(VMS_ROUTES.CREATE),
          },
        ],
      }),
    ],
    [navigate, t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Disc}
        breadcrumbs={[{ label: t("console.nav.groups.compute") }, { label: t("vms.images.title") }]}
        title={t("vms.images.title")}
        description={t("vms.images.subtitle")}
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

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system" className="gap-1.5">
            <Disc className="size-3.5" />
            {t("vms.images.tabs.system", "System images")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-3 space-y-5">
          <StatGrid stats={stats} />

          <DataTable<CatalogImage>
            data={images}
            columns={columns}
            loading={isLoading}
            error={isError ? t("console.table.error") : undefined}
            onRetry={() => void refetch()}
            retryLabel={t("console.table.retry")}
            getRowId={(image) => image.id}
            columnToolbar
            columnToolbarLabel={t("console.table.columns")}
            searchable
            searchPlaceholder={t("vms.images.searchPlaceholder")}
            empty={
              <EmptyState
                icon={Disc}
                title={t("vms.images.empty")}
                description={t("vms.images.emptySubtitle")}
              />
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
