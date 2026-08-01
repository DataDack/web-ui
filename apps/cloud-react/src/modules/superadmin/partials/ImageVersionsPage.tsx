import { useMemo, useState, type ReactNode } from "react"

import { Label, Switch, Textarea } from "@DataDack/common-ui"
import { Badge, Skeleton } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  Disc3,
  FileArchive,
  HardDrive,
  Hash,
  Pencil,
  Plus,
  Star,
  Store,
  Trash2,
} from "lucide-react"
import { motion } from "motion/react"
import { Controller, useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod/v4"

import {
  ConfirmDialog,
  CreateWizard,
  EmptyState,
  KeyValueGrid,
  PageHeader,
  StatusBadge,
  type WizardStep,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { cn } from "@/lib/utils"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminImages, useDeleteImageVersion, useSaveImageVersion } from "../superadmin.hooks"
import type {
  AddImageVersionRequest,
  Image,
  ImageVersion,
  UpdateImageVersionRequest,
} from "../superadmin.types"

const LIST_PATH = "/admin/images"
const ARCHITECTURES = ["x86_64", "arm64"] as const
const VISIBILITIES = ["public", "private"] as const
const STATUSES = ["available", "building", "deprecated"] as const

const schema = z.object({
  name: z.string().min(2, "Min 2 characters").max(128),
  description: z.string().max(512),
  os_version: z.string().max(64),
  architecture: z.enum(ARCHITECTURES),
  ami_file: z.string().max(512),
  vmid: z.coerce
    .number()
    .int()
    .min(0)
    .refine((value) => value === 0 || value >= 100, "VMID must be 0 (unset) or ≥ 100"),
  min_disk_gb: z.coerce.number().int().min(0),
  visibility: z.enum(VISIBILITIES),
  status: z.enum(STATUSES),
  is_default: z.boolean(),
  is_marketplace: z.boolean(),
})

type FormValues = z.infer<typeof schema>
type PageMode = { kind: "list" } | { kind: "create" } | { kind: "edit"; version: ImageVersion }
// Kept in ?status= rather than component state, so a filtered catalogue is a URL
// an operator can share or come back to.
const STATUS_FILTERS = ["all", ...STATUSES] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const EMPTY: FormValues = {
  name: "",
  description: "",
  os_version: "",
  architecture: "x86_64",
  ami_file: "",
  vmid: 0,
  min_disk_gb: 0,
  visibility: "private",
  status: "available",
  is_default: false,
  is_marketplace: false,
}

function valuesFromVersion(version: ImageVersion): FormValues {
  return {
    name: version.name,
    description: version.description ?? "",
    os_version: version.os_version ?? "",
    architecture: ARCHITECTURES.includes(version.architecture as (typeof ARCHITECTURES)[number])
      ? (version.architecture as (typeof ARCHITECTURES)[number])
      : "x86_64",
    ami_file: version.ami_file ?? "",
    vmid: version.vmid ?? 0,
    min_disk_gb: version.min_disk_gb,
    visibility: version.visibility,
    status: STATUSES.includes(version.status as (typeof STATUSES)[number])
      ? (version.status as (typeof STATUSES)[number])
      : "available",
    is_default: version.is_default,
    is_marketplace: version.is_marketplace,
  }
}

function optional(value: string) {
  return value.length > 0 ? value : undefined
}

function textOrDash(value: string | undefined) {
  return value && value.length > 0 ? value : "-"
}

function textOrFallback(value: string | undefined, fallback: string) {
  return value && value.length > 0 ? value : fallback
}

export function ImageVersionsPage() {
  useScreen("superadmin.image-versions")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { imageId } = useParams<{ imageId: string }>()
  const { data: images = [], isLoading, isError, refetch } = useAdminImages()
  const { mutate: remove, isPending: isDeleting } = useDeleteImageVersion()

  const [mode, setMode] = useState<PageMode>({ kind: "list" })
  const [deleting, setDeleting] = useState<ImageVersion | null>(null)
  const [statusFilter, setStatusFilter] = useQueryParamState<StatusFilter>(
    "status",
    STATUS_FILTERS,
    "all",
  )

  const image = useMemo(
    // The API serialises the image id as a JSON number (Go uint) while the
    // route param is a string, so compare them as strings to avoid a
    // strict-equality miss that would wrongly render "Image not found".
    () => images.find((candidate) => candidate.id === imageId) ?? null,
    [images, imageId],
  )

  const statusCounts = useMemo(() => {
    const versions = image?.versions ?? []
    return {
      all: versions.length,
      available: versions.filter((v) => v.status === "available").length,
      building: versions.filter((v) => v.status === "building").length,
      deprecated: versions.filter((v) => v.status === "deprecated").length,
    }
  }, [image])

  const visibleVersions = useMemo(() => {
    const versions = image?.versions ?? []
    if (statusFilter === "all") return versions
    return versions.filter((version) => version.status === statusFilter)
  }, [image, statusFilter])

  const renderVersions = () => {
    if (!image) return null
    if (image.versions.length === 0) {
      return (
        <div className="glass-1">
          <EmptyState
            icon={Plus}
            title={t("superAdmin.images.versions.empty")}
            description={t("superAdmin.images.versions.emptySubtitle")}
            action={{
              label: t("superAdmin.images.versions.add"),
              onClick: () => {
                setMode({ kind: "create" })
              },
            }}
          />
        </div>
      )
    }
    if (visibleVersions.length === 0) {
      return (
        <p className="glass-1 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("superAdmin.images.versions.filters.noMatch")}
        </p>
      )
    }
    return (
      <div className="grid gap-3 xl:grid-cols-2">
        {visibleVersions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            onEdit={() => {
              setMode({ kind: "edit", version })
            }}
            onDelete={() => {
              setDeleting(version)
            }}
          />
        ))}
      </div>
    )
  }

  const backToImages = () => void navigate(LIST_PATH)
  const backToList = () => {
    setMode({ kind: "list" })
  }

  const confirmDelete = () => {
    if (!image || !deleting) return
    remove(
      { imageId: image.id, versionId: deleting.id },
      {
        onSuccess: () => {
          setDeleting(null)
        },
      },
    )
  }

  if (mode.kind !== "list" && image) {
    return (
      <VersionWizard
        key={mode.kind === "edit" ? `edit-${mode.version.id}` : `create-${image.id}`}
        image={image}
        mode={mode}
        onCancel={backToList}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Disc3}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.images.title"), to: LIST_PATH },
          { label: t("superAdmin.images.versions.title") },
        ]}
        title={
          image
            ? t("superAdmin.images.versions.pageTitle", {
                name: image.display_name,
              })
            : t("superAdmin.images.versions.title")
        }
        description={
          image
            ? t("superAdmin.images.versions.subtitle", {
                name: image.display_name,
              })
            : t("superAdmin.images.versions.subtitleFallback")
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={backToImages}>
              <ArrowLeft className="size-4" />
              {t("superAdmin.images.versions.backToImages")}
            </Button>
            {image && (
              <Button
                onClick={() => {
                  setMode({ kind: "create" })
                }}
              >
                <Plus className="size-4" />
                {t("superAdmin.images.versions.add")}
              </Button>
            )}
          </div>
        }
      />

      {isLoading && <VersionsLoading />}

      {isError && (
        <div className="glass-1 flex flex-col items-center justify-center px-6 py-14 text-center">
          <p className="mb-3 text-sm text-muted-foreground">{t("console.table.error")}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t("console.table.retry")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && !image && (
        <div className="glass-1">
          <EmptyState
            icon={Disc3}
            title={t("superAdmin.images.versions.noImage")}
            description={t("superAdmin.images.versions.noImageSubtitle")}
            action={{
              label: t("superAdmin.images.versions.backToImages"),
              onClick: backToImages,
            }}
          />
        </div>
      )}

      {!isLoading && !isError && image && (
        <>
          <ImageFamilySummary image={image} />

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("superAdmin.images.versions.catalogTitle")}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {t("superAdmin.images.versions.catalogSubtitle")}
                </p>
              </div>
              <Badge
                variant="outline"
                className="w-fit font-mono text-[11px] text-muted-foreground"
              >
                {image.versions.length} {t("superAdmin.images.fields.versions")}
              </Badge>
            </div>

            <Tabs
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter)
              }}
            >
              <TabsList variant="line">
                <TabsTrigger value="all">
                  {t("superAdmin.images.versions.filters.all")} ({statusCounts.all})
                </TabsTrigger>
                <TabsTrigger value="available">
                  {t("superAdmin.images.versions.status.available")} ({statusCounts.available})
                </TabsTrigger>
                {statusCounts.building > 0 && (
                  <TabsTrigger value="building">
                    {t("superAdmin.images.versions.status.building")} ({statusCounts.building})
                  </TabsTrigger>
                )}
                <TabsTrigger value="deprecated">
                  {t("superAdmin.images.versions.status.deprecated")} ({statusCounts.deprecated})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {renderVersions()}
          </section>
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(next) => {
          if (!next) setDeleting(null)
        }}
        title={t("superAdmin.images.versions.deleteTitle")}
        description={t("superAdmin.images.versions.deleteDescription", {
          name: deleting?.name ?? "",
        })}
        confirmLabel={t("superAdmin.actions.delete")}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />
    </div>
  )
}

function VersionsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}

function ImageFamilySummary({ image }: Readonly<{ image: Image }>) {
  const { t } = useTranslation()

  return (
    <div className="glass-1 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <ImageIcon image={image} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">
                {image.display_name}
              </h2>
              <ActiveBadge active={image.is_active} />
            </div>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">
              {textOrFallback(image.description, t("superAdmin.images.versions.noDescription"))}
            </p>
          </div>
        </div>
        <KeyValueGrid
          columns={3}
          className="md:min-w-[360px]"
          items={[
            {
              label: t("superAdmin.images.versions.familySlug"),
              value: image.name,
              mono: true,
            },
            {
              label: t("superAdmin.images.fields.sortOrder"),
              value: String(image.sort_order),
              mono: true,
            },
            {
              label: t("superAdmin.images.fields.versions"),
              value: String(image.versions.length),
              mono: true,
            },
          ]}
        />
      </div>
    </div>
  )
}

function ImageIcon({ image }: Readonly<{ image: Image }>) {
  if (image.icon_url) {
    return (
      <img
        src={image.icon_url}
        alt=""
        className="size-11 rounded-md border border-border-glass bg-background object-contain p-1"
      />
    )
  }

  return (
    <div className="flex size-11 items-center justify-center rounded-md border border-border-glass bg-muted/45">
      <Disc3 className="size-4 text-muted-foreground" />
    </div>
  )
}

