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
    // App integrations. Without these two the calls fell through to the bare
    // /api strip below and reached /v1/workflows/integration/..., which
    // is not a route — so every trigger panel 404'd while looking configured.
    //
    // Anchored on a following slash or end of string. A bare prefix match would
    // also rewrite /api/integration-providers, turning it into the nonexistent
    // /integrations-providers.
    .replace(/^\/api\/integration(?=\/|$)/, "/integrations")
    .replace(/^\/api\/accounts(?=\/|$)/, "/connected-accounts")
    .replace(/^\/api/, "")
  return mapped.length > 1 ? mapped.replace(/\/$/, "") : mapped
}

function wrap(data) {
  return { data: { success: true, data } }
}
