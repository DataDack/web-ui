import { useState } from "react"

import {
  Boxes,
  Cloud,
  Download,
  FileJson,
  Container,
  Layers3,
  Network,
  Rocket,
  ShieldCheck,
  Sigma,
  Trash2,
  Zap,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"

import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import {
  useApi,
  useCreateModel,
  useDeleteModel,
  useExportApi,
  useModels,
  useAuthorizers,
  useCreateDeployment,
  useCreateIntegration,
  useCreateRoute,
  useCreateStage,
  useDeleteIntegration,
  useDeleteRoute,
  useDeployments,
  useIntegrations,
  useRoutes,
  useStages,
} from "../data/queries"
import type { Integration } from "../data/schemas"

/**
 * Falls back when a value is missing OR blank.
 *
 * `??` is the usual choice and is wrong here: these fields come back as "" from
 * the API rather than absent, so nullish coalescing would render an empty
 * heading. This is what `||` meant, said explicitly so the linter and the next
 * reader both know it was deliberate.
 */
function orElse(value: string | undefined, fallback: string): string {
  return value !== undefined && value !== "" ? value : fallback
}

/**
 * One API: everything that hangs off it, on the tabs it hangs off.
 *
 * The tab order follows the order an API is actually built. An integration has
 * to exist before a route can point at one, and a stage before a deployment can
 * be pointed at it — so Routes sits first because it is what an operator comes
 * to read, and Integrations second because it is what they discover they need.
 */
export function ApiDetailPage() {
  const { apiId = "" } = useParams()
  const { data: api, error, isLoading } = useApi(apiId)

  if (error) {
    return (
      <EmptyState
        icon={Network}
        title="Could not load this API"
        description={errorMessage(error, "Could not load")}
      />
    )
  }

  return (
    <>
      <PageHeader
        title={orElse(api?.name, apiId)}
        icon={Network}
        breadcrumbs={[{ label: "API Gateway", to: "/apigateway" }, { label: api?.name ?? apiId }]}
        description={orElse(api?.description, "HTTP API configuration.")}
        // common-ui is instantiated twice in this app, so a router context
        // mounted through one instance is invisible to a component resolved
        // from the other. The crumb's link is passed in rather than looked up.
        renderLink={(crumb, children) => <Link to={crumb.to ?? "#"}>{children}</Link>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 font-mono text-[11px]">
          {apiId}
          <CopyButton value={apiId} />
        </Badge>
        <Badge variant="outline" className="font-mono text-[11px]">
          {api?.protocolType ?? "HTTP"}
        </Badge>
        {api?.corsConfiguration ? (
          <Badge variant="secondary" className="font-mono text-[11px]">
            CORS: {orElse(api.corsConfiguration.allowOrigins.join(", "), "no origins")}
          </Badge>
        ) : null}
        {api?.apiEndpoint ? (
          <Badge variant="outline" className="gap-1.5 font-mono text-[11px]">
            {api.apiEndpoint}
            <CopyButton value={api.apiEndpoint} />
          </Badge>
        ) : null}
      </div>

      <div className="mb-4">
        <ExportButton apiId={apiId} />
      </div>

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="authorizers">Authorizers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="mt-4">
          <RoutesTab apiId={apiId} loading={isLoading} />
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab apiId={apiId} />
        </TabsContent>
        <TabsContent value="stages" className="mt-4">
          <StagesTab apiId={apiId} />
        </TabsContent>
        <TabsContent value="deployments" className="mt-4">
          <DeploymentsTab apiId={apiId} />
        </TabsContent>
        <TabsContent value="authorizers" className="mt-4">
          <AuthorizersTab apiId={apiId} />
        </TabsContent>
        <TabsContent value="models" className="mt-4">
          <ModelsTab apiId={apiId} />
        </TabsContent>
      </Tabs>
    </>
  )
}

/** A card list, which suits these short child collections better than a table. */
function Row({
  title,
  subtitle,
  badges,
  onDelete,
  deleteDisabled,
  deleteReason,
}: Readonly<{
  title: string
  subtitle?: string
  badges?: React.ReactNode
  onDelete?: () => void
  deleteDisabled?: boolean
  deleteReason?: string
}>) {
  return (
    <div className="border-border/60 flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="font-mono text-[13px] font-medium">{title}</div>
        {subtitle ? (
          <div className="text-muted-foreground truncate font-mono text-[11px]">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badges}
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={deleteDisabled}
            title={deleteDisabled ? deleteReason : undefined}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
  form,
}: Readonly<{ title: string; children: React.ReactNode; form?: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-4">
      {form ? (
        <div className="border-border/60 bg-card/40 rounded-lg border p-3">
          <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase">
            {title}
          </div>
          {form}
        </div>
      ) : null}
      <div>{children}</div>
    </div>
  )
}

function RoutesTab({ apiId, loading }: Readonly<{ apiId: string; loading: boolean }>) {
  const { data: routes } = useRoutes(apiId)
  const { data: integrations } = useIntegrations(apiId)
  const create = useCreateRoute(apiId)
  const remove = useDeleteRoute(apiId)
  const [routeKey, setRouteKey] = useState("")
  const [target, setTarget] = useState("")

  const byId = new Map((integrations ?? []).map((row) => [row.integrationId, row]))

  return (
    <Panel
      title="Add route"
      form={
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <Label htmlFor="route-key">Route key</Label>
            <Input
              id="route-key"
              placeholder="GET /pets"
              value={routeKey}
              onChange={(event) => {
                setRouteKey(event.target.value)
              }}
            />
          </div>
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <Label>Integration</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {(integrations ?? []).map((row) => (
                  <SelectItem key={row.integrationId} value={row.integrationId}>
                    {row.integrationUri || row.integrationType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="gold"
            disabled={!routeKey.trim() || create.isPending}
            onClick={() => {
              create.mutate(
                {
                  routeKey: routeKey.trim(),
                  target: target ? `integrations/${target}` : undefined,
                },
                {
                  onSuccess: () => {
                    setRouteKey("")
                    setTarget("")
                  },
                },
              )
            }}
          >
            Add
          </Button>
        </div>
      }
    >
      {create.error ? (
        <p className="text-status-danger mb-2 text-xs">
          {errorMessage(create.error, "Could not create")}
        </p>
      ) : null}
      {(routes ?? []).length === 0 && !loading ? (
        <EmptyState
          icon={Sigma}
          title="No routes"
          description="A route maps a method and path onto an integration."
        />
      ) : (
        (routes ?? []).map((route) => {
          const integration = byId.get(route.target.replace("integrations/", ""))
          return (
            <Row
              key={route.routeId}
              title={route.routeKey}
              subtitle={integration ? integration.integrationUri : "no integration attached"}
              badges={
                <>
                  {route.authorizationType !== "NONE" ? (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {route.authorizationType}
                    </Badge>
                  ) : null}
                  {route.apiGatewayManaged ? (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      managed
                    </Badge>
                  ) : null}
                </>
              }
              onDelete={() => {
                remove.mutate(route.routeId)
              }}
              // The service refuses to delete a row it created itself; saying so
              // here is better than letting the click fail.
              deleteDisabled={route.apiGatewayManaged}
              deleteReason="Created by API Gateway and cannot be deleted"
            />
          )
        })
      )}
    </Panel>
  )
}

/**
 * targetKind is what the URI actually points at, and it is the platform's own
 * field rather than part of the contract: the wire's integrationType cannot
 * distinguish a function from a load balancer because both are reached over
 * HTTP. The icon comes from it, which is the whole reason it is sent.
 */
const TARGET_ICONS: Record<string, typeof Zap> = {
  LAMBDA: Zap,
  LOAD_BALANCER: Layers3,
  MOCK: Boxes,
  HTTP: Cloud,
}

function IntegrationsTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: integrations } = useIntegrations(apiId)
  const create = useCreateIntegration(apiId)
  const remove = useDeleteIntegration(apiId)
  const [uri, setUri] = useState("")
  const [type, setType] = useState("HTTP_PROXY")

  return (
    <Panel
      title="Add integration"
      form={
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-40 flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTTP_PROXY">HTTP_PROXY</SelectItem>
                <SelectItem value="AWS_PROXY">AWS_PROXY (function)</SelectItem>
                <SelectItem value="MOCK">MOCK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-64 flex-1 flex-col gap-1.5">
            <Label htmlFor="integration-uri">Backend URI</Label>
            <Input
              id="integration-uri"
              placeholder="https://backend.internal or a function name"
              value={uri}
              onChange={(event) => {
                setUri(event.target.value)
              }}
            />
          </div>
          <Button
            variant="gold"
            disabled={create.isPending || (type !== "MOCK" && !uri.trim())}
            onClick={() => {
              create.mutate(
                { integrationType: type, integrationUri: uri.trim() || undefined },
                {
                  onSuccess: () => {
                    setUri("")
                  },
                },
              )
            }}
          >
            Add
          </Button>
        </div>
      }
    >
      {create.error ? (
        <p className="text-status-danger mb-2 text-xs">
          {errorMessage(create.error, "Could not create")}
        </p>
      ) : null}
      {(integrations ?? []).length === 0 ? (
        <EmptyState
          icon={Container}
          title="No integrations"
          description="An integration is the backend a route forwards to."
        />
      ) : (
        (integrations ?? []).map((row: Integration) => {
          const kind = row["x-datadack-targetKind"]
          const Icon = TARGET_ICONS[kind] ?? Cloud
          return (
            <Row
              key={row.integrationId}
              title={orElse(row.integrationUri, row.integrationType)}
              subtitle={row.integrationId}
              badges={
                <>
                  <Badge variant="outline" className="gap-1 font-mono text-[10px]">
                    <Icon className="size-3" />
                    {kind.toLowerCase().replace("_", " ")}
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {row.integrationType}
                  </Badge>
                </>
              }
              onDelete={() => {
                remove.mutate(row.integrationId)
              }}
            />
          )
        })
      )}
    </Panel>
  )
}

function StagesTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: stages } = useStages(apiId)
  const create = useCreateStage(apiId)
  const [name, setName] = useState("")

  return (
    <Panel
      title="Add stage"
      form={
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input
              id="stage-name"
              placeholder="prod"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <Button
            variant="gold"
            disabled={!name.trim() || create.isPending}
            onClick={() => {
              create.mutate(
                { stageName: name.trim(), autoDeploy: true },
                {
                  onSuccess: () => {
                    setName("")
                  },
                },
              )
            }}
          >
            Add
          </Button>
        </div>
      }
    >
      {create.error ? (
        <p className="text-status-danger mb-2 text-xs">
          {errorMessage(create.error, "Could not create")}
        </p>
      ) : null}
      {(stages ?? []).length === 0 ? (
        <EmptyState
          icon={Layers3}
          title="No stages"
          description="A stage is a named deployment target."
        />
      ) : (
        (stages ?? []).map((stage) => (
          <Row
            key={stage.stageName}
            title={stage.stageName}
            subtitle={orElse(stage.lastDeploymentStatusMessage, stage.description)}
            badges={
              <>
                {stage.autoDeploy ? (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    auto-deploy
                  </Badge>
                ) : null}
                {stage.deploymentId ? (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {stage.deploymentId}
                  </Badge>
                ) : null}
              </>
            }
          />
        ))
      )}
    </Panel>
  )
}

function DeploymentsTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: deployments } = useDeployments(apiId)
  const { data: stages } = useStages(apiId)
  const create = useCreateDeployment(apiId)
  const [stageName, setStageName] = useState("")

  return (
    <Panel
      title="Deploy"
      form={
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-56 flex-col gap-1.5">
            <Label>Stage</Label>
            <Select value={stageName} onValueChange={setStageName}>
              <SelectTrigger>
                <SelectValue placeholder="Create without pointing a stage" />
              </SelectTrigger>
              <SelectContent>
                {(stages ?? []).map((stage) => (
                  <SelectItem key={stage.stageName} value={stage.stageName}>
                    {stage.stageName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="gold"
            disabled={create.isPending}
            onClick={() => {
              create.mutate({ stageName: stageName || undefined })
            }}
          >
            <Rocket className="size-3.5" /> Deploy
          </Button>
        </div>
      }
    >
      {create.error ? (
        <p className="text-status-danger mb-2 text-xs">
          {errorMessage(create.error, "Could not create")}
        </p>
      ) : null}
      {(deployments ?? []).length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No deployments"
          description="A deployment snapshots the API's routes and integrations."
        />
      ) : (
        (deployments ?? []).map((deployment) => (
          <Row
            key={deployment.deploymentId}
            title={deployment.deploymentId}
            subtitle={orElse(deployment.description, deployment.deploymentStatusMessage)}
            badges={
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px]",
                  deployment.deploymentStatus === "DEPLOYED" && "text-status-success",
                  deployment.deploymentStatus === "FAILED" && "text-status-danger",
                )}
              >
                {deployment.deploymentStatus.toLowerCase()}
              </Badge>
            }
          />
        ))
      )}
    </Panel>
  )
}

function AuthorizersTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: authorizers } = useAuthorizers(apiId)

  return (
    <Panel title="Authorizers">
      {(authorizers ?? []).length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No authorizers"
          description="A JWT authorizer validates a token before a route is reached."
        />
      ) : (
        (authorizers ?? []).map((authorizer) => (
          <Row
            key={authorizer.authorizerId}
            title={authorizer.name}
            subtitle={orElse(authorizer.jwtConfiguration?.issuer, authorizer.authorizerUri)}
            badges={
              <Badge variant="secondary" className="font-mono text-[10px]">
                {authorizer.authorizerType}
              </Badge>
            }
          />
        ))
      )}
    </Panel>
  )
}

