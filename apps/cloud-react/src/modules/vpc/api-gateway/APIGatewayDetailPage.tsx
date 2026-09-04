/* eslint-disable @typescript-eslint/no-misused-promises, react/jsx-key */
import { useState } from "react"

import { Badge, Button, CopyButton, EmptyState, Skeleton } from "@datadack/common-ui"
import { Download, Webhook } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { ConfirmDialog, DetailPage } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { APIGW_ROUTES } from "./apigw.constants"
import { useAPI, useDeleteAPI, useExportAPI } from "./apigw.hooks"
import { AuthorizersTab } from "./partials/AuthorizersTab"
import { CorsTab } from "./partials/CorsTab"
import { DeploymentsTab } from "./partials/DeploymentsTab"
import { IntegrationsTab } from "./partials/IntegrationsTab"
import { ModelsTab } from "./partials/ModelsTab"
import { OverviewTab } from "./partials/OverviewTab"
import { RoutesTab } from "./partials/RoutesTab"
import { SettingsTab } from "./partials/SettingsTab"
import { StagesTab } from "./partials/StagesTab"

export function APIGatewayDetailPage() {
  useScreen("vpc.api-gateway.detail")
  const { t } = useTranslation()
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const apiQuery = useAPI(id)
  const exported = useExportAPI(id)
  const remove = useDeleteAPI()
  const [confirming, setConfirming] = useState(false)

  if (apiQuery.isLoading)
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  if (!apiQuery.data)
    return (
      <EmptyState
        icon={Webhook}
        title={t("apiGateway.detail.notFound.title")}
        description={t("apiGateway.detail.notFound.description")}
        action={{
          label: t("apiGateway.detail.notFound.back"),
          onClick: () => navigate(APIGW_ROUTES.LIST),
        }}
      />
    )
  const api = apiQuery.data
  const download = async () => {
    const result = await exported.refetch()
    if (!result.data) return
    const blob = new Blob([result.data.body], { type: "application/json" })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = href
    anchor.download = `${api.name}.json`
    anchor.click()
    URL.revokeObjectURL(href)
  }
  const tabs = [
    ["overview", "overview", <OverviewTab api={api} />],
    ["routes", "routes", <RoutesTab api={api} />],
    ["integrations", "integrations", <IntegrationsTab api={api} />],
    ["authorizers", "authorizers", <AuthorizersTab api={api} />],
    ["cors", "cors", <CorsTab api={api} />],
    ["stages", "stages", <StagesTab api={api} />],
    ["deployments", "deployments", <DeploymentsTab api={api} />],
    ["models", "models", <ModelsTab api={api} />],
    ["settings", "settings", <SettingsTab api={api} />],
  ].map(([value, key, content]) => ({
    value: value as string,
    label: t(`apiGateway.tabs.${key as string}`),
    content,
  }))
  return (
    <>
      <DetailPage
        backTo={APIGW_ROUTES.LIST}
        backLabel={t("apiGateway.detail.back")}
        icon={Webhook}
        title={api.name}
        id={api.id}
        status={api.status}
        meta={
          <>
            <Badge variant="outline">{api.protocol_type}</Badge>
            <CopyButton value={api.api_endpoint} />
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void download()}
              loading={exported.isFetching}
            >
              <Download className="size-3.5" />
              {t("apiGateway.detail.export")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirming(true)
              }}
            >
              {t("apiGateway.detail.delete")}
            </Button>
          </>
        }
        tabs={tabs}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("apiGateway.detail.deleteTitle", { name: api.name })}
        description={t("apiGateway.detail.deleteDescription", { name: api.name })}
        confirmText={api.name}
        confirmLabel={t("apiGateway.detail.delete")}
        loading={remove.isPending}
        onConfirm={() => {
          remove.mutate(api.id, { onSuccess: () => navigate(APIGW_ROUTES.LIST) })
        }}
      />
    </>
  )
}
