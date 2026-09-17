import { useEffect, useState } from "react"

import { Boxes, Copy, FileInput, Layers, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  Checkbox,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@datadack/common-ui"

import { ImportWarnings } from "./ImportResult"
import { nameError as checkName } from "./model"
import { EXAMPLE_DEFINITION, OpenApiSource, parseDefinition } from "./OpenApiSource"
import {
  ChoiceCards,
  Field,
  FormError,
  Section,
  WizardFooter,
  crumbLink,
  useGatewayBase,
  type Choice,
} from "./parts"
import {
  useApi,
  useApis,
  useCreateApi,
  useImportApi,
  useIntegrations,
  useRoutes,
  useStages,
} from "../../data/queries"
import type { ImportApiResult } from "../../data/schemas"
import type {
  EndpointType,
  IpAddressType,
  SecurityPolicy,
  WizardRouteInput,
} from "../../data/transport"
import { errorMessage } from "../errorMessage"

type Mode = "new" | "clone" | "import" | "example"

const MODES: Choice<Mode>[] = [
  { value: "new", label: "New API", description: "Create a new REST API.", icon: Boxes },
  {
    value: "clone",
    label: "Clone existing API",
    description: "Create a copy of an API in this account.",
    icon: Copy,
  },
  {
    value: "import",
    label: "Import API",
    description: "Import an API from an OpenAPI definition.",
    icon: FileInput,
  },
  {
    value: "example",
    label: "Example API",
    description: "Learn API Gateway with an example API.",
    icon: Sparkles,
  },
]

/**
 * Only Regional is offered live. Edge-optimized and Private are stored by the
 * control plane but mean nothing on this platform yet — there is no CDN in
 * front of an API and no VPC links behind one — so offering them as working
 * choices would describe an API that behaves exactly like a Regional one.
 */
const ENDPOINT_TYPES: Choice<EndpointType>[] = [
  {
    value: "REGIONAL",
    label: "Regional",
    description: "Served from the region the API is created in.",
  },
  {
    value: "EDGE",
    label: "Edge-optimized",
    disabled: true,
    disabledReason: "Not available on this platform yet.",
  },
  {
    value: "PRIVATE",
    label: "Private",
    disabled: true,
    disabledReason: "Needs VPC links, which this platform does not support yet.",
  },
]

const IP_CHOICES: Choice<IpAddressType>[] = [
  { value: "ipv4", label: "IPv4", description: "Supports only IPv4 addresses." },
  { value: "dualstack", label: "Dualstack", description: "Supports IPv4 and IPv6 addresses." },
]

/**
 * Create a REST API — on one page, as AWS does, with the four starting points
 * as the first choice. Every mode ends in ONE call that creates the API and
 * everything in it, so no mode can leave a half-copied API behind.
 */
export function CreateRestApiPage() {
  const navigate = useNavigate()
  const base = useGatewayBase()
  const createApi = useCreateApi()
  const importApi = useImportApi()

  const [mode, setMode] = useState<Mode>("new")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [endpointType, setEndpointType] = useState<EndpointType>("REGIONAL")
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy>("TLS_1_2")
  const [ipAddressType, setIpAddressType] = useState<IpAddressType>("ipv4")
  const [definition, setDefinition] = useState("")
  const [failOnWarnings, setFailOnWarnings] = useState(false)
  const [sourceId, setSourceId] = useState("")
  const [attempted, setAttempted] = useState(false)
  const [result, setResult] = useState<ImportApiResult>()

  // Clone reads the source's children, not its OpenAPI export: the export
  // leaves out $default and ANY routes, and a copy that quietly lost routes is
  // worse than no copy.
  const apis = useApis()
  const source = useApi(mode === "clone" ? sourceId || undefined : undefined)
  const sourceRoutes = useRoutes(mode === "clone" ? sourceId || undefined : undefined)
  const sourceIntegrations = useIntegrations(mode === "clone" ? sourceId || undefined : undefined)
  const sourceStages = useStages(mode === "clone" ? sourceId || undefined : undefined)
  const cloneLoading =
    Boolean(sourceId) &&
    (source.isLoading ||
      sourceRoutes.isLoading ||
      sourceIntegrations.isLoading ||
      sourceStages.isLoading)
  const cloneError =
    source.error ?? sourceRoutes.error ?? sourceIntegrations.error ?? sourceStages.error

  // Picking a source fills the form from it; the operator can still change any of it.
  useEffect(() => {
    const api = source.data
    if (mode !== "clone" || !api) return
    setName(`${api.name}-copy`.slice(0, 128))
    setDescription(api.description)
    if (api.ipAddressType === "ipv4" || api.ipAddressType === "dualstack") {
      setIpAddressType(api.ipAddressType)
    }
    if (api.securityPolicy === "TLS_1_0" || api.securityPolicy === "TLS_1_2") {
      setSecurityPolicy(api.securityPolicy)
    }
  }, [mode, source.data])

  const usesDefinition = mode === "import" || mode === "example"
  const body = mode === "example" ? EXAMPLE_DEFINITION : definition
  const { parsed, error: definitionError } = parseDefinition(body)
  const nameIsOptional = usesDefinition && Boolean(parsed?.title)
  const nameError = nameIsOptional && name.trim() === "" ? undefined : checkName(name)

  /** Integrations the wizard path cannot express (a MOCK has no URI) are skipped — and counted. */
  const cloneRoutes = (): { routes: WizardRouteInput[]; skipped: number } => {
    const integrations = new Map(
      (sourceIntegrations.data ?? []).map((it) => [it.integrationId, it]),
    )
    let skipped = 0
    const routes = (sourceRoutes.data ?? []).map((route): WizardRouteInput => {
      const integration = integrations.get(route.target.replace(/^integrations\//, ""))
      const target = integration?.integrationUri
        ? { target: integration.integrationUri, integrationType: integration.integrationType }
        : {}
      if (route.target && !target.target) skipped++
      return { routeKey: route.routeKey, ...target }
    })
    return { routes, skipped }
  }
  const skippedIntegrations =
    mode === "clone" && sourceId && !cloneLoading ? cloneRoutes().skipped : 0

  let sourceFieldError: string | undefined
  if (attempted && !sourceId) sourceFieldError = "Choose an API to clone."
  else if (cloneError) sourceFieldError = errorMessage(cloneError, "Could not read that API.")

  const busy = createApi.isPending || importApi.isPending
  const failure = createApi.error ?? importApi.error

  const submit = () => {
    setAttempted(true)
    if (nameError) return
    if (usesDefinition && definitionError) return
    if (mode === "clone" && (!sourceId || cloneLoading || cloneError)) return

    const settings = {
      description: description.trim() || undefined,
      endpointType,
      securityPolicy,
      ipAddressType,
    }
    const open = (apiId: string) => {
      void navigate(`${base}/${encodeURIComponent(apiId)}`)
    }

    if (usesDefinition) {
      importApi.mutate(
        {
          body,
          name: name.trim() || undefined,
          failOnWarnings,
          protocolType: "REST",
          ...settings,
        },
        {
          onSuccess: (imported) => {
            if (imported.warnings.length > 0) setResult(imported)
            else open(imported.api.apiId)
          },
        },
      )
      return
    }

    const clone = mode === "clone" ? source.data : undefined
    createApi.mutate(
      {
        name: name.trim(),
        protocolType: "REST",
        ...settings,
        ...(clone
          ? {
              version: clone.version || undefined,
              corsConfiguration: clone.corsConfiguration ?? undefined,
              routes: cloneRoutes().routes,
              stages: (sourceStages.data ?? []).map((stage) => ({
                stageName: stage.stageName,
                autoDeploy: stage.autoDeploy,
              })),
            }
          : {}),
      },
      {
        onSuccess: (api) => {
          open(api.apiId)
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Create REST API"
        icon={Layers}
        breadcrumbs={[
          { label: "API Gateway", to: base },
          { label: "Create API", to: `${base}/create` },
          { label: "REST API" },
        ]}
        renderLink={crumbLink}
      />

      {result ? (
        <ImportWarnings
          result={result}
          onOpen={() => {
            void navigate(`${base}/${encodeURIComponent(result.api.apiId)}`)
          }}
        />
      ) : null}
      {failure ? (
        <FormError
          title="The API was not created"
          message={errorMessage(failure, "Could not create the API.")}
        />
      ) : null}

      <Section title="API details">
        <ChoiceCards
          label="How to start"
          choices={MODES}
          value={mode}
          columns={2}
          onChange={(value) => {
            setMode(value)
            setAttempted(false)
            createApi.reset()
            importApi.reset()
          }}
        />

        {mode === "clone" ? (
          <Field
            label="Source API"
            hint="Copies routes, their integrations, stages, CORS and endpoint settings. Authorizers, models and per-route authorization are not copied."
            error={sourceFieldError}
            footnote={skippedNote(skippedIntegrations)}
          >
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger className="w-full max-w-xl" aria-label="Source API">
                <SelectValue placeholder={apis.isLoading ? "Loading APIs…" : "Choose an API"} />
              </SelectTrigger>
              <SelectContent>
                {/* A WebSocket API's lifecycle routes mean nothing on a REST API. */}
                {(apis.data ?? [])
                  .filter((api) => api.protocolType !== "WEBSOCKET")
                  .map((api) => (
                    <SelectItem key={api.apiId} value={api.apiId}>
                      {api.name || api.apiId}
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        {api.protocolType} · {api.apiId}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {mode === "import" ? (
          <OpenApiSource
            value={definition}
            onChange={setDefinition}
            error={attempted ? definitionError : undefined}
          />
        ) : null}

        {mode === "example" ? (
          <div className="border-border bg-muted/20 rounded-lg border px-4 py-3 text-[13px]">
            <p className="text-foreground font-medium">PetStore example</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Creates four routes — <code className="font-mono">GET /pets</code>,{" "}
              <code className="font-mono">POST /pets</code>,{" "}
              <code className="font-mono">GET /pets/&#123;petId&#125;</code> and{" "}
              <code className="font-mono">DELETE /pets/&#123;petId&#125;</code> — with no backend
              attached, so you can explore routes, stages and integrations safely.
            </p>
          </div>
        ) : null}

        <Field
          label="API name"
          optional={nameIsOptional}
          htmlFor="rest-name"
          hint={nameIsOptional ? "Leave blank to use the definition's title." : undefined}
          error={attempted ? nameError : undefined}
        >
          <Input
            id="rest-name"
            value={name}
            maxLength={128}
            placeholder={usesDefinition && parsed?.title ? parsed.title : "My REST API"}
            aria-invalid={attempted && Boolean(nameError)}
            onChange={(event) => {
              setName(event.target.value)
            }}
            className="max-w-xl"
          />
        </Field>

        <Field label="Description" optional htmlFor="rest-description">
          <Textarea
            id="rest-description"
            rows={3}
            maxLength={1024}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
            }}
            className="max-w-xl"
          />
        </Field>

        <Field
          label="API endpoint type"
          hint="Where the API is served from. Regional APIs are served in the region they are created in."
        >
          <ChoiceCards
            label="API endpoint type"
            choices={ENDPOINT_TYPES}
            value={endpointType}
            onChange={setEndpointType}
            columns={2}
          />
        </Field>

        <Field
          label="Security policy"
          htmlFor="rest-tls"
          hint="The minimum TLS version clients must use to call the API, and with it the cipher suites offered."
        >
          <Select
            value={securityPolicy}
            onValueChange={(value) => {
              setSecurityPolicy(value as SecurityPolicy)
            }}
          >
            <SelectTrigger id="rest-tls" className="w-full max-w-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TLS_1_2">TLS 1.2 (recommended)</SelectItem>
              <SelectItem value="TLS_1_0">TLS 1.0 — allows older clients</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="IP address type"
          hint="Which IP addresses can call the API's default endpoint."
        >
          <ChoiceCards
            label="IP address type"
            choices={IP_CHOICES}
            value={ipAddressType}
            onChange={setIpAddressType}
          />
        </Field>

        {usesDefinition ? (
          <div className="flex items-start gap-3">
            <Checkbox
              id="rest-strict"
              checked={failOnWarnings}
              onCheckedChange={(value) => {
                setFailOnWarnings(value === true)
              }}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="rest-strict" className="text-foreground text-[13px] font-semibold">
                Fail on warnings
              </Label>
              <p className="text-muted-foreground text-xs">
                Create nothing if any part of the definition cannot be mapped to a route.
              </p>
            </div>
          </div>
        ) : null}
      </Section>

      <WizardFooter
        onCancel={() => {
          void navigate(base)
        }}
        primaryLabel="Create API"
        primaryLoading={busy}
        primaryDisabled={Boolean(result) || (mode === "clone" && cloneLoading)}
        onPrimary={submit}
      />
    </div>
  )
}

function skippedNote(skipped: number): string | undefined {
  if (skipped === 0) return undefined
  const subject = skipped === 1 ? "route target has" : "route targets have"
  return `${String(skipped)} ${subject} no backend URI (such as a mock) and will be copied without an integration.`
}
