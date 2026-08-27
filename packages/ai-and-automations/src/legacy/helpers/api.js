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

function remap(url) {
  if (url.replace(/\/$/, "") === "/api/workflow/executions") return "/executions"
  const mapped = url
    .replace(/^\/api\/agent/, "/agents")
    .replace(/^\/api\/workflow-template/, "/workflow-templates")
    .replace(/^\/api\/workflow-credential/, "/workflow-credentials")
    .replace(/^\/api\/workflow/, "/workflows")
    .replace(/^\/api/, "")
  return mapped.length > 1 ? mapped.replace(/\/$/, "") : mapped
}
function wrap(data) {
  return { data: { success: true, data } }
}
