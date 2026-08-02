import { useMemo, useState } from "react"

import { Badge, Button, DataTable, dateColumn, Input, textColumn } from "@datadack/common-ui"
import { formatBytes } from "@datadack/serverless-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Layers, Plus, RefreshCw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { SERVERLESS_ROUTES } from "../serverless.constants"
import { useServerlessLayers } from "../serverless.hooks"
import type { LayerVersion } from "../serverless.types"

export function ServerlessLayersPage() {
  useScreen("serverless.layers-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch, isFetching } = useServerlessLayers()

  const layers = useMemo(() => data ?? [], [data])
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return layers
    const q = query.toLowerCase()
    return layers.filter(
      (layer) =>
        layer.name.toLowerCase().includes(q) ||
        (layer.description ?? "").toLowerCase().includes(q) ||
        (layer.compatibleRuntimes ?? []).some((rt) => rt.toLowerCase().includes(q)),
    )
  }, [layers, query])

  const columns = useMemo<ColumnDef<LayerVersion>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("serverless.columns.name")}
          </span>
        ),
        accessorFn: (layer) => layer.name,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Layers className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] leading-tight text-foreground font-mono">
                {row.original.name}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {row.original.description ?? "—"}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "version",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("serverless.columns.version")}
          </span>
        ),
        accessorFn: (layer) => layer.version,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            v{row.original.version}
          </Badge>
        ),
      },
      {
        id: "runtimes",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("serverless.columns.compatibleRuntimes")}
          </span>
        ),
        accessorFn: (layer) => (layer.compatibleRuntimes ?? []).join(","),
        cell: ({ row }) => {
          const runtimes = row.original.compatibleRuntimes ?? []
          if (runtimes.length === 0) return <span className="text-muted-foreground">—</span>
          return (
            <div className="flex flex-wrap gap-1">
              {runtimes.slice(0, 3).map((rt) => (
                <Badge key={rt} variant="secondary" className="font-mono text-[10px]">
                  {rt}
                </Badge>
              ))}
              {runtimes.length > 3 && (
                <span className="text-[11px] text-muted-foreground">
                  +{String(runtimes.length - 3)}
                </span>
              )}
            </div>
          )
        },
        meta: { responsive: "md" },
      },
      textColumn<LayerVersion>({
        id: "size",
        header: t("serverless.columns.size"),
        accessor: (layer) => formatBytes(layer.codeArtifact?.sizeBytes ?? 0),
        mono: true,
        muted: true,
        responsive: "lg",
      }),
      dateColumn<LayerVersion>({
        id: "published",
        header: t("serverless.columns.published"),
        accessor: (layer) => layer.createdAt ?? "",
        responsive: "xl",
      }),
    ],
    [t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Layers}
        breadcrumbs={[
          { label: t("console.nav.groups.serverless"), to: SERVERLESS_ROUTES.ROOT },
          { label: t("console.nav.items.layers") },
        ]}
        title={t("serverless.layers.title")}
        description={t("serverless.layers.subtitle")}
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
              className="gap-2"
              onClick={() => void navigate(SERVERLESS_ROUTES.LAYERS_PUBLISH)}
            >
              <Plus className="w-4 h-4" />
              {t("serverless.layers.publish")}
            </Button>
          </>
        }
      />

      <DataTable<LayerVersion>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        getRowId={(layer) => layer.id || `${layer.name}:${String(layer.version)}`}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("serverless.layers.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
      />
    </div>
  )
}
