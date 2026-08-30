import type { AIAutomationsTransport } from "@datadack/workflows"

import { http } from "./api"
export const aiAutomationsTransport: AIAutomationsTransport = {
  // App integrations are served by this control plane now: the tenant routes
  // under /v1/workflows/{integrations,connected-accounts} and the
  // public provider callbacks under /v1/integrations. Realtime execution events
  // still have no socket here, so that one stays off.
  capabilities: { connectedAccounts: true, integrations: true, realtimeEvents: false },
  brandIconUrl: "/admin/datadack-icon.png",
  publicUrl(path) {
    return `/v1/workflows${path}`
  },
  async request(method, path, options) {
    const response = await http.request({
      method,
      url: `/v1/workflows${path}`,
      data: options?.body,
      params: options?.params,
      responseType: options?.responseType as "json" | "blob" | undefined,
    })
    // The control plane answers `{ "data": ... }`. Unwrap by key, not by
    // nullishness: `?? response.data` hands the whole envelope back whenever
    // `data` is legitimately null, and callers that expect a list then get an
    // object and crash on `.filter`/`.map`.
    const body = response.data
    if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
      return (body as { data: unknown }).data
    }
    return body
  },
}
