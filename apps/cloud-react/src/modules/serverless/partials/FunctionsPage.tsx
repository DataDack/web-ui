import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Container, Package, Play, Plus, RefreshCw, Search, Trash2, Zap } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader, StatGrid } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import {
  actionsColumn,
  Button,
  DataTable,
  dateColumn,
  Input,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"
import { useDeleteFunction, useFunctions, type FunctionEntity } from "@datadack/serverless"

import { SERVERLESS_ROUTES } from "../serverless.constants"

export function ServerlessFunctionsPage() {
  useScreen("serverless.functions-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch, isFetching } = useFunctions()
  const { mutate: deleteFunction, isPending: isDeleting } = useDeleteFunction()

  const functions = useMemo(() => data ?? [], [data])
  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<FunctionEntity | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return functions
    const q = query.toLowerCase()
    return functions.filter(
      (fn) =>
        fn.name.toLowerCase().includes(q) ||
        (fn.runtime ?? "").toLowerCase().includes(q) ||
        fn.packageType.toLowerCase().includes(q),
    )
  }, [functions, query])

  const stats = useMemo(
    () => [
      { label: t("serverless.stats.total"), value: functions.length, loading: isLoading },
      {
        label: t("serverless.stats.active"),
        value: functions.filter((fn) => fn.state.toLowerCase() === "active").length,
        color: "success" as const,
        loading: isLoading,
      },
      {
        label: t("serverless.stats.images"),
        value: functions.filter((fn) => fn.packageType === "image").length,
        loading: isLoading,
      },
      {
        label: t("serverless.stats.zips"),
        value: functions.filter((fn) => fn.packageType !== "image").length,
        loading: isLoading,
      },
    ],
    [functions, isLoading, t],
  )

  const columns = useMemo<ColumnDef<FunctionEntity>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("serverless.columns.name")}
          </span>
        ),
        accessorFn: (fn) => fn.name,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.packageType === "image" ? (
              <Container className="size-5 shrink-0 text-muted-foreground" />
            ) : (
              <Package className="size-5 shrink-0 text-muted-foreground" />
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] leading-tight text-foreground font-mono">
                {row.original.name}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {row.original.packageType === "image"
                  ? t("serverless.form.image")
                  : (row.original.runtime ?? t("serverless.form.zip"))}
              </span>
            </div>
          </div>
        ),
      },
      statusColumn<FunctionEntity>({
        header: t("serverless.columns.state"),
        accessor: (fn) => fn.state,
        pulse: (fn) => fn.state.toLowerCase() === "active",
      }),
      textColumn<FunctionEntity>({
        id: "memory",
        header: t("serverless.columns.memory"),
        accessor: (fn) => (fn.memorySize ? `${String(fn.memorySize)} MB` : null),
        mono: true,
        responsive: "md",
      }),
      textColumn<FunctionEntity>({
        id: "handler",
        header: t("serverless.form.handler"),
        accessor: (fn) => fn.handler,
        mono: true,
        muted: true,
        responsive: "lg",
      }),
      dateColumn<FunctionEntity>({
        id: "updated",
        header: t("serverless.columns.updated"),
        accessor: (fn) => fn.updatedAt ?? "",
        responsive: "xl",
      }),
      actionsColumn<FunctionEntity>({
        ariaLabel: t("console.table.actions"),
        actions: (fn) => [
          {
            label: t("serverless.actions.test"),
            icon: Play,
            onAction: () => {
              void navigate(`${SERVERLESS_ROUTES.detail(fn.name)}?tab=test`)
            },
          },
          {
            label: t("serverless.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (target: FunctionEntity) => {
              setToDelete(target)
            },
          },
        ],
      }),
    ],
    [navigate, t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Zap}
        breadcrumbs={[
          { label: t("console.nav.groups.serverless") },
          { label: t("console.nav.items.functions") },
        ]}
        title={t("serverless.title")}
        description={t("serverless.subtitle")}
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
            <Button className="gap-2" onClick={() => void navigate(SERVERLESS_ROUTES.CREATE)}>
              <Plus className="w-4 h-4" />
              {t("serverless.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      <DataTable<FunctionEntity>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        getRowId={(fn) => fn.name}
        onRowClick={(fn) => void navigate(SERVERLESS_ROUTES.detail(fn.name))}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("serverless.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("serverless.actions.deleteConfirmTitle", { name: toDelete?.name ?? "" })}
        description={t("serverless.actions.deleteConfirmBody")}
        confirmLabel={t("serverless.actions.deleteConfirmLabel")}
        confirmText={toDelete?.name}
        destructive
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          deleteFunction(toDelete.name, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
