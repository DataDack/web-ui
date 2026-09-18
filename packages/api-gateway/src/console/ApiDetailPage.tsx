import { useState, type ReactNode } from "react"

import { ChevronRight, Download, Network, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  CopyButton,
  EmptyState,
  KeyValueGrid,
  PageHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  timeAgo,
} from "@datadack/common-ui"

import { DeploymentsTab } from "./detail/DeploymentsTab"
import { IntegrationsTab } from "./detail/IntegrationsTab"
import { RoutesTab } from "./detail/RoutesTab"
import { DEFAULT_STAGE, MethodTag, splitRouteKey, stageUrl, targetKindOf } from "./detail/shared"
import { EnableDefaultStageButton, StagesTab, orderStages } from "./detail/StagesTab"
import { errorMessage } from "./errorMessage"
import {
  useApi,
  useDeleteApi,
  useExportApi,
  useIntegrations,
  useRoutes,
  useStages,
} from "../data/queries"
import type { Api, Stage } from "../data/schemas"

type Tab = "routes" | "integrations" | "stages" | "deployments"

const TABS: { value: Tab; label: string }[] = [
  { value: "routes", label: "Routes" },
  { value: "integrations", label: "Integrations" },
  { value: "stages", label: "Stages" },
  { value: "deployments", label: "Deployments" },
]

/**
 * One HTTP API.
 *
 * The top of the page answers "how does a call reach my backend?" — the invoke
 * URL, then the stage, route and integration a request passes through — because
 * that chain is the thing an operator is usually here to check or fix. Each
 * link in it opens the tab that edits it. The tabs below are the full lists.
 */
export function ApiDetailPage() {
  const { apiId = "" } = useParams()
  const navigate = useNavigate()
  const { data: api, error, isLoading } = useApi(apiId)
  const [tab, setTab] = useState<Tab>("routes")

  if (error) {
    return (
      <EmptyState
        icon={Network}
        title="Could not load this API"
        description={errorMessage(error, "Could not load")}
      />
    )
  }

  const name = api?.name || apiId

  return (
    <>
      <PageHeader
        title={name}
        icon={Network}
        // ".." rather than a literal: the console is mounted at /apigateway in
        // serverless-web and at .../api-gateway in cloud-react.
        breadcrumbs={[{ label: "API Gateway", to: ".." }, { label: name }]}
        description={api?.description || undefined}
        // common-ui is instantiated twice in serverless-web, so a router context
        // mounted through one instance is invisible to a component resolved
        // from the other. The crumb's link is passed in rather than looked up.
        renderLink={(crumb, children) => <Link to={crumb.to ?? "#"}>{children}</Link>}
        actions={
          <>
            <ExportButton apiId={apiId} />
            <DeleteApiButton
              apiId={apiId}
              name={name}
              onDeleted={() => {
                void navigate("..", { relative: "path" })
              }}
            />
          </>
        }
      />

      <RequestAnatomy apiId={apiId} api={api} loading={isLoading} onOpen={setTab} />

      <section className="border-border bg-card/40 mb-8 rounded-xl border p-5">
        <h2 className="text-muted-foreground mb-4 text-xs font-medium tracking-wide uppercase">
          Settings
        </h2>
        {isLoading || !api ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <KeyValueGrid columns={3} items={settingsOf(api)} />
        )}
      </section>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as Tab)
        }}
      >
        <TabsList>
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="routes" className="mt-5">
          <RoutesTab apiId={apiId} />
        </TabsContent>
        <TabsContent value="integrations" className="mt-5">
          <IntegrationsTab apiId={apiId} />
        </TabsContent>
        <TabsContent value="stages" className="mt-5">
          <StagesTab apiId={apiId} endpoint={api?.apiEndpoint ?? ""} />
        </TabsContent>
        <TabsContent value="deployments" className="mt-5">
          <DeploymentsTab apiId={apiId} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function corsLabel(api: Api): string {
  const cors = api.corsConfiguration
  if (!cors) return "Off"
  return cors.allowOrigins.length === 0 ? "On, no origins allowed" : cors.allowOrigins.join(", ")
}

/** A ready-to-run call to the first real route, through the default stage. */
function buildCurl(base: string, route: [string, string] | undefined): string {
  const method = route && route[0] !== "GET" && route[0] !== "ANY" ? `-X ${route[0]} ` : ""
  const path = route?.[1] ?? "/"
  return `curl ${method}${base}${path}`
}

