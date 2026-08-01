import { useMemo, useState } from "react"

import { Badge } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Cpu,
  Disc,
  HardDrive,
  Package,
  RefreshCw,
  Rocket,
  Search,
  Store,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  actionsColumn,
  EmptyState,
  FadeIn,
  PageHeader,
  ResourceTable,
  StatGrid,
} from "@/components/console"
import { Button, Input } from "@datadack/common-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useImageCatalog } from "@/modules/catalog/catalog.hooks"
import type { ImageCatalogFamily } from "@/modules/catalog/catalog.types"
import { OSIcon } from "@/modules/catalog/os-icons"
import { useScreen } from "@/services/api/screen"

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

  const [query, setQuery] = useState("")

  const images = useMemo(() => flattenImages(families), [families])

  const filtered = useMemo(() => {
    if (!query.trim()) return images
    const q = query.toLowerCase()
    return images.filter(
      (img) =>
        img.name.toLowerCase().includes(q) ||
        img.family.toLowerCase().includes(q) ||
        img.os_version.toLowerCase().includes(q) ||
        img.architecture.toLowerCase().includes(q),
    )
  }, [images, query])

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
        <TabsList variant="line">
          <TabsTrigger value="system" className="gap-1.5">
            <Disc className="size-3.5" />
            {t("vms.images.tabs.system", "System images")}
          </TabsTrigger>
          <TabsTrigger value="my-amis" className="gap-1.5">
            <Package className="size-3.5" />
            {t("vms.images.tabs.myAmis", "My AMIs")}
            <SoonBadge />
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Store className="size-3.5" />
            {t("vms.images.tabs.marketplace", "Marketplace AMIs")}
            <SoonBadge />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-3 space-y-5">
          <StatGrid stats={stats} />

          <ResourceTable<CatalogImage>
            data={filtered}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            getRowId={(image) => image.id}
            enableColumnVisibility
            toolbar={
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                  }}
                  placeholder={t("vms.images.searchPlaceholder")}
                  className="pl-8 h-8 text-[13px]"
                />
              </div>
            }
            emptyState={
              <EmptyState
                icon={Disc}
                title={t("vms.images.empty")}
                description={t("vms.images.emptySubtitle")}
              />
            }
          />
        </TabsContent>

        <TabsContent value="my-amis" className="mt-3">
          <ComingSoonPanel
            icon={Package}
            title={t("vms.images.myAmis.title", "My AMIs")}
            description={t(
              "vms.images.myAmis.description",
              "Create custom AMIs from your instances and reuse them to launch identical machines. This feature is on its way.",
            )}
          />
        </TabsContent>

        <TabsContent value="marketplace" className="mt-3">
          <ComingSoonPanel
            icon={Store}
            title={t("vms.images.marketplace.title", "Marketplace AMIs")}
            description={t(
              "vms.images.marketplace.description",
              "Launch instances from pre-configured third-party images — databases, app stacks, and appliances. This feature is on its way.",
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Tiny "Soon" pill rendered inside a tab trigger for not-yet-live surfaces. */
function SoonBadge() {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      className="ml-0.5 h-4 px-1.5 font-mono text-[9px] uppercase tracking-wider text-brand-gold border-brand-gold/40"
    >
      {t("console.comingSoon.badge", "Coming soon")}
    </Badge>
  )
}

/** In-tab "coming soon" placeholder — the ComingSoon page body without its
 *  PageHeader (this page already renders one above the tabs). */
function ComingSoonPanel({
  icon: Icon,
  title,
  description,
}: Readonly<{ icon: LucideIcon; title: string; description: string }>) {
  const { t } = useTranslation()
  return (
    <FadeIn className="flex flex-col items-center justify-center rounded-xl glass-1 border border-dashed border-border/60 px-6 py-20 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl glass-2">
        <Icon className="size-6 text-brand-gold" />
      </div>
      <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-gold/90">
        {t("console.comingSoon.badge", "Coming soon")}
      </span>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">{description}</p>
    </FadeIn>
  )
}
