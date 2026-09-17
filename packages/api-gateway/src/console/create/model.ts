/**
 * The create flow's drafts and the rules they are checked against.
 *
 * The rules MIRROR the control plane's (types/apigateway_types.go) rather
 * than inventing stricter ones. The server re-checks everything; these exist so
 * a mistake is pointed at on the field that made it, not reported after the
 * whole wizard was submitted as one message about "route 3".
 */

import type { WizardRouteInput, WizardStageInput } from "../../data/transport"

export const HTTP_METHODS = ["ANY", "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

export const DEFAULT_ROUTE_KEY = "$default"
export const DEFAULT_STAGE = "$default"

/** Same pattern as routePathRe: literals, {var} and {greedy+} segments. */
const ROUTE_PATH = /^\/([A-Za-z0-9._~-]|\{[A-Za-z0-9._-]+\+?\}|\/)*$/
const STAGE_NAME = /^[A-Za-z0-9_-]{1,128}$/

/** What a backend is, as the operator thinks of it. */
export type BackendKind = "HTTP" | "FUNCTION"

export interface IntegrationDraft {
  /** Local only — the rows need a stable React key before anything exists. */
  key: string
  kind: BackendKind
  uri: string
}

export interface RouteDraft {
  key: string
  method: string
  /** A path, or "$default" (and on a WebSocket API, $connect / $disconnect). */
  path: string
  /** An IntegrationDraft key, or "" for no backend. */
  integration: string
}

export interface StageDraft {
  key: string
  name: string
  autoDeploy: boolean
}

let seq = 0
export const draftKey = () => `d${String(++seq)}`

export const integrationTypeFor = (kind: BackendKind) =>
  kind === "FUNCTION" ? "AWS_PROXY" : "HTTP_PROXY"

export function nameError(name: string): string | undefined {
  const trimmed = name.trim()
  if (trimmed === "") return "Enter a name."
  if (trimmed.length < 2) return "Use at least 2 characters."
  if (trimmed.length > 128) return "Use 128 characters or fewer."
  return undefined
}

/** Mirrors ValidIntegrationURI, including stage-variable templates. */
export function uriError(kind: BackendKind, uri: string): string | undefined {
  const trimmed = uri.trim()
  if (trimmed === "") return kind === "FUNCTION" ? "Enter a function name." : "Enter a URL."
  if (kind === "FUNCTION") return undefined
  const shape = trimmed.replace(/\$\{[^}]*\}/g, "placeholder")
  try {
    const url = new URL(shape)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "The URL must start with http:// or https://."
    }
    if (!url.host) return "The URL needs a host."
  } catch {
    return "Enter an absolute URL, such as https://backend.example.com."
  }
  return undefined
}

export function routeKeyOf(route: Pick<RouteDraft, "method" | "path">): string {
  const path = route.path.trim()
  return path.startsWith("$") ? path : `${route.method} ${path}`
}

export function routePathError(path: string): string | undefined {
  const trimmed = path.trim()
  if (trimmed === "") return "Enter a path."
  if (trimmed === DEFAULT_ROUTE_KEY) return undefined
  if (!trimmed.startsWith("/")) return 'Start the path with "/", or use $default.'
  if (!ROUTE_PATH.test(trimmed)) {
    return "Use letters, numbers, . _ ~ - and {variables}, such as /orders/{id}."
  }
  return undefined
}

export function stageNameError(name: string): string | undefined {
  const trimmed = name.trim()
  if (trimmed === "") return "Enter a stage name."
  if (trimmed === DEFAULT_STAGE || STAGE_NAME.test(trimmed)) return undefined
  return "Use letters, numbers, - and _ only, or $default."
}

/** Keys that appear more than once, so every copy can be flagged. */
export function duplicates(values: string[]): Set<string> {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return repeated
}

/** Folds routes and the integrations they point at into the create call's shape. */
export function wizardRoutes(
  routes: RouteDraft[],
  integrations: IntegrationDraft[],
): WizardRouteInput[] {
  return routes.map((route) => {
    const backend = integrations.find((it) => it.key === route.integration)
    const target = backend
      ? { target: backend.uri.trim(), integrationType: integrationTypeFor(backend.kind) }
      : {}
    const path = route.path.trim()
    return path.startsWith("$")
      ? { routeKey: path, ...target }
      : { method: route.method, path, ...target }
  })
}

export function wizardStages(stages: StageDraft[]): WizardStageInput[] {
  return stages.map((stage) => ({ stageName: stage.name.trim(), autoDeploy: stage.autoDeploy }))
}

/** A short, recognisable label for an integration in a picker. */
export function integrationLabel(integration: IntegrationDraft, index: number): string {
  const uri = integration.uri.trim()
  const kind = integration.kind === "FUNCTION" ? "Function" : "HTTP"
  return uri === "" ? `${kind} integration ${String(index + 1)}` : `${kind} · ${uri}`
}