/**
 * Downloads the API's OpenAPI definition.
 *
 * A blob rather than a link to the endpoint: the export needs the console's
 * credential, and an <a href> would be an unauthenticated navigation that comes
 * back as a sign-in page saved to the operator's Downloads folder.
 */
function ExportButton({ apiId }: Readonly<{ apiId: string }>) {
  const exportApi = useExportApi()
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={exportApi.isPending}
        onClick={() => {
          exportApi.mutate(apiId, {
            onSuccess: (doc) => {
              const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const anchor = document.createElement("a")
              anchor.href = url
              anchor.download = `${apiId}-openapi.json`
              anchor.click()
              // Revoked immediately: the download has already been handed the
              // blob, and leaving the URL alive pins it in memory for the life
              // of the document.
              URL.revokeObjectURL(url)
            },
          })
        }}
      >
        <Download className="size-3.5" /> Export OpenAPI
      </Button>
      {exportApi.error ? (
        <p className="text-status-danger mt-1 text-xs">
          {errorMessage(exportApi.error, "Could not export")}
        </p>
      ) : null}
    </>
  )
}

/**
 * Models: the JSON Schemas a route validates a request body against.
 *
 * A platform extension rather than an apigatewayv2 resource, which is why the
 * tab is last: it is the one thing here an SDK client cannot also manage.
 */
function ModelsTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: models } = useModels(apiId)
  const create = useCreateModel(apiId)
  const remove = useDeleteModel(apiId)
  const [name, setName] = useState("")
  const [schema, setSchema] = useState("")

  return (
    <Panel
      title="Add model"
      form={
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-40 flex-col gap-1.5">
            <Label htmlFor="model-name">Name</Label>
            <Input
              id="model-name"
              placeholder="Pet"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <div className="flex min-w-64 flex-1 flex-col gap-1.5">
            <Label htmlFor="model-schema">JSON Schema</Label>
            <Input
              id="model-schema"
              placeholder={'{"type":"object"}'}
              value={schema}
              onChange={(event) => {
                setSchema(event.target.value)
              }}
            />
          </div>
          <Button
            variant="gold"
            disabled={!name.trim() || !schema.trim() || create.isPending}
            onClick={() => {
              create.mutate(
                { name: name.trim(), schema: schema.trim(), contentType: "application/json" },
                {
                  onSuccess: () => {
                    setName("")
                    setSchema("")
                  },
                },
              )
            }}
          >
            Add
          </Button>
        </div>
      }
    >
      {create.error ? (
        <p className="text-status-danger mb-2 text-xs">
          {errorMessage(create.error, "Could not create the model")}
        </p>
      ) : null}
      {(models ?? []).length === 0 ? (
        <EmptyState
          icon={FileJson}
          title="No models"
          description="A model is the JSON Schema a route validates a request body against."
        />
      ) : (
        (models ?? []).map((model) => (
          <Row
            key={model.modelId}
            title={model.name}
            subtitle={model.schema}
            badges={
              <Badge variant="secondary" className="font-mono text-[10px]">
                {model.contentType}
              </Badge>
            }
            onDelete={() => {
              remove.mutate(model.modelId)
            }}
          />
        ))
      )}
    </Panel>
  )
}
