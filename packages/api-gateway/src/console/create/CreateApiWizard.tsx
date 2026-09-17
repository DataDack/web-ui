import { useMemo, useState, type ReactNode } from "react"

import { ArrowLeftRight, Globe, Plus, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

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
  Checkbox,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
} from "@datadack/common-ui"

import {
  DEFAULT_ROUTE_KEY,
  DEFAULT_STAGE,
  HTTP_METHODS,
  draftKey,
  duplicates,
  integrationLabel,
  nameError,
  routeKeyOf,
  routePathError,
  stageNameError,
  uriError,
  wizardRoutes,
  wizardStages,
  type BackendKind,
  type IntegrationDraft,
  type RouteDraft,
  type StageDraft,
} from "./model"
import {
  ChoiceCards,
  EmptyList,
  Field,
  FormError,
  ReviewItem,
  Section,
  StepRail,
  WizardFooter,
  WizardLayout,
  crumbLink,
  useGatewayBase,
  type WizardStep,
} from "./parts"
import { useCreateApi } from "../../data/queries"
import type { IpAddressType, WizardRouteInput } from "../../data/transport"
import { errorMessage } from "../errorMessage"

type Protocol = "HTTP" | "WEBSOCKET"

const HTTP_STEPS: WizardStep[] = [
  { title: "Configure API" },
  { title: "Configure routes", optional: true },
  { title: "Define stages", optional: true },
  { title: "Review and create" },
]

const WEBSOCKET_STEPS: WizardStep[] = [
  { title: "Configure API" },
  { title: "Add routes" },
  { title: "Attach integrations" },
  { title: "Add stages", optional: true },
  { title: "Review and create" },
]

const IP_CHOICES = [
  { value: "ipv4" as const, label: "IPv4", description: "Includes only IPv4 addresses." },
  {
    value: "dualstack" as const,
    label: "Dualstack",
    description: "Includes IPv4 and IPv6 addresses.",
  },
]

/** A WebSocket API's routes: the three reserved keys, and what each one is for. */
const WEBSOCKET_ROUTES = [
  { key: "$connect", description: "Runs when a client opens a connection." },
  { key: "$disconnect", description: "Runs after a client or the server closes a connection." },
  {
    key: DEFAULT_ROUTE_KEY,
    description: "Runs for any message the route selection expression does not match.",
  },
]

interface WebSocketBackend {
  kind: BackendKind | "NONE"
  uri: string
}

const BACKEND_KINDS: { value: BackendKind; label: string; placeholder: string }[] = [
  { value: "HTTP", label: "HTTP URL", placeholder: "https://backend.example.com" },
  { value: "FUNCTION", label: "Function", placeholder: "my-function" },
]

const placeholderFor = (kind: BackendKind) =>
  BACKEND_KINDS.find((it) => it.value === kind)?.placeholder ?? ""

/**
 * The step-by-step create flow for HTTP and WebSocket APIs.
 *
 * Everything collected is submitted in ONE CreateApi call, which the control
 * plane applies in one transaction. That is why nothing is created until the
 * last screen: an API is never left half-built because its third route was
 * invalid, and Cancel at any step genuinely leaves nothing behind.
 *
 * The steps follow the AWS console's for each protocol, because they differ
 * for a reason: an HTTP API is integrations then routes that point at them; a
 * WebSocket API is lifecycle routes first, then a backend for each.
 */