function VersionCard({
  version,
  onEdit,
  onDelete,
}: Readonly<{
  version: ImageVersion
  onEdit: () => void
  onDelete: () => void
}>) {
  const { t } = useTranslation()

  return (
    <motion.div
      layout
      className={cn(
        "glass-1 px-3.5 py-3",
        version.is_default ? "gradient-ring" : "hover:bg-accent/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{version.name}</h3>
            {version.is_default && (
              <Badge
                variant="outline"
                className="border-brand-gold/35 bg-brand-gold-soft text-[11px]"
              >
                <Star className="size-3" />
                {t("superAdmin.images.versions.fields.isDefault")}
              </Badge>
            )}
            {version.is_marketplace && (
              <Badge
                variant="outline"
                className="border-border-glass bg-surface-container/40 text-[11px] text-muted-foreground"
              >
                <Store className="size-3" />
                {t("superAdmin.images.versions.fields.isMarketplace")}
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            {textOrFallback(version.description, t("superAdmin.images.versions.noDescription"))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("superAdmin.actions.edit")}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("superAdmin.actions.delete")}
            onClick={onDelete}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={version.status} />
        <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
          {t(`superAdmin.images.visibility.${version.visibility}`)}
        </Badge>
        <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
          {textOrDash(version.os_version)} · {version.architecture}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <VersionDatum
          icon={<FileArchive className="size-3.5" />}
          label={t("superAdmin.images.versions.fields.amiFile")}
          value={textOrFallback(version.ami_file, t("superAdmin.images.versions.noFile"))}
        />
        <VersionDatum
          icon={<Hash className="size-3.5" />}
          label={t("superAdmin.images.versions.fields.vmid")}
          value={
            version.vmid && version.vmid > 0
              ? String(version.vmid)
              : t("superAdmin.images.versions.noVmid")
          }
        />
        <VersionDatum
          icon={<HardDrive className="size-3.5" />}
          label={t("superAdmin.images.versions.fields.minDisk")}
          value={t("superAdmin.images.versions.minDiskValue", {
            value: version.min_disk_gb,
          })}
        />
      </div>
    </motion.div>
  )
}

function VersionDatum({
  icon,
  label,
  value,
}: Readonly<{
  icon: ReactNode
  label: string
  value: string
}>) {
  return (
    <div className="rounded-md border border-border-glass bg-surface-container/25 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="truncate font-mono text-[12px] text-foreground" title={value}>
        {value}
      </p>
    </div>
  )
}

function VersionWizard({
  image,
  mode,
  onCancel,
}: Readonly<{
  image: Image
  mode: Exclude<PageMode, { kind: "list" }>
  onCancel: () => void
}>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveImageVersion()
  const editing = mode.kind === "edit" ? mode.version : null

  const form = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing ? valuesFromVersion(editing) : EMPTY,
    mode: "onTouched",
  })

  const steps = useMemo<WizardStep<FormValues>[]>(
    () => [
      {
        id: "identity",
        title: t("superAdmin.images.versions.wizard.identity"),
        description: t("superAdmin.images.versions.wizard.identityDesc"),
        fields: ["name", "description", "os_version", "architecture"],
        render: (f) => <IdentityStep form={f} />,
        reviewItems: (values) => [
          {
            label: t("superAdmin.images.versions.fields.name"),
            value: values.name,
          },
          {
            label: t("superAdmin.images.versions.fields.description"),
            value: textOrDash(values.description),
          },
          {
            label: t("superAdmin.images.versions.fields.osVersion"),
            value: textOrDash(values.os_version),
            mono: true,
          },
          {
            label: t("superAdmin.images.versions.fields.architecture"),
            value: values.architecture,
            mono: true,
          },
        ],
      },
      {
        id: "source",
        title: t("superAdmin.images.versions.wizard.source"),
        description: t("superAdmin.images.versions.wizard.sourceDesc"),
        fields: ["ami_file", "vmid", "min_disk_gb"],
        render: (f) => <SourceStep form={f} />,
        reviewItems: (values) => [
          {
            label: t("superAdmin.images.versions.fields.amiFile"),
            value:
              values.ami_file.length > 0 ? values.ami_file : t("superAdmin.images.versions.noFile"),
            mono: true,
          },
          {
            label: t("superAdmin.images.versions.fields.vmid"),
            value: values.vmid > 0 ? String(values.vmid) : t("superAdmin.images.versions.noVmid"),
            mono: true,
          },
          {
            label: t("superAdmin.images.versions.fields.minDisk"),
            value: t("superAdmin.images.versions.minDiskValue", {
              value: values.min_disk_gb,
            }),
            mono: true,
          },
        ],
      },
      {
        id: "availability",
        title: t("superAdmin.images.versions.wizard.availability"),
        description: t("superAdmin.images.versions.wizard.availabilityDesc"),
        fields: ["visibility", "status", "is_default", "is_marketplace"],
        render: (f) => <AvailabilityStep form={f} editing={!!editing} />,
        reviewItems: (values) => {
          const items = [
            {
              label: t("superAdmin.images.versions.fields.visibility"),
              value: t(`superAdmin.images.visibility.${values.visibility}`),
            },
            {
              label: t("superAdmin.images.versions.fields.isDefault"),
              value: values.is_default
                ? t("superAdmin.images.versions.yes")
                : t("superAdmin.images.versions.no"),
            },
            {
              label: t("superAdmin.images.versions.fields.isMarketplace"),
              value: values.is_marketplace
                ? t("superAdmin.images.versions.yes")
                : t("superAdmin.images.versions.no"),
            },
          ]
          if (editing) {
            items.push({
              label: t("superAdmin.images.versions.fields.status"),
              value: t(`superAdmin.images.versions.status.${values.status}`),
            })
          }
          return items
        },
      },
    ],
    [editing, t],
  )

  const onSubmit = (values: FormValues) => {
    const payload: AddImageVersionRequest | UpdateImageVersionRequest = {
      name: values.name,
      description: optional(values.description),
      os_version: optional(values.os_version),
      architecture: values.architecture,
      ami_file: optional(values.ami_file),
      vmid: values.vmid > 0 ? values.vmid : undefined,
      min_disk_gb: values.min_disk_gb,
      visibility: values.visibility,
      is_default: values.is_default,
      is_marketplace: values.is_marketplace,
      ...(editing ? { status: values.status } : {}),
    }

    save(
      { imageId: image.id, versionId: editing?.id, payload },
      {
        onSuccess: onCancel,
      },
    )
  }

  return (
    <div>
      <PageHeader
        icon={Disc3}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.images.title"), to: LIST_PATH },
          {
            label: image.display_name,
            to: `/admin/images/${image.id}/versions`,
          },
          {
            label: editing
              ? t("superAdmin.images.versions.editTitle")
              : t("superAdmin.images.versions.createTitle"),
          },
        ]}
        title={
          editing
            ? t("superAdmin.images.versions.editFor", { name: editing.name })
            : t("superAdmin.images.versions.addTo", { name: image.display_name })
        }
        description={t("superAdmin.images.versions.wizard.description")}
      />

      <div className="mb-6 max-w-2xl">
        <ImageContextCard image={image} />
      </div>

      <CreateWizard<FormValues, z.input<typeof schema>>
        steps={steps}
        form={form}
        submitLabel={editing ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
        isSubmitting={isPending}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </div>
  )
}

