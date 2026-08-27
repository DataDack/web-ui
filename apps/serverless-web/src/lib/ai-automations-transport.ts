import type { AIAutomationsTransport } from "@datadack/ai-and-automations"
import { http } from "./api"
export const aiAutomationsTransport: AIAutomationsTransport = {
  capabilities: { connectedAccounts: false, integrations: false, realtimeEvents: false },
  brandIconUrl: "/admin/datadack-icon.png",
  publicUrl(path) {
    return `/v1/ai-and-automations${path}`
  },
  async request(method, path, options) {
    const response = await http.request({
      method,
      url: `/v1/ai-and-automations${path}`,
      data: options?.body,
      params: options?.params,
      responseType: options?.responseType as "json" | "blob" | undefined,
    })
    return response.data?.data ?? response.data
  },
}
