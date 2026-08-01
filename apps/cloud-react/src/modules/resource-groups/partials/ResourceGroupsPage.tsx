import { useId } from "react"

import { Skeleton } from "@DataDack/common-ui"
import { FolderTree, Plus, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  EmptyState,
  PageHeader,
  type StatCardProps,
  StatGrid,
  staggerDelay,
} from "@/components/console"
import { Button } from "@datadack/common-ui"
import { useScreen } from "@/services/api/screen"

import { RG_ROUTES } from "../resource-groups.constants"
import { useResourceGroups } from "../resource-groups.hooks"
import { ResourceGroupCard } from "./ResourceGroupCard"

export function ResourceGroupsPage() {
  useScreen("resource-groups")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: groups = [], isLoading, isError, refetch, isFetching } = useResourceGroups()
  const id = useId()
  // Backend has no per-group resource count, so the "resources" stat is omitted.
  const stats: StatCardProps[] = [
    { label: t("resourceGroups.stats.total"), value: groups.length, loading: isLoading },
    {
      label: t("resourceGroups.stats.active"),
      value: groups.filter((g) => g.status === "active").length,
      color: "success",
      loading: isLoading,
    },
  ]

  const renderContent = () => {
    if (isError) {
      return (
        <div className="glass-2 p-12 flex flex-col items-center gap-4 text-center animate-content-enter">
          <p className="text-destructive font-medium">{t("common.error")}</p>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      )
    }
    if (isLoading) {
      return (
        <div className="flex flex-wrap gap-5 items-start">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`${id}-skeleton-${String(i)}`}
              className="glass-2 p-5 space-y-4 w-full sm:w-85"
            >
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      )
    }
    if (groups.length === 0) {
      return (
        <EmptyState
          icon={FolderTree}
          title={t("resourceGroups.empty")}
          description={t("resourceGroups.emptySubtitle")}
          action={{
            label: t("resourceGroups.create"),
            onClick: () => void navigate(RG_ROUTES.CREATE),
          }}
          className="glass-2"
        />
      )
    }
    return (
      <div className="flex flex-wrap gap-5 items-start">
        {groups.map((rg, index) => (
          <div
            key={rg.id}
            className="w-full sm:w-85 animate-content-enter"
            style={staggerDelay(index)}
          >
            <ResourceGroupCard rg={rg} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FolderTree}
        breadcrumbs={[
          { label: t("resourceGroups.breadcrumb", "Platform") },
          { label: t("resourceGroups.title") },
        ]}
        title={t("resourceGroups.title")}
        description={t("resourceGroups.subtitle")}
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
            <Button
              variant="gold"
              onClick={() => void navigate(RG_ROUTES.CREATE)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("resourceGroups.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      {renderContent()}
    </div>
  )
}