function ImageContextCard({ image }: Readonly<{ image: Image }>) {
  const { t } = useTranslation()

  return (
    <div className="glass-1 flex items-center gap-3 px-3.5 py-3">
      <ImageIcon image={image} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{image.display_name}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {image.name} · {image.versions.length} {t("superAdmin.images.fields.versions")}
        </p>
      </div>
      <ActiveBadge active={image.is_active} />
    </div>
  )
}

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

function FieldLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

function IdentityStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>{t("superAdmin.images.versions.fields.name")} *</FieldLabel>
          <Input {...form.register("name")} placeholder="Ubuntu 22.04 LTS" />
          <FieldError message={form.formState.errors.name?.message} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>{t("superAdmin.images.versions.fields.osVersion")}</FieldLabel>
          <Input {...form.register("os_version")} placeholder="22.04" />
          <FieldError message={form.formState.errors.os_version?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.images.versions.fields.description")}</FieldLabel>
        <Textarea {...form.register("description")} rows={3} />
        <FieldError message={form.formState.errors.description?.message} />
      </div>

      <div className="space-y-1.5 max-w-xs">
        <FieldLabel>{t("superAdmin.images.versions.fields.architecture")}</FieldLabel>
        <Controller
          control={form.control}
          name="architecture"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <span>{field.value}</span>
              </SelectTrigger>
              <SelectContent>
                {ARCHITECTURES.map((architecture) => (
                  <SelectItem key={architecture} value={architecture}>
                    {architecture}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={form.formState.errors.architecture?.message} />
      </div>
    </div>
  )
}

function SourceStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.images.versions.fields.amiFile")}</FieldLabel>
        <Input
          {...form.register("ami_file")}
          className="font-mono"
          placeholder="ubuntu-24.04-cloudinit"
        />
        <FieldError message={form.formState.errors.ami_file?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>{t("superAdmin.images.versions.fields.vmid")}</FieldLabel>
          <Input
            type="number"
            min={0}
            className="font-mono"
            placeholder="9000"
            {...form.register("vmid")}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("superAdmin.images.versions.fields.vmidHint")}
          </p>
          <FieldError message={form.formState.errors.vmid?.message} />
        </div>

        <div className="space-y-1.5">
          <FieldLabel>{t("superAdmin.images.versions.fields.minDisk")}</FieldLabel>
          <Input type="number" min={0} {...form.register("min_disk_gb")} />
          <FieldError message={form.formState.errors.min_disk_gb?.message} />
        </div>
      </div>
    </div>
  )
}

