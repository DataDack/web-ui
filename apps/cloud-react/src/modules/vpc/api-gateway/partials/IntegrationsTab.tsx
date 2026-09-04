/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  CopyButton,
  DataTable,
  EmptyState,
  type RowAction,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Cable, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog } from "@/components/console"

import { INTEGRATION_TYPE_OPTIONS } from "../apigw.constants"
import { useDeleteIntegration, useIntegrations, useVPCLinks } from "../apigw.hooks"
import type { APIGateway, APIGatewayIntegration } from "../apigw.types"
import { IntegrationDialog } from "./IntegrationDialog"

export function IntegrationsTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const query = useIntegrations(api.id)
  const links = useVPCLinks()
  const remove = useDeleteIntegration()
  const [selected, setSelected] = useState<APIGatewayIntegration | null>(null)
  const [editing, setEditing] = useState<APIGatewayIntegration | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const columns = useMemo<ColumnDef<APIGatewayIntegration>[]>(
    () => [
      { accessorKey: "name", header: t("apiGateway.integrations.columns.name") },
      {
        accessorKey: "integration_type",
        header: t("apiGateway.integrations.columns.type"),
        cell: ({ getValue }) => INTEGRATION_TYPE_OPTIONS.find((x) => x.value === getValue())?.label,
      },
      {
        accessorKey: "integration_uri",
        header: t("apiGateway.integrations.columns.uri"),
        cell: ({ getValue }) =>
          getValue() ? <CopyButton value={String(getValue())} /> : <span>—</span>,
      },
      {
        accessorKey: "integration_method",
        header: t("apiGateway.integrations.columns.method"),
        cell: ({ getValue }) => <Badge variant="outline">{String(getValue())}</Badge>,
      },
      {
        id: "connection",
        header: t("apiGateway.integrations.columns.connection"),
        cell: ({ row }) =>
          row.original.connection_type === "INTERNET"
            ? t("apiGateway.integrations.internet")
            : (links.data?.find((x) => x.id === row.original.vpc_link_id)?.name ??
              t("apiGateway.integrations.vpcLink")),
      },
      {
        accessorKey: "timeout_millis",
        header: t("apiGateway.integrations.columns.timeout"),
        cell: ({ getValue }) =>
          t("apiGateway.integrations.timeoutValue", { value: Number(getValue()) }),
      },
      actionsColumn<APIGatewayIntegration>({
        ariaLabel: t("console.table.actions"),
        actions: () =>
          [
            {
              label: t("apiGateway.common.edit"),
              icon: Pencil,
              onAction: (row) => {
                setEditing(row)
                setEditorOpen(true)
              },
            },
            {
              label: t("apiGateway.common.delete"),
              icon: Trash2,
              destructive: true,
              onAction: setSelected,
            },
          ] as RowAction<APIGatewayIntegration>[],
      }),
    ],
    [t, links.data],
  )
  const openCreate = () => {
    setEditing(null)
    setEditorOpen(true)
  }
  const editor = (
    <IntegrationDialog
      apiId={api.id}
      integration={editing}
      open={editorOpen}
      onClose={() => {
        setEditorOpen(false)
      }}
    />
  )
  return (
    <div className="space-y-5">
      <DataTable
        data={query.data ?? []}
        columns={columns}
        loading={query.isLoading}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
        searchable
        onRefresh={() => void query.refetch()}
        refreshing={query.isFetching}
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="size-4" />
            {t("apiGateway.integrations.create")}
          </Button>
        }
        empty={
          <EmptyState
            icon={Cable}
            title={t("apiGateway.integrations.empty.title")}
            description={t("apiGateway.integrations.empty.description")}
            action={{ label: t("apiGateway.integrations.create"), onClick: openCreate }}
          />
        }
      />
      {editor}
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={t("apiGateway.integrations.deleteTitle", { name: selected?.name ?? "" })}
        description={t("apiGateway.integrations.deleteDescription", { name: selected?.name ?? "" })}
        confirmLabel={t("apiGateway.common.delete")}
        loading={remove.isPending}
        onConfirm={() =>
          selected &&
          remove.mutate(
            { apiId: api.id, integrationId: selected.id },
            {
              onSuccess: () => {
                setSelected(null)
              },
            },
          )
        }
      />
    </div>
  )
}
