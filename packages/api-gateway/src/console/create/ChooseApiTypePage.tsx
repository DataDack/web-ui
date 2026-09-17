import { ArrowLeftRight, Boxes, Globe, Network, Radio, type LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Badge, Button, PageHeader } from "@datadack/common-ui"

import { crumbLink, useGatewayBase } from "./parts"

interface ApiType {
  id: string
  title: string
  protocol: string
  icon: LucideIcon
  description: string
  worksWith: string[]
  build: string
  /** Absent where an import has nothing to read: a WebSocket API has no OpenAPI form. */
  importType?: "HTTP" | "REST"
}

const TYPES: ApiType[] = [
  {
    id: "http",
    title: "HTTP API",
    protocol: "HTTP",
    icon: Globe,
    description:
      "A lightweight API with routes, integrations and stages, plus built-in CORS and JWT authorizers. The right choice for most new APIs.",
    worksWith: ["Functions", "Load balancers", "HTTP backends"],
    build: "http",
    importType: "HTTP",
  },
  {
    id: "websocket",
    title: "WebSocket API",
    protocol: "WEBSOCKET",
    icon: ArrowLeftRight,
    description:
      "Persistent two-way connections for real-time use cases such as chat, notifications or live dashboards. Messages are routed by a selection expression.",
    worksWith: ["Functions", "HTTP backends"],
    build: "websocket",
  },
  {
    id: "rest",
    title: "REST API",
    protocol: "REST",
    icon: Boxes,
    description:
      "Choose the endpoint type and TLS policy yourself, and meter callers with API keys and usage plans.",
    worksWith: ["Functions", "Load balancers", "HTTP backends"],
    build: "rest",
    importType: "REST",
  },
]

/**
 * The first screen of "Create API": which kind of API.
 *
 * Mirrors the AWS console's type chooser, card for card, because the choice
 * genuinely forks the flow that follows — an HTTP API is built route by route,
 * a WebSocket API from lifecycle routes and a selection expression, a REST API
 * on a single page — and an operator should see all three before committing.
 */
export function ChooseApiTypePage() {
  const navigate = useNavigate()
  const base = useGatewayBase()

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Choose an API type"
        icon={Network}
        breadcrumbs={[{ label: "API Gateway", to: base }, { label: "Create API" }]}
        renderLink={crumbLink}
        description="Pick the kind of API to create. You can import an existing OpenAPI definition for HTTP and REST APIs."
      />

      <div className="flex flex-col gap-4">
        {TYPES.map((type) => {
          const Icon = type.icon
          return (
            <article
              key={type.id}
              aria-labelledby={`api-type-${type.id}`}
              className="border-border bg-card/40 hover:border-foreground/25 rounded-xl border p-5 transition-colors sm:p-6"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="border-border bg-muted/40 flex size-10 shrink-0 items-center justify-center rounded-lg border">
                    <Icon className="text-brand-gold size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id={`api-type-${type.id}`}
                        className="text-foreground text-lg font-semibold"
                      >
                        {type.title}
                      </h2>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {type.protocol}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-6">
                      {type.description}
                    </p>
                    <p className="text-foreground mt-3 text-[13px] font-semibold">
                      Works with the following:
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {type.worksWith.map((target) => (
                        <li key={target}>
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {target}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 sm:justify-end">
                  {type.importType ? (
                    <Button
                      variant="outline"
                      aria-label={`Import ${type.title}`}
                      onClick={() => {
                        void navigate(`${base}/create/import?type=${type.importType ?? "HTTP"}`)
                      }}
                    >
                      Import
                    </Button>
                  ) : null}
                  <Button
                    variant="gold"
                    aria-label={`Build ${type.title}`}
                    onClick={() => {
                      void navigate(`${base}/create/${type.build}`)
                    }}
                  >
                    Build
                  </Button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p className="text-muted-foreground mt-5 flex items-center gap-1.5 text-xs">
        <Radio className="size-3.5" />
        Prefer the CLI? <code className="font-mono">aws apigatewayv2 create-api</code> works against
        this control plane too.
      </p>
    </div>
  )
}