function AvailabilityStep({
  form,
  editing,
}: Readonly<{ form: UseFormReturn<FormValues>; editing: boolean }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>{t("superAdmin.images.versions.fields.visibility")}</FieldLabel>
          <Controller
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <span>{t(`superAdmin.images.visibility.${field.value}`)}</span>
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITIES.map((visibility) => (
                    <SelectItem key={visibility} value={visibility}>
                      {t(`superAdmin.images.visibility.${visibility}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.visibility?.message} />
        </div>

        {editing && (
          <div className="space-y-1.5">
            <FieldLabel>{t("superAdmin.images.versions.fields.status")}</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <span>{t(`superAdmin.images.versions.status.${field.value}`)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`superAdmin.images.versions.status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={form.formState.errors.status?.message} />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <VersionSwitch
          title={t("superAdmin.images.versions.fields.isDefault")}
          description={t("superAdmin.images.versions.fields.isDefaultHint")}
          control={
            <Controller
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t("superAdmin.images.versions.fields.isDefault")}
                />
              )}
            />
          }
        />
        <VersionSwitch
          title={t("superAdmin.images.versions.fields.isMarketplace")}
          description={t("superAdmin.images.versions.fields.isMarketplaceHint")}
          control={
            <Controller
              control={form.control}
              name="is_marketplace"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t("superAdmin.images.versions.fields.isMarketplace")}
                />
              )}
            />
          }
        />
      </div>
    </div>
  )
}

function VersionSwitch({
  title,
  description,
  control,
}: Readonly<{
  title: string
  description: string
  control: ReactNode
}>) {
  return (
    <div className="glass-1 flex items-center justify-between gap-4 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  )
}
