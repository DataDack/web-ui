import type { AIAutomationsTransport } from "@datadack/workflows"

import { http } from "./api"
export const aiAutomationsTransport: AIAutomationsTransport = {
  // App integrations are NOT served here.
  //
  // They moved to the platform backend (cloud-be-go's apps/integrations) with
  // the accounts, the credential store and the public provider callbacks, and
  // this control plane no longer has the routes. Turning the capability off is
  // the whole point of it existing: left on, the trigger palette renders app
  // nodes that configure cleanly, save, and never fire — which is far worse
  // than not offering them. The cloud console keeps them, through its own
  // integrationsRequest transport.
  //
  // Realtime execution events still have no socket here either.
  capabilities: { connectedAccounts: false, integrations: false, realtimeEvents: false },
  brandIconUrl: "/admin_serverless/datadack-icon.png",
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
