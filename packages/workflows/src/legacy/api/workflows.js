import { API } from "../helpers"

const unwrap = (res) => {
  if (!res.data.success) throw new Error(res.data.message || "Request failed")
  return res.data.data
}

export const workflowsApi = {
  list: ({ page = 1, pageSize = 20, keyword = "" } = {}) =>
    API.get("/api/workflow/", { params: { p: page, page_size: pageSize, keyword } }).then(unwrap),

  get: (id) => API.get(`/api/workflow/${id}`).then(unwrap),

  create: (data) => API.post("/api/workflow/", data).then(unwrap),

  update: (id, data) =>
    API.put(`/api/workflow/${id}`, data).then((res) => {
      if (!res.data.success) throw new Error(res.data.message || "Request failed")
      return { ...res.data.data, lambda_updating: res.data.lambda_updating }
    }),

  delete: (id) => API.delete(`/api/workflow/${id}`).then(unwrap),

  exportN8n: (id) => API.get(`/api/workflow/${id}/export-n8n`).then(unwrap),

  deploy: (id, data = {}) => API.post(`/api/workflow/${id}/deploy`, data).then(unwrap),

  undeploy: (id) => API.post(`/api/workflow/${id}/undeploy`).then(unwrap),

  deployStatus: (id) => API.get(`/api/workflow/${id}/deploy-status`).then(unwrap),

  invoke: (id, payload = {}, { useLatest = false } = {}) =>
    API.post(`/api/workflow/${id}/invoke`, { payload, use_latest: useLatest }).then(unwrap),

  redeploy: (id) => API.post(`/api/workflow/${id}/redeploy`).then(unwrap),

  listAllExecutions: ({ startDate, endDate, startAfter } = {}) =>
    API.get("/api/workflow/executions", {
      params: { start_date: startDate, end_date: endDate, start_after: startAfter },
    }).then((res) => {
      if (!res.data.success) throw new Error(res.data.message || "Request failed")
      return { items: res.data.data || [], next_cursor: res.data.next_cursor || "" }
    }),

  listExecutions: (id, { date, startAfter } = {}) =>
    API.get(`/api/workflow/${id}/executions`, { params: { date, start_after: startAfter } }).then(
      unwrap,
    ),

  getExecution: (id, execId, { date } = {}) =>
    API.get(`/api/workflow/${id}/executions/${execId}`, { params: { date } }).then(unwrap),

  listVersions: (id) => API.get(`/api/workflow/${id}/versions`).then(unwrap),

  setDefaultVersion: (id, version) =>
    API.post(`/api/workflow/${id}/set-default-version`, { version }).then(unwrap),
}

export const templatesApi = {
  list: ({ page = 1, pageSize = 24, keyword = "", category = "" } = {}) =>
    API.get("/api/workflow-template/", {
      params: { p: page, page_size: pageSize, keyword, category },
    }).then(unwrap),

  get: (slug) => API.get(`/api/workflow-template/${slug}`).then(unwrap),

  use: (slug) => API.post(`/api/workflow-template/${slug}/use`).then(unwrap),

  delete: (slug) => API.delete(`/api/workflow-template/${slug}`).then(unwrap),

  // Addressed as an action ON the workflow, not as a template collection route:
  // the control plane serves POST /workflows/{id}/promote-to-template. This is
  // the one call in this file whose legacy path had no equivalent left, so it is
  // written against the workflow prefix rather than the template one.
  promote: (workflowId, data) =>
    API.post(`/api/workflow/${workflowId}/promote-to-template`, data).then(unwrap),

  download: (slug) =>
    API.get(`/api/workflow-template/${slug}/download`, { responseType: "blob" }).then(
      (res) => res.data,
    ),
}
