import { getTransport } from "../../runtime"

export const API = {
  defaults: { baseURL: "" },
  get: async (url, config) => {
    return wrap(
      await getTransport().request("GET", remap(url), {
        params: config?.params,
        responseType: config?.responseType,
      }),
    )
  },
  post: async (url, body) => wrap(await getTransport().request("POST", remap(url), { body })),
  put: async (url, body) => wrap(await getTransport().request("PUT", remap(url), { body })),
  delete: async (url) => wrap(await getTransport().request("DELETE", remap(url))),
}

export function publicApiUrl(path) {
  const transport = getTransport()
  return transport.publicUrl ? transport.publicUrl(remap(path)) : remap(path)
}

// INTEGRATIONS_API is the same helper pointed at the app-integration service.
//
// It exists because the two halves of this product are no longer one backend.
// Workflow documents and their executions are served by the control plane
// `request` reaches; the third-party connections — accounts, trigger bindings,
// the Meta products — moved to the platform API, which is a different origin
// with a different credential. Sending an integrations call down `request`
// reaches a control plane that no longer serves those routes, and every trigger
// panel 404s while looking configured.
//
// It falls back to `request` when the host implements no separate transport, so
// a deployment that serves both from one place needs to change nothing.
export const INTEGRATIONS_API = {
  get: async (url, config) =>
    wrap(
      await integrationsCall("GET", remapIntegrations(url), {
        params: config?.params,
        responseType: config?.responseType,
      }),
    ),
  post: async (url, body) => wrap(await integrationsCall("POST", remapIntegrations(url), { body })),
  put: async (url, body) => wrap(await integrationsCall("PUT", remapIntegrations(url), { body })),
  delete: async (url) => wrap(await integrationsCall("DELETE", remapIntegrations(url))),
}

function integrationsCall(method, path, options) {
  const transport = getTransport()
  return transport.integrationsRequest
    ? transport.integrationsRequest(method, path, options)
    : transport.request(method, path, options)
}

// remapIntegrations rewrites the paths the ported UI was written against onto
// the routes the integrations service serves, relative to its own root.
//
// The same translation-layer argument as remap() below: these panels are a
// large body of working UI, and mapping a handful of prefixes here is a far
// smaller change than rewriting every call site — twice, since the paths moved
// again when the module did.
//
// The order matters. `/api/integration-providers` must be matched BEFORE the
// bare `/api/integration` rule, or it is rewritten into a route that does not
// exist; and the Meta rules must precede the generic trigger rule, because they
// pull a segment out of the middle of the path rather than off the front.
function remapIntegrations(url) {
  const trimmed = url.replace(/\/$/, "") || url

  // Provider catalogue.
  const meta = trimmed.match(/^\/api\/integration-providers\/([^/]+)\/bootstrap$/)
  if (meta) return `/meta/products/${meta[1]}/bootstrap`
  const events = trimmed.match(/^\/api\/integration-providers\/([^/]+)\/events$/)
  if (events) return `/catalog/providers/${events[1]}/events`
  if (trimmed === "/api/integration-providers") return "/catalog/providers"

  // Meta acts on one integration, under its own module rather than under the
  // trigger's — the flow is a Meta dialog, not a trigger edit.
  const product = trimmed.match(/^\/api\/integration\/([^/]+)\/meta\/(.+)$/)
  if (product) return `/meta/${product[1]}/${product[2]}`

  return trimmed
    .replace(/^\/api\/integration(?=\/|$)/, "/triggers")
    .replace(/^\/api\/accounts(?=\/|$)/, "/accounts")
}

// openProviderPopup opens the window an OAuth consent screen will load into.
//
// It exists so callers can open the popup SYNCHRONOUSLY, inside the click
// handler, and point it at a URL they fetch afterwards. Consent URLs are now
// built server-side from the caller's own credential — the tenant can no longer
// be named in a query string — and a window.open that runs after an await is a
// popup every browser blocks.
export function openProviderPopup() {
  try {
    // globalThis rather than a bare window: this module is linted without
    // browser globals declared, and globalThis is defined everywhere.
    return globalThis.open("", "_blank", "width=600,height=700")
  } catch {
    return null
  }
}

// remap rewrites the paths this ported UI was written against onto the routes
// the FaaS control plane actually serves.
//
// It is a translation layer, not a shim to delete later: the legacy pages are a
// large body of working UI, and rewriting every call site would be a far bigger
// change than mapping the handful of prefixes they use. The transport supplies
// the `/v1/workflows` prefix, so everything here is relative to that.
function remap(url) {
  if (url.replace(/\/$/, "") === "/api/workflow/executions") return "/executions"
  const mapped = url
    .replace(/^\/api\/agent/, "/agents")
    .replace(/^\/api\/workflow-template/, "/workflow-templates")
    .replace(/^\/api\/workflow-credential/, "/workflow-credentials")
    .replace(/^\/api\/workflow/, "/workflows")
    // No app-integration rules here any more: that surface is a different
    // service now and is mapped by remapIntegrations above. A rule left behind
    // would silently send an integrations call to the workflow control plane,
    // which answers 404 for it — and a 404 on a trigger panel reads as a broken
    // integration rather than as a misrouted request.
    .replace(/^\/api/, "")
  return mapped.length > 1 ? mapped.replace(/\/$/, "") : mapped
}

function wrap(data) {
  return { data: { success: true, data } }
}