function settingsOf(api: Api) {
  return [
    { label: "API ID", value: api.apiId, mono: true, copyable: true },
    { label: "Protocol", value: api.protocolType || "HTTP" },
    {
      label: "Endpoint type",
      value: api.endpointType === "REGIONAL" ? "Regional" : api.endpointType || undefined,
    },
    {
      label: "IP address type",
      value: api.ipAddressType === "dualstack" ? "Dualstack (IPv4 and IPv6)" : "IPv4",
    },
    {
      label: "Minimum TLS version",
      value: api.securityPolicy ? api.securityPolicy.replace("TLS_1_", "TLS 1.") : undefined,
    },
    {
      label: "CORS",
      value: corsLabel(api),
    },
    { label: "Version", value: api.version || undefined },
    { label: "Created", value: api.createdDate ? timeAgo(api.createdDate) : undefined },
    {
      label: "Default endpoint",
      value: api.disableExecuteApiEndpoint ? "Off — custom domains only" : "On",
    },
  ]
}

/**
 * The invoke URL, then the three things a request passes through on its way
 * to a backend. Each cell opens the tab that edits it, so a gap in the chain
 * (no stage, no route, a route with no backend) is one click from its fix.
 */
function RequestAnatomy({
  apiId,
  api,
  loading,
  onOpen,
}: Readonly<{ apiId: string; api?: Api; loading: boolean; onOpen: (tab: Tab) => void }>) {
  const { data: stages, isLoading: stagesLoading } = useStages(apiId)
  const { data: routes } = useRoutes(apiId)
  const { data: integrations } = useIntegrations(apiId)

  const endpoint = api?.apiEndpoint ?? ""
  const orderedStages = orderStages(stages ?? [])
  const stage = orderedStages[0]
  const sample = (routes ?? [])
    .map((route) => splitRouteKey(route.routeKey))
    .find(([, path]) => !path.startsWith("$"))
  const stagePrefix = stage && stage.stageName !== DEFAULT_STAGE ? `/${stage.stageName}` : ""
  const samplePath = sample?.[1] ?? "/"
  const baseUrl = endpoint && stage ? stageUrl(endpoint, stage.stageName) : endpoint
  const curl = endpoint ? buildCurl(baseUrl, sample) : ""

  const kinds = [...new Set((integrations ?? []).map((row) => targetKindOf(row).label))]
  const routeCount = routes?.length ?? 0
  const noStage = !stagesLoading && orderedStages.length === 0

  return (
    <section
      aria-label="How a request reaches your backend"
      className="border-border from-card/80 to-card/30 mb-5 overflow-hidden rounded-xl border bg-gradient-to-b"
    >
      <div className="px-5 pt-5 pb-4">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Invoke URL
        </p>
        {loading ? (
          <Skeleton className="h-7 w-3/4" />
        ) : (
          <InvokeUrl
            endpoint={endpoint}
            stagePrefix={stagePrefix}
            path={samplePath}
            copyValue={baseUrl}
          />
        )}
      </div>

      <ol className="border-border grid border-t md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <AnatomyCell
          label="Stage"
          onOpen={() => {
            onOpen("stages")
          }}
          warn={noStage}
        >
          <StageSummary
            apiId={apiId}
            stage={stage}
            others={orderedStages.length - 1}
            missing={noStage}
          />
        </AnatomyCell>
        <Joint />
        <AnatomyCell
          label="Routes"
          onOpen={() => {
            onOpen("routes")
          }}
          warn={routes !== undefined && routeCount === 0}
        >
          {routeCount === 0 ? (
            <span>No routes: every request gets a 404.</span>
          ) : (
            <span className="flex flex-col gap-1">
              {(routes ?? []).slice(0, 2).map((route) => {
                const [method, path] = splitRouteKey(route.routeKey)
                return (
                  <span key={route.routeId} className="flex min-w-0 items-center gap-2">
                    <MethodTag method={method} />
                    <span className="text-foreground truncate font-mono text-[12px]">{path}</span>
                  </span>
                )
              })}
              {routeCount > 2 ? <span>+{String(routeCount - 2)} more</span> : null}
            </span>
          )}
        </AnatomyCell>
        <Joint />
        <AnatomyCell
          label="Integrations"
          onOpen={() => {
            onOpen("integrations")
          }}
          warn={integrations?.length === 0}
        >
          {(integrations ?? []).length === 0 ? (
            <span>No backend connected yet.</span>
          ) : (
            <>
              <span className="text-foreground text-[13px] font-semibold">
                {String(integrations?.length ?? 0)} backend
                {integrations?.length === 1 ? "" : "s"}
              </span>
              <span className="block">{kinds.join(" · ")}</span>
            </>
          )}
        </AnatomyCell>
      </ol>

      {curl ? (
        <div className="border-border bg-background/40 flex items-center gap-3 border-t px-5 py-3">
          <span className="text-muted-foreground shrink-0 text-xs">Try it</span>
          <code className="text-foreground min-w-0 flex-1 truncate font-mono text-[12px]">
            {curl}
          </code>
          <CopyButton value={curl} label="Copy" mono={false} className="shrink-0 text-xs" />
        </div>
      ) : null}
    </section>
  )
}

