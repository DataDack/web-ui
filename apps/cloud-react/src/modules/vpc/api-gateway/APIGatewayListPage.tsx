import { useCallback, useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  CopyButton,
  DataTable,
  dateColumn,
  EmptyState,
  Input,
  type RowAction,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Copy,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Webhook,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { ConfirmDialog, PageHeader, SegmentedControl, StatGrid } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { APIGW_ROUTES } from "./apigw.constants"
import { useAPIs, useDeleteAPI, useExportAPIDefinition } from "./apigw.hooks"
import type { APIGateway } from "./apigw.types"
import { ApiKeysPanel } from "./partials/ApiKeysPanel"
import { CustomDomainsPanel } from "./partials/CustomDomainsPanel"
import { ImportApiDialog } from "./partials/ImportApiDialog"
import { UsagePlansPanel } from "./partials/UsagePlansPanel"
import { VpcLinksPanel } from "./partials/VpcLinksPanel"

type Panel = "apis" | "domains" | "keys" | "plans" | "links"
const PANELS: Panel[] = ["apis", "domains", "keys", "plans", "links"]
const protocolLabel = (value: string) => (value === "WEBSOCKET" ? "WebSocket" : value)

export function APIGatewayListPage() {
  useScreen("vpc.api-gateway")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requested = params.get("panel") as Panel
  const panel = PANELS.includes(requested) ? requested : "apis"
  const { data: apis = [], isLoading, isError, isFetching, refetch } = useAPIs()
  const { mutate: remove, isPending: deleting } = useDeleteAPI()
  const { mutateAsync: exportDefinition } = useExportAPIDefinition()
  const [query, setQuery] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [toDelete, setToDelete] = useState<APIGateway | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? apis.filter((api) => `${api.name} ${api.api_endpoint}`.toLowerCase().includes(q))
      : apis
  }, [apis, query])
  const stats = useMemo(
    () => [
      { label: t("apiGateway.stats.total"), value: apis.length, loading: isLoading },
      {
        label: t("apiGateway.stats.http"),
        value: apis.filter((a) => a.protocol_type === "HTTP").length,
        loading: isLoading,
      },
      {
        label: t("apiGateway.stats.rest"),
        value: apis.filter((a) => a.protocol_type === "REST").length,
        loading: isLoading,
      },
      {
        label: t("apiGateway.stats.websocket"),
        value: apis.filter((a) => a.protocol_type === "WEBSOCKET").length,
        loading: isLoading,
      },
    ],
    [apis, isLoading, t],
  )

  // Memoized because the columns memo closes over it: recreated every render, it
  // would either force the column definitions to rebuild on each keystroke or,
  // left out of the dependency list, capture a stale export client.
  const downloadDefinition = useCallback(
    async (api: APIGateway) => {
      const exported = await exportDefinition(api.id)
      const blob = new Blob([exported.body], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${api.name}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    },
    [exportDefinition],
  )
  const columns = useMemo<ColumnDef<APIGateway>[]>(
    () => [
      {
        id: "name",
        accessorFn: (a: APIGateway) => a.name,
        header: () => t("apiGateway.columns.name"),
        meta: { interactive: true },
        cell: ({ row }) => (
          <Link
            to={APIGW_ROUTES.detail(row.original.id)}
            className="font-medium text-status-info hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "protocol",
        header: () => t("apiGateway.columns.protocol"),
        cell: ({ row }) => (
          <Badge variant="outline">{protocolLabel(row.original.protocol_type)}</Badge>
        ),
      },
      {
        id: "url",
        header: () => t("apiGateway.columns.invokeUrl"),
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <div className="flex max-w-72 items-center gap-2">
            <span className="truncate font-mono text-xs">{row.original.api_endpoint}</span>
            <CopyButton value={row.original.api_endpoint} />
          </div>
        ),
      },
      textColumn({
        id: "endpoint",
        header: t("apiGateway.columns.endpoint"),
        accessor: (a: APIGateway) => `${a.endpoint_type} · ${a.ip_address_type}`,
        responsive: "md",
      }),
      {
        id: "stages",
        header: () => t("apiGateway.columns.stages"),
        cell: ({ row }) => <Badge variant="secondary">{row.original.stages?.length ?? 0}</Badge>,
      },
      {
        id: "routes",
        header: () => t("apiGateway.columns.routes"),
        cell: ({ row }) => <Badge variant="secondary">{row.original.routes?.length ?? 0}</Badge>,
      },
      dateColumn({
        header: t("common.created"),
        accessor: (a: APIGateway) => a.created_at,
        responsive: "lg",
      }),
      actionsColumn({
        ariaLabel: t("console.table.actions"),
        actions: (api: APIGateway): RowAction<APIGateway>[] => [
          {
            label: t("apiGateway.actions.open"),
            icon: ExternalLink,
            onAction: () => void navigate(APIGW_ROUTES.detail(api.id)),
          },
          {
            label: t("apiGateway.actions.copyUrl"),
            icon: Copy,
            onAction: () => void navigator.clipboard.writeText(api.api_endpoint),
          },
          {
            label: t("apiGateway.actions.export"),
            icon: Download,
            onAction: () => void downloadDefinition(api),
          },
          {
            label: t("apiGateway.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: setToDelete,
          },
        ],
      }),
    ],
    [downloadDefinition, navigate, t],
  )

  const options = [
    { value: "apis" as const, label: t("apiGateway.panels.apis") },
    { value: "domains" as const, label: t("apiGateway.panels.domains") },
    { value: "keys" as const, label: t("apiGateway.panels.keys") },
    { value: "plans" as const, label: t("apiGateway.panels.plans") },
    { value: "links" as const, label: t("apiGateway.panels.links") },
  ]
  return (
    <div className="space-y-5">
      <PageHeader
        icon={Webhook}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("apiGateway.title") },
        ]}
        title={t("apiGateway.title")}
        description={t("apiGateway.description")}
        actions={
          <>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("common.refresh")}
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setImportOpen(true)
              }}
            >
              <Upload className="size-4" />
              {t("apiGateway.import.action")}
            </Button>
            <Button variant="gold" className="gap-2" asChild>
              <Link to={APIGW_ROUTES.CREATE}>
                <Plus className="size-4" />
                {t("apiGateway.create.action")}
              </Link>
            </Button>
          </>
        }
      />
      <SegmentedControl
        value={panel}
        onChange={(value) => {
          setParams(value === "apis" ? {} : { panel: value })
        }}
        options={options}
        ariaLabel={t("apiGateway.panels.label")}
        showLabels
      />
      {panel === "apis" && (
        <div className="space-y-5">
          <StatGrid stats={stats} className="grid-cols-2 lg:grid-cols-4" />
          <DataTable
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={isError ? t("console.table.error") : undefined}
            onRetry={() => void refetch()}
            retryLabel={t("console.table.retry")}
            getRowId={(a) => a.id}
            columnToolbar
            toolbar={
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                  }}
                  placeholder={t("apiGateway.search.placeholder")}
                  className="h-8 pl-8"
                />
              </div>
            }
            empty={
              <EmptyState
                icon={Webhook}
                title={t("apiGateway.empty.title")}
                description={t("apiGateway.empty.description")}
                action={{
                  label: t("apiGateway.create.action"),
                  onClick: () => void navigate(APIGW_ROUTES.CREATE),
                }}
              />
            }
            onRefresh={() => void refetch()}
            refreshLabel={t("console.table.refresh")}
            refreshing={isFetching}
          />
        </div>
      )}
      {panel === "domains" && <CustomDomainsPanel />}
      {panel === "keys" && <ApiKeysPanel />}
      {panel === "plans" && <UsagePlansPanel />}
      {panel === "links" && <VpcLinksPanel />}
      <ImportApiDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("apiGateway.delete.title")}
        description={t("apiGateway.delete.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("apiGateway.actions.delete")}
        loading={deleting}
        onConfirm={() => {
          if (toDelete)
            remove(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
        }}
      />
    </div>
  )
}
