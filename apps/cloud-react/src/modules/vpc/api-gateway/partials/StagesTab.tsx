/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { useState } from "react"

import { Badge, Button, Card, EmptyState } from "@datadack/common-ui"
import { Layers3, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog } from "@/components/console"

import { useDeleteStage, useStages } from "../apigw.hooks"
import { StageDialog } from "./StageDialog"
import type { APIGateway, APIGatewayStage } from "../apigw.types"
export function StagesTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const query = useStages(api.id),
    remove = useDeleteStage()
  const [selected, setSelected] = useState<APIGatewayStage | null>(null)
  // null editing + editorOpen true is the create case; a stage is the edit case.
  const [editing, setEditing] = useState<APIGatewayStage | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const openCreate = () => {
    setEditing(null)
    setEditorOpen(true)
  }
  const openEdit = (stage: APIGatewayStage) => {
    setEditing(stage)
    setEditorOpen(true)
  }
  const closeEditor = () => {
    setEditorOpen(false)
  }
  const editor = (
    <StageDialog apiId={api.id} stage={editing} open={editorOpen} onClose={closeEditor} />
  )
  if (query.isLoading) return <div className="h-48 animate-pulse glass-1" />
  if (!query.data?.length)
    return (
      <>
        <EmptyState
          icon={Layers3}
          title={t("apiGateway.stages.empty.title")}
          description={t("apiGateway.stages.empty.description")}
          action={{ label: t("apiGateway.stages.create"), onClick: openCreate }}
        />
        {editor}
      </>
    )
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="gold" onClick={openCreate}>
          <Plus className="size-4" />
          {t("apiGateway.stages.create")}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {query.data.map((stage) => (
          <Card key={stage.id} className="glass-1 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">
                  {stage.name === "$default" ? t("apiGateway.stages.default") : stage.name}
                </h3>
                <code className="text-xs text-muted-foreground">{stage.name}</code>
              </div>
              <Badge variant="outline">
                {stage.auto_deploy
                  ? t("apiGateway.stages.autoDeploy")
                  : t("apiGateway.stages.manualDeploy")}
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("apiGateway.stages.deployment")}</dt>
                <dd className="font-mono">{stage.deployment_id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("apiGateway.stages.logging")}</dt>
                <dd>{stage.logging_level}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("apiGateway.stages.throttle")}</dt>
                <dd>
                  {stage.throttling_rate_limit} / {stage.throttling_burst_limit}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  openEdit(stage)
                }}
              >
                <Pencil className="size-3.5" />
                {t("apiGateway.common.edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(stage)
                }}
              >
                <Trash2 className="size-3.5" />
                {t("apiGateway.common.delete")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {editor}
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={t("apiGateway.stages.deleteTitle", { name: selected?.name ?? "" })}
        description={t("apiGateway.stages.deleteDescription", { name: selected?.name ?? "" })}
        confirmLabel={t("apiGateway.common.delete")}
        loading={remove.isPending}
        onConfirm={() =>
          selected &&
          remove.mutate(
            { apiId: api.id, stageId: selected.id },
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
