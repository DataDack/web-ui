/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  JsonViewer,
  type RowAction,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Braces, Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog } from "@/components/console"

import { useDeleteModel, useModels } from "../apigw.hooks"
import type { APIGateway, APIGatewayModel } from "../apigw.types"
import { ModelDialog } from "./ModelDialog"
/** The schema column holds JSON text; JsonViewer wants the parsed value. A row
 *  written before validation existed may not parse, so fall back to the raw
 *  string rather than throwing inside a dialog. */
function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export function ModelsTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const query = useModels(api.id),
    remove = useDeleteModel()
  const [viewing, setViewing] = useState<APIGatewayModel | null>(null),
    [deleting, setDeleting] = useState<APIGatewayModel | null>(null)
  const [editing, setEditing] = useState<APIGatewayModel | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const columns = useMemo<ColumnDef<APIGatewayModel>[]>(
    () => [
      { accessorKey: "name", header: t("apiGateway.models.columns.name") },
      { accessorKey: "content_type", header: t("apiGateway.models.columns.contentType") },
      { accessorKey: "description", header: t("apiGateway.models.columns.description") },
      actionsColumn<APIGatewayModel>({
        ariaLabel: t("console.table.actions"),
        actions: () =>
          [
            { label: t("apiGateway.models.viewSchema"), icon: Eye, onAction: setViewing },
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
              onAction: setDeleting,
            },
          ] as RowAction<APIGatewayModel>[],
      }),
    ],
    [t],
  )
  const openCreate = () => {
    setEditing(null)
    setEditorOpen(true)
  }
  const editor = (
    <ModelDialog
      apiId={api.id}
      model={editing}
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
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="size-4" />
            {t("apiGateway.models.create")}
          </Button>
        }
        empty={
          <EmptyState
            icon={Braces}
            title={t("apiGateway.models.empty.title")}
            description={t("apiGateway.models.empty.description")}
            action={{ label: t("apiGateway.models.create"), onClick: openCreate }}
          />
        }
      />
      {editor}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="glass-3">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>{t("apiGateway.models.schemaDescription")}</DialogDescription>
          </DialogHeader>
          {viewing && <JsonViewer data={safeParse(viewing.schema)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("apiGateway.models.deleteTitle", { name: deleting?.name ?? "" })}
        description={t("apiGateway.models.deleteDescription", { name: deleting?.name ?? "" })}
        confirmLabel={t("apiGateway.common.delete")}
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            { apiId: api.id, modelId: deleting.id },
            {
              onSuccess: () => {
                setDeleting(null)
              },
            },
          )
        }
      />
    </>
  )
}