function InvokeUrl({
  endpoint,
  stagePrefix,
  path,
  copyValue,
}: Readonly<{ endpoint: string; stagePrefix: string; path: string; copyValue: string }>) {
  if (!endpoint) {
    return (
      <p className="text-muted-foreground text-sm">
        This API has no default endpoint. It is reachable only through a custom domain.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="min-w-0 font-mono text-[15px] leading-7 break-all sm:text-base">
        <span className="text-foreground">{endpoint}</span>
        {stagePrefix ? <span className="text-brand-gold">{stagePrefix}</span> : null}
        <span className="text-muted-foreground">{path}</span>
      </p>
      <CopyButton
        value={copyValue}
        label="Copy URL"
        mono={false}
        className="border-border hover:bg-muted/40 rounded-md border px-2 py-1 text-xs"
      />
    </div>
  )
}

function StageSummary({
  apiId,
  stage,
  others,
  missing,
}: Readonly<{ apiId: string; stage?: Stage; others: number; missing: boolean }>) {
  if (missing) {
    return (
      <span className="flex flex-col items-start gap-2">
        <span>No stage, so nothing is served.</span>
        <EnableDefaultStageButton apiId={apiId} />
      </span>
    )
  }
  if (!stage) return <Skeleton className="h-4 w-24" />
  return (
    <>
      <span className="text-foreground font-mono text-[13px] font-semibold">{stage.stageName}</span>
      <span className="block">
        {stage.autoDeploy ? "Auto-deploys every change" : "Deploys manually"}
        {others > 0 ? ` · +${String(others)} more` : ""}
      </span>
    </>
  )
}

function AnatomyCell({
  label,
  warn,
  onOpen,
  children,
}: Readonly<{ label: string; warn?: boolean; onOpen: () => void; children: ReactNode }>) {
  return (
    <li className="min-w-0">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onOpen()
          }
        }}
        className="hover:bg-muted/30 focus-visible:ring-brand-gold/50 h-full cursor-pointer px-5 py-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        <span className="mb-1.5 flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              warn ? "bg-status-warning" : "bg-status-success",
            )}
          />
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
        </span>
        <span className="text-muted-foreground block text-xs leading-5">{children}</span>
      </div>
    </li>
  )
}

/** The arrow between two links of the chain. Sideways on wide screens, down on narrow. */
function Joint() {
  return (
    <li aria-hidden className="text-muted-foreground/60 flex items-center justify-center">
      <ChevronRight className="size-4 rotate-90 md:rotate-0" />
    </li>
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
    <Button
      variant="outline"
      loading={exportApi.isPending}
      title={exportApi.error ? errorMessage(exportApi.error, "Could not export") : undefined}
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
      <Download /> {exportApi.error ? "Export failed — retry" : "Export OpenAPI"}
    </Button>
  )
}

function DeleteApiButton({
  apiId,
  name,
  onDeleted,
}: Readonly<{ apiId: string; name: string; onDeleted: () => void }>) {
  const remove = useDeleteApi()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete API"
        title="Delete API"
        onClick={() => {
          setOpen(true)
        }}
        className="text-muted-foreground hover:text-status-danger"
      >
        <Trash2 />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its routes, integrations, stages and deployments are deleted with it, and its invoke
              URL stops answering. Your backends are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error ? (
            <p role="alert" className="text-status-danger text-xs">
              {errorMessage(remove.error, "Could not delete the API.")}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Stay open until the delete lands, so a failure is shown here.
                event.preventDefault()
                remove.mutate(apiId, { onSuccess: onDeleted })
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete API"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
