/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/prefer-nullish-coalescing */
import { useState } from "react"

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@datadack/common-ui"
import { History, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ConfirmDialog, FieldRow } from "@/components/console"
import { extractError } from "@/services/api/client"

import {
  useCreateDeployment,
  useDeleteDeployment,
  useDeployments,
  useStages,
  useUpdateStage,
} from "../apigw.hooks"
import type { APIGateway, APIGatewayDeployment, APIGatewayStage } from "../apigw.types"
export function DeploymentsTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const query = useDeployments(api.id),
    stages = useStages(api.id),
    create = useCreateDeployment(),
    update = useUpdateStage(),
    remove = useDeleteDeployment()
  const [description, setDescription] = useState(""),
    [stageId, setStageId] = useState("none"),
    [rollback, setRollback] = useState<{
      deployment: APIGatewayDeployment
      stage: APIGatewayStage
    } | null>(null),
    [toDelete, setToDelete] = useState<APIGatewayDeployment | null>(null)
  const sorted = [...(query.data ?? [])].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  )
  return (
    <div className="space-y-5">
      <Card className="glass-1 p-5">
        <h2 className="font-semibold">{t("apiGateway.deployments.create")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <FieldRow label={t("apiGateway.deployments.description")}>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </FieldRow>
          <FieldRow label={t("apiGateway.deployments.pointStage")}>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("apiGateway.deployments.noStage")}</SelectItem>
                {stages.data?.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <Button
            className="self-end"
            variant="gold"
            loading={create.isPending}
            onClick={() => {
              create.mutate(
                {
                  apiId: api.id,
                  payload: {
                    description: description || undefined,
                    stage_id: stageId === "none" ? undefined : stageId,
                  },
                },
                {
                  onSuccess: () => {
                    setDescription("")
                  },
                },
              )
            }}
          >
            <Plus className="size-4" />
            {t("apiGateway.deployments.createAction")}
          </Button>
        </div>
      </Card>
      {!query.isLoading && !sorted.length ? (
        <EmptyState
          icon={History}
          title={t("apiGateway.deployments.empty.title")}
          description={t("apiGateway.deployments.empty.description")}
        />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-5">
          {sorted.map((d) => {
            const pointing = stages.data?.filter((s) => s.deployment_id === d.id) ?? []
            return (
              <li key={d.id}>
                <span className="absolute -left-1.5 mt-5 size-3 rounded-full bg-muted-foreground" />
                <Card className="glass-1 p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {d.description || t("apiGateway.deployments.noDescription")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleString()} · {d.user_id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{d.status}</Badge>
                      {d.auto_deployed && (
                        <Badge variant="outline">{t("apiGateway.deployments.auto")}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {pointing.map((s) => (
                      <Badge key={s.id}>{s.name}</Badge>
                    ))}
                    {stages.data
                      ?.filter((s) => s.deployment_id !== d.id)
                      .map((s) => (
                        <Button
                          key={s.id}
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRollback({ deployment: d, stage: s })
                          }}
                        >
                          {t("apiGateway.deployments.rollback", { name: s.name })}
                        </Button>
                      ))}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-auto inline-flex">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pointing.length > 0}
                            onClick={() => {
                              setToDelete(d)
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            {t("apiGateway.common.delete")}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {pointing.length > 0 && (
                        <TooltipContent>
                          {t("apiGateway.deployments.deleteAttached")}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
      <ConfirmDialog
        destructive={false}
        open={!!rollback}
        onOpenChange={(o) => !o && setRollback(null)}
        title={t("apiGateway.deployments.rollbackTitle")}
        description={t("apiGateway.deployments.rollbackDescription", {
          stage: rollback?.stage.name ?? "",
          deployment: rollback?.deployment.description || rollback?.deployment.id || "",
        })}
        confirmLabel={t("apiGateway.deployments.rollbackConfirm")}
        loading={update.isPending}
        onConfirm={() =>
          rollback &&
          update.mutate(
            {
              apiId: api.id,
              stageId: rollback.stage.id,
              payload: { deployment_id: rollback.deployment.id },
            },
            {
              onSuccess: () => {
                setRollback(null)
              },
            },
          )
        }
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("apiGateway.deployments.deleteTitle", {
          name: toDelete?.description || toDelete?.id || "",
        })}
        description={t("apiGateway.deployments.deleteDescription", {
          name: toDelete?.description || toDelete?.id || "",
        })}
        confirmLabel={t("apiGateway.common.delete")}
        loading={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return
          remove.mutate(
            { apiId: api.id, deploymentId: toDelete.id },
            {
              onSuccess: () => {
                setToDelete(null)
              },
              onError: (error) => {
                toast.error(extractError(error, t("apiGateway.toasts.deploymentDeleteFailed")))
              },
            },
          )
        }}
      />
    </div>
  )
}
