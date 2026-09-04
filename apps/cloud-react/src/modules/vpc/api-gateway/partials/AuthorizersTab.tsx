/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { useMemo, useState } from "react"

import { actionsColumn, Button, DataTable, EmptyState, type RowAction } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog } from "@/components/console"

import { useAuthorizers, useDeleteAuthorizer } from "../apigw.hooks"
import type { APIGateway, APIGatewayAuthorizer } from "../apigw.types"
import { AuthorizerDialog } from "./AuthorizerDialog"
export function AuthorizersTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const query = useAuthorizers(api.id),
    remove = useDeleteAuthorizer()
  const [selected, setSelected] = useState<APIGatewayAuthorizer | null>(null)
  const [editing, setEditing] = useState<APIGatewayAuthorizer | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const columns = useMemo<ColumnDef<APIGatewayAuthorizer>[]>(
    () => [
      { accessorKey: "name", header: t("apiGateway.authorizers.columns.name") },
      { accessorKey: "authorizer_type", header: t("apiGateway.authorizers.columns.type") },
      {
        accessorKey: "identity_source",
        header: t("apiGateway.authorizers.columns.identitySource"),
        cell: ({ getValue }) => <code>{(getValue() as string[]).join(", ")}</code>,
      },
      {
        id: "source",
        header: t("apiGateway.authorizers.columns.source"),
        cell: ({ row }) => (
          <code>
            {row.original.authorizer_type === "JWT"
              ? row.original.jwt_issuer
              : row.original.authorizer_uri}
          </code>
        ),
      },
      {
        accessorKey: "authorizer_result_ttl_seconds",
        header: t("apiGateway.authorizers.columns.ttl"),
      },
      actionsColumn<APIGatewayAuthorizer>({
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
          ] as RowAction<APIGatewayAuthorizer>[],
      }),
    ],
    [t],
  )
  const openCreate = () => {
    setEditing(null)
    setEditorOpen(true)
  }
  const editor = (
    <AuthorizerDialog
      apiId={api.id}
      authorizer={editing}
      open={editorOpen}
      onClose={() => {
        setEditorOpen(false)
      }}
    />
  )
  return (
    <>
      <DataTable
        data={query.data ?? []}
        columns={columns}
        loading={query.isLoading}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
        onRefresh={() => void query.refetch()}
        refreshing={query.isFetching}
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="size-4" />
            {t("apiGateway.authorizers.create")}
          </Button>
        }
        empty={
          <EmptyState
            icon={KeyRound}
            title={t("apiGateway.authorizers.empty.title")}
            description={t("apiGateway.authorizers.empty.description")}
            action={{ label: t("apiGateway.authorizers.create"), onClick: openCreate }}
          />
        }
      />
      {editor}
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={t("apiGateway.authorizers.deleteTitle", { name: selected?.name ?? "" })}
        description={t("apiGateway.authorizers.deleteDescription", { name: selected?.name ?? "" })}
        confirmLabel={t("apiGateway.common.delete")}
        loading={remove.isPending}
        onConfirm={() =>
          selected &&
          remove.mutate(
            { apiId: api.id, authorizerId: selected.id },
            {
              onSuccess: () => {
                setSelected(null)
              },
            },
          )
        }
      />
    </>
  )
}
