import { Skeleton } from "@DataDack/common-ui"
import { FolderKanban, Info, Layers, Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams, useSearchParams } from "react-router-dom"

import { DetailPage, KeyValueGrid, Section, TagList } from "@/components/console"
import { Button } from "@/components/ui/button"
import { useScreen } from "@/services/api/screen"

import { useResourceGroup$ } from "../resource-groups.hooks"
import type { ResourceGroup } from "../resource-groups.types"
import { EditResourceGroupSheet } from "./EditResourceGroupSheet"
import { ResourceGroupResourcesTab } from "./ResourceGroupResourcesTab"

export function ResourceGroupDetailPage() {
  useScreen("resource-groups.resource-group-detail")
  const { t } = useTranslation()
  const { id = "" } = useParams()
  const { data: group, isLoading } = useResourceGroup$(id)
  const [searchParams, setSearchParams] = useSearchParams()

  // Drive the edit sheet from the URL so the list view can deep-link straight
  // into editing (e.g. ?edit=1) without an effect to sync local state.
  const editOpen = searchParams.get("edit") === "1"
  const setEditOpen = (open: boolean) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (open) next.set("edit", "1")
        else next.delete("edit")
        return next
      },
      { replace: true },
    )
  }

  if (isLoading || !group) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <DetailPage
        backTo="/resource-groups"
        backLabel={t("resourceGroups.title")}
        icon={FolderKanban}
        title={group.name}
        status={group.status}
        id={group.id}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditOpen(true)
            }}
          >
            <Pencil className="size-3.5" />
            {t("resourceGroups.form.edit")}
          </Button>
        }
        tabs={[
          {
            value: "resources",
            label: t("resourceGroups.resources.tab"),
            icon: Layers,
            content: <ResourceGroupResourcesTab groupId={group.id} />,
          },
          {
            value: "overview",
            label: t("vms.tabs.overview"),
            icon: Info,
            content: <OverviewTab group={group} />,
          },
        ]}
      />
      <EditResourceGroupSheet
        key={group.updatedAt}
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

function OverviewTab({ group }: Readonly<{ group: ResourceGroup }>) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <Section variant="panel" title={t("vms.detail.configuration")}>
        {/* displayName / resourceCount / isDefault are not provided by the
                    backend, so those rows are omitted. */}
        <KeyValueGrid
          columns={3}
          items={[
            {
              label: t("resourceGroups.form.name"),
              value: group.name,
              mono: true,
            },
            {
              label: t("common.created"),
              value: new Date(group.createdAt).toLocaleString(),
            },
            {
              label: t("common.updated"),
              value: new Date(group.updatedAt).toLocaleString(),
            },
          ]}
        />
        {group.description && (
          <p className="mt-4 text-sm text-muted-foreground">{group.description}</p>
        )}
      </Section>

      <Section variant="panel" title={t("console.tags.label")}>
        <TagList tags={group.tags} />
      </Section>
    </div>
  )
}