export function CreateApiWizard({ protocol }: Readonly<{ protocol: Protocol }>) {
  const navigate = useNavigate()
  const base = useGatewayBase()
  const create = useCreateApi()
  const websocket = protocol === "WEBSOCKET"
  const steps = websocket ? WEBSOCKET_STEPS : HTTP_STEPS
  const reviewStep = steps.length - 1

  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  /** Steps the operator tried to leave. Errors show only there — not on first sight. */
  const [attempted, setAttempted] = useState<Set<number>>(new Set())

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [version, setVersion] = useState("")
  const [ipAddressType, setIpAddressType] = useState<IpAddressType>("ipv4")
  const [selectionExpression, setSelectionExpression] = useState("request.body.action")

  const [integrations, setIntegrations] = useState<IntegrationDraft[]>([])
  const [routes, setRoutes] = useState<RouteDraft[]>([])
  const [seededRoutes, setSeededRoutes] = useState(false)

  const [wsRoutes, setWsRoutes] = useState<Set<string>>(
    new Set(WEBSOCKET_ROUTES.map((route) => route.key)),
  )
  const [wsBackends, setWsBackends] = useState<Record<string, WebSocketBackend>>({})

  const [stages, setStages] = useState<StageDraft[]>([
    {
      key: draftKey(),
      name: websocket ? "production" : DEFAULT_STAGE,
      autoDeploy: true,
    },
  ])

  // ── Validation, per step ────────────────────────────────────────────────

  const routeDupes = useMemo(() => duplicates(routes.map((route) => routeKeyOf(route))), [routes])
  const stageDupes = useMemo(() => duplicates(stages.map((stage) => stage.name.trim())), [stages])
  const orderedWsRoutes = WEBSOCKET_ROUTES.filter((route) => wsRoutes.has(route.key))

  const stepValid = (index: number): boolean => {
    const title = steps[index]?.title
    switch (title) {
      case "Configure API":
        return (
          !nameError(name) &&
          (!websocket || selectionExpression.trim() !== "") &&
          integrations.every((it) => !uriError(it.kind, it.uri))
        )
      case "Configure routes":
        return routes.every(
          (route) => !routePathError(route.path) && !routeDupes.has(routeKeyOf(route)),
        )
      case "Add routes":
        return wsRoutes.size > 0
      case "Attach integrations":
        return orderedWsRoutes.every((route) => {
          const backend = wsBackends[route.key]
          return !backend || backend.kind === "NONE" || !uriError(backend.kind, backend.uri)
        })
      case "Define stages":
      case "Add stages":
        return stages.every(
          (stage) => !stageNameError(stage.name) && !stageDupes.has(stage.name.trim()),
        )
      default:
        return true
    }
  }
  const showErrors = attempted.has(step)

  const goTo = (index: number) => {
    create.reset()
    setStep(index)
    setFurthest((current) => Math.max(current, index))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const next = () => {
    if (!stepValid(step)) {
      setAttempted((current) => new Set(current).add(step))
      return
    }
    // Arriving at routes with a backend but no routes: offer the obvious one,
    // once, the way AWS proposes a route per integration. $default rather than
    // a guessed path, because it is what the old quick-create built.
    if (!websocket && step === 0 && !seededRoutes && routes.length === 0) {
      const first = integrations[0]
      if (first) {
        setRoutes([
          { key: draftKey(), method: "ANY", path: DEFAULT_ROUTE_KEY, integration: first.key },
        ])
      }
      setSeededRoutes(true)
    }
    goTo(step + 1)
  }

  /** Validates every step before the one call; jumps to the first that fails. */
  const submit = () => {
    const invalid = steps.findIndex((_, index) => index < reviewStep && !stepValid(index))
    if (invalid !== -1) {
      setAttempted((current) => new Set(current).add(invalid))
      goTo(invalid)
      return
    }
    const payloadRoutes: WizardRouteInput[] = websocket
      ? orderedWsRoutes.map((route) => {
          const backend = wsBackends[route.key]
          return backend && backend.kind !== "NONE"
            ? {
                routeKey: route.key,
                target: backend.uri.trim(),
                integrationType: backend.kind === "FUNCTION" ? "AWS_PROXY" : "HTTP_PROXY",
              }
            : { routeKey: route.key }
        })
      : wizardRoutes(routes, integrations)

    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        version: version.trim() || undefined,
        protocolType: protocol,
        ipAddressType,
        routeSelectionExpression: websocket
          ? `$${selectionExpression.trim().replace(/^\$/, "")}`
          : undefined,
        routes: payloadRoutes,
        stages: wizardStages(stages),
      },
      {
        onSuccess: (api) => {
          void navigate(`${base}/${encodeURIComponent(api.apiId)}`)
        },
      },
    )
  }

  const dirty =
    name !== "" || description !== "" || integrations.length > 0 || routes.length > 0 || step > 0
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const cancel = () => {
    if (dirty) setConfirmingCancel(true)
    else void navigate(base)
  }

  // ── List edits ──────────────────────────────────────────────────────────

  const patchIntegration = (key: string, patch: Partial<IntegrationDraft>) => {
    setIntegrations((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }
  const removeIntegration = (key: string) => {
    setIntegrations((list) => list.filter((it) => it.key !== key))
    // A route pointing at it would otherwise submit a backend that no longer exists.
    setRoutes((list) =>
      list.map((route) => (route.integration === key ? { ...route, integration: "" } : route)),
    )
  }
  const patchRoute = (key: string, patch: Partial<RouteDraft>) => {
    setRoutes((list) => list.map((route) => (route.key === key ? { ...route, ...patch } : route)))
  }
  const patchStage = (key: string, patch: Partial<StageDraft>) => {
    setStages((list) => list.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)))
  }

  // ── Screens ─────────────────────────────────────────────────────────────

  const configureApi = (
    <>
      <Section title="API details">
        <Field
          label="API name"
          htmlFor="api-name"
          hint="A name to identify and organize your API. It does not have to be unique — the API ID generated for it is what you refer to it by."
          error={showErrors ? nameError(name) : undefined}
        >
          <Input
            id="api-name"
            value={name}
            maxLength={128}
            placeholder={websocket ? "chat-api" : "checkout-api"}
            aria-invalid={showErrors && Boolean(nameError(name))}
            onChange={(event) => {
              setName(event.target.value)
            }}
            className="max-w-xl"
          />
        </Field>
        <Field label="Description" optional htmlFor="api-description">
          <Textarea
            id="api-description"
            value={description}
            maxLength={1024}
            rows={2}
            onChange={(event) => {
              setDescription(event.target.value)
            }}
            className="max-w-xl"
          />
        </Field>
        {websocket ? null : (
          <Field
            label="Version"
            optional
            htmlFor="api-version"
            hint="A label for your own bookkeeping, such as 2026-09 or v2."
          >
            <Input
              id="api-version"
              value={version}
              maxLength={64}
              placeholder="v1"
              onChange={(event) => {
                setVersion(event.target.value)
              }}
              className="max-w-xs"
            />
          </Field>
        )}
        <Field
          label="IP address type"
          hint="Which IP addresses can call the API's default endpoint. You can change this later without redeploying."
        >
          <ChoiceCards
            label="IP address type"
            choices={IP_CHOICES}
            value={ipAddressType}
            onChange={setIpAddressType}
          />
        </Field>
        {websocket ? (
          <Field
            label="Route selection expression"
            htmlFor="api-selection"
            hint='Tells the API which route a message goes to. With request.body.action, a message of {"action": "sendMessage"} is routed by its action.'
            error={
              showErrors && selectionExpression.trim() === ""
                ? "Enter a route selection expression."
                : undefined
            }
          >
            <div className="border-input focus-within:ring-ring/50 flex max-w-xl items-stretch overflow-hidden rounded-md border focus-within:ring-2">
              <span className="border-input bg-muted/50 text-muted-foreground flex items-center border-r px-3 font-mono text-sm">
                $
              </span>
              <input
                id="api-selection"
                value={selectionExpression}
                placeholder="request.body.action"
                onChange={(event) => {
                  setSelectionExpression(event.target.value.replace(/^\$/, ""))
                }}
                className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none"
              />
            </div>
          </Field>
        ) : null}
      </Section>

      {websocket ? null : (
        <Section
          title="Integrations"
          count={integrations.length}
          description="The backends your API talks to. For a function, the API invokes it and returns its response; for an HTTP URL, it forwards the request and returns what the URL answers."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIntegrations((list) => [...list, { key: draftKey(), kind: "HTTP", uri: "" }])
              }}
            >
              <Plus /> Add integration
            </Button>
          }
        >
          {integrations.length === 0 ? (
            <EmptyList>
              No integrations yet. An API can be created without one and connected to a backend
              later.
            </EmptyList>
          ) : (
            <div className="flex flex-col gap-3">
              {integrations.map((integration, index) => {
                const error = showErrors ? uriError(integration.kind, integration.uri) : undefined
                return (
                  <div
                    key={integration.key}
                    className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[170px_minmax(0,1fr)_auto] sm:items-start"
                  >
                    <Field label="Type" className="gap-1">
                      <Select
                        value={integration.kind}
                        onValueChange={(value) => {
                          patchIntegration(integration.key, { kind: value as BackendKind })
                        }}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label={`Integration ${String(index + 1)} type`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BACKEND_KINDS.map((kind) => (
                            <SelectItem key={kind.value} value={kind.value}>
                              {kind.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field
                      label={integration.kind === "FUNCTION" ? "Function name" : "URL endpoint"}
                      className="gap-1"
                      error={error}
                    >
                      <Input
                        value={integration.uri}
                        placeholder={placeholderFor(integration.kind)}
                        aria-invalid={Boolean(error)}
                        aria-label={`Integration ${String(index + 1)} target`}
                        onChange={(event) => {
                          patchIntegration(integration.key, { uri: event.target.value })
                        }}
                        className="font-mono text-[13px]"
                      />
                    </Field>
                    <RemoveButton
                      label={`Remove integration ${String(index + 1)}`}
                      onClick={() => {
                        removeIntegration(integration.key)
                      }}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      )}
    </>
  )

  const configureRoutes = (
    <Section
      title="Configure routes"
      count={routes.length}
      description={
        <>
          A route sends requests to a backend by method and path, such as{" "}
          <code className="font-mono">GET /orders/&#123;id&#125;</code>. Use{" "}
          <code className="font-mono">$default</code> to catch every request no other route matches.
        </>
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRoutes((list) => [
              ...list,
              {
                key: draftKey(),
                method: "GET",
                path: "/",
                integration: integrations[0]?.key ?? "",
              },
            ])
          }}
        >
          <Plus /> Add route
        </Button>
      }
    >
      {routes.length === 0 ? (
        <EmptyList>
          No routes. You can add them now, or later from the API&apos;s Routes tab.
        </EmptyList>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-muted-foreground hidden grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)_36px] gap-3 px-3 text-xs font-medium md:grid">
            <span>Method</span>
            <span>Resource path</span>
            <span>Integration target</span>
          </div>
          {routes.map((route, index) => {
            const reserved = route.path.trim().startsWith("$")
            const pathError = showErrors ? routeError(route, routeDupes) : undefined
            const n = String(index + 1)
            return (
              <div
                key={route.key}
                className="border-border grid gap-3 rounded-lg border p-3 md:grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)_36px] md:items-start"
              >
                <Select
                  value={reserved ? "ANY" : route.method}
                  disabled={reserved}
                  onValueChange={(value) => {
                    patchRoute(route.key, { method: value })
                  }}
                >
                  <SelectTrigger
                    className="w-full font-mono text-[13px]"
                    aria-label={`Route ${n} method`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((method) => (
                      <SelectItem key={method} value={method} className="font-mono text-[13px]">
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-col gap-1">
                  <Input
                    value={route.path}
                    placeholder="/orders/{id}"
                    aria-label={`Route ${n} path`}
                    aria-invalid={Boolean(pathError)}
                    onChange={(event) => {
                      patchRoute(route.key, { path: event.target.value })
                    }}
                    className="font-mono text-[13px]"
                  />
                  {pathError ? (
                    <p role="alert" className="text-status-danger text-xs">
                      {pathError}
                    </p>
                  ) : null}
                </div>
                <Select
                  value={route.integration || "none"}
                  onValueChange={(value) => {
                    patchRoute(route.key, { integration: value === "none" ? "" : value })
                  }}
                >
                  <SelectTrigger className="w-full" aria-label={`Route ${n} integration`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No integration</SelectItem>
                    {integrations.map((integration, at) => (
                      <SelectItem key={integration.key} value={integration.key}>
                        {integrationLabel(integration, at)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <RemoveButton
                  label={`Remove route ${n}`}
                  onClick={() => {
                    setRoutes((list) => list.filter((it) => it.key !== route.key))
                  }}
                />
              </div>
            )
          })}
          {integrations.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              To point a route at a backend, go back and add an integration first.
            </p>
          ) : null}
        </div>
      )}
    </Section>
  )

  const addWebSocketRoutes = (
    <Section
      title="Add routes"
      count={wsRoutes.size}
      description="Predefined routes handle a connection's lifecycle. Choose the ones this API needs — at least one."
    >
      <div className="grid gap-3">
        {WEBSOCKET_ROUTES.map((route) => {
          const checked = wsRoutes.has(route.key)
          const id = `ws-route-${route.key.slice(1)}`
          return (
            <label
              key={route.key}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                checked ? "border-brand-gold bg-brand-gold/10" : "border-border hover:bg-muted/30",
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => {
                  setWsRoutes((current) => {
                    const nextSet = new Set(current)
                    if (value === true) nextSet.add(route.key)
                    else nextSet.delete(route.key)
                    return nextSet
                  })
                }}
                className="mt-0.5"
              />
              <span>
                <span className="text-foreground block font-mono text-sm font-medium">
                  {route.key}
                </span>
                <span className="text-muted-foreground block text-xs">{route.description}</span>
              </span>
            </label>
          )
        })}
      </div>
      {showErrors && wsRoutes.size === 0 ? (
        <p role="alert" className="text-status-danger text-xs">
          Choose at least one route.
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Custom route keys (such as <code className="font-mono">sendMessage</code>) are not supported
        by this control plane yet. Route those messages through{" "}
        <code className="font-mono">$default</code>.
      </p>
    </Section>
  )

  const attachWebSocketIntegrations = (
    <Section
      title="Attach integrations"
      description="Choose the backend each route invokes. A route with no integration is created unattached and can be connected later."
    >
      <div className="flex flex-col gap-3">
        {orderedWsRoutes.map((route) => {
          const backend = wsBackends[route.key] ?? { kind: "NONE", uri: "" }
          const error =
            showErrors && backend.kind !== "NONE" ? uriError(backend.kind, backend.uri) : undefined
          const setBackend = (patch: Partial<WebSocketBackend>) => {
            setWsBackends((current) => ({ ...current, [route.key]: { ...backend, ...patch } }))
          }
          return (
            <div
              key={route.key}
              className="border-border grid gap-3 rounded-lg border p-3 md:grid-cols-[140px_170px_minmax(0,1fr)] md:items-start"
            >
              <span className="text-foreground self-center font-mono text-sm font-medium">
                {route.key}
              </span>
              <Select
                value={backend.kind}
                onValueChange={(value) => {
                  setBackend({ kind: value as WebSocketBackend["kind"] })
                }}
              >
                <SelectTrigger className="w-full" aria-label={`${route.key} integration type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No integration</SelectItem>
                  {BACKEND_KINDS.map((kind) => (
                    <SelectItem key={kind.value} value={kind.value}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {backend.kind === "NONE" ? (
                <span className="text-muted-foreground self-center text-xs">Attach one later.</span>
              ) : (
                <div className="flex flex-col gap-1">
                  <Input
                    value={backend.uri}
                    placeholder={placeholderFor(backend.kind)}
                    aria-label={`${route.key} integration target`}
                    aria-invalid={Boolean(error)}
                    onChange={(event) => {
                      setBackend({ uri: event.target.value })
                    }}
                    className="font-mono text-[13px]"
                  />
                  {error ? (
                    <p role="alert" className="text-status-danger text-xs">
                      {error}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )

  const defineStages = (
    <Section
      title={websocket ? "Add stages" : "Define stages"}
      count={stages.length}
      description="Stages are independently deployable environments of your API, such as dev and production. With auto-deploy on, every change is deployed to the stage automatically."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStages((list) => [...list, { key: draftKey(), name: "", autoDeploy: false }])
          }}
        >
          <Plus /> Add stage
        </Button>
      }
    >
      {stages.length === 0 ? (
        <EmptyList>
          No stages. The API will be created with a <code className="font-mono">$default</code>{" "}
          stage that deploys automatically.
        </EmptyList>
      ) : (
        <div className="flex flex-col gap-3">
          {stages.map((stage, index) => {
            const n = String(index + 1)
            const error = showErrors ? stageError(stage, stageDupes) : undefined
            return (
              <div
                key={stage.key}
                className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_auto_36px] sm:items-start"
              >
                <div className="flex flex-col gap-1">
                  <Input
                    value={stage.name}
                    placeholder="production"
                    aria-label={`Stage ${n} name`}
                    aria-invalid={Boolean(error)}
                    onChange={(event) => {
                      patchStage(stage.key, { name: event.target.value })
                    }}
                    className="font-mono text-[13px]"
                  />
                  {error ? (
                    <p role="alert" className="text-status-danger text-xs">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    id={`stage-${stage.key}-auto`}
                    checked={stage.autoDeploy}
                    onCheckedChange={(value) => {
                      patchStage(stage.key, { autoDeploy: value })
                    }}
                  />
                  <Label htmlFor={`stage-${stage.key}-auto`} className="text-foreground text-sm">
                    Auto-deploy
                  </Label>
                </div>
                <RemoveButton
                  label={`Remove stage ${n}`}
                  onClick={() => {
                    setStages((list) => list.filter((it) => it.key !== stage.key))
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )

  const editButton = (title: string) => {
    const index = steps.findIndex((it) => it.title === title)
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          goTo(index)
        }}
      >
        Edit
      </Button>
    )
  }

  const review = (
    <>
      {create.error ? (
        <FormError
          title="The API was not created"
          message={errorMessage(create.error, "Could not create the API.")}
        />
      ) : null}
      <Section title={`Step 1: ${steps[0]?.title ?? ""}`} actions={editButton("Configure API")}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReviewItem label="API name">{name.trim()}</ReviewItem>
          <ReviewItem label="Protocol" mono>
            {protocol}
          </ReviewItem>
          <ReviewItem label="IP address type">
            {ipAddressType === "ipv4" ? "IPv4" : "Dualstack"}
          </ReviewItem>
          {description.trim() ? (
            <ReviewItem label="Description">{description.trim()}</ReviewItem>
          ) : null}
          {version.trim() ? <ReviewItem label="Version">{version.trim()}</ReviewItem> : null}
          {websocket ? (
            <ReviewItem label="Route selection expression" mono>
              ${selectionExpression.trim()}
            </ReviewItem>
          ) : null}
        </dl>
        {websocket ? null : (
          <ReviewList
            title="Integrations"
            empty="No integrations"
            rows={integrations.map((it, index) => ({
              key: it.key,
              left: it.kind === "FUNCTION" ? "Function" : "HTTP URL",
              right: it.uri.trim() || `Integration ${String(index + 1)}`,
            }))}
          />
        )}
      </Section>

      {websocket ? (
        <Section title="Steps 2 and 3: Routes and integrations" actions={editButton("Add routes")}>
          <ReviewList
            title="Routes"
            empty="No routes"
            rows={orderedWsRoutes.map((route) => {
              const backend = wsBackends[route.key]
              return {
                key: route.key,
                left: route.key,
                right: describeBackend(backend),
              }
            })}
          />
        </Section>
      ) : (
        <Section title="Step 2: Routes" actions={editButton("Configure routes")}>
          <ReviewList
            title="Routes"
            empty="No routes"
            rows={routes.map((route) => {
              const at = integrations.findIndex((it) => it.key === route.integration)
              const backend = integrations[at]
              return {
                key: route.key,
                left: routeKeyOf(route),
                right: backend ? integrationLabel(backend, at) : "No integration",
              }
            })}
          />
        </Section>
      )}

      <Section
        title={`Step ${String(reviewStep)}: Stages`}
        actions={editButton(websocket ? "Add stages" : "Define stages")}
      >
        <ReviewList
          title="Stages"
          empty="$default, auto-deploy on (created automatically)"
          rows={stages.map((stage) => ({
            key: stage.key,
            left: stage.name.trim(),
            right: stage.autoDeploy ? "Auto-deploy on" : "Auto-deploy off",
          }))}
        />
      </Section>
    </>
  )

  const screens: Record<string, ReactNode> = {
    "Configure API": configureApi,
    "Configure routes": configureRoutes,
    "Add routes": addWebSocketRoutes,
    "Attach integrations": attachWebSocketIntegrations,
    "Define stages": defineStages,
    "Add stages": defineStages,
    "Review and create": review,
  }
  const current = steps[step]
  const onReview = step < reviewStep && furthest === reviewStep

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={websocket ? "Create WebSocket API" : "Create HTTP API"}
        icon={websocket ? ArrowLeftRight : Globe}
        breadcrumbs={[
          { label: "API Gateway", to: base },
          { label: "Create API", to: `${base}/create` },
          { label: websocket ? "WebSocket API" : "HTTP API" },
        ]}
        renderLink={crumbLink}
      />
      <WizardLayout
        rail={<StepRail steps={steps} current={step} furthest={furthest} onSelect={goTo} />}
      >
        <h2 className="text-foreground mb-4 text-xl font-semibold tracking-tight">
          {current?.title}
        </h2>
        {current ? screens[current.title] : null}
        <WizardFooter
          onCancel={cancel}
          onPrevious={
            step > 0
              ? () => {
                  goTo(step - 1)
                }
              : undefined
          }
          onReview={
            onReview
              ? () => {
                  if (!stepValid(step)) {
                    setAttempted((set) => new Set(set).add(step))
                    return
                  }
                  goTo(reviewStep)
                }
              : undefined
          }
          primaryLabel={step === reviewStep ? "Create" : "Next"}
          primaryLoading={create.isPending}
          onPrimary={step === reviewStep ? submit : next}
        />
      </WizardLayout>

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this API?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing has been created yet, so leaving now discards everything entered on these
              steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void navigate(base)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function routeError(route: RouteDraft, dupes: Set<string>): string | undefined {
  const invalid = routePathError(route.path)
  if (invalid) return invalid
  return dupes.has(routeKeyOf(route)) ? "This route is listed more than once." : undefined
}

function stageError(stage: StageDraft, dupes: Set<string>): string | undefined {
  const invalid = stageNameError(stage.name)
  if (invalid) return invalid
  return dupes.has(stage.name.trim()) ? "Stage names must be unique." : undefined
}

function describeBackend(backend: WebSocketBackend | undefined): string {
  if (!backend || backend.kind === "NONE") return "No integration"
  const kind = backend.kind === "FUNCTION" ? "Function" : "HTTP"
  return `${kind} · ${backend.uri.trim()}`
}

function RemoveButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-muted-foreground hover:text-status-danger justify-self-end sm:mt-0.5"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}

function ReviewList({
  title,
  empty,
  rows,
}: Readonly<{
  title: string
  empty: string
  rows: { key: string; left: string; right: string }[]
}>) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs">
        {title} ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="text-foreground text-sm">{empty}</p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-lg border">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2"
            >
              <span className="text-foreground font-mono text-[13px] font-medium">{row.left}</span>
              <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
                {row.right}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
