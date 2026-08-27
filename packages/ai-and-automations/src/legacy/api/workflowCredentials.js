import { API } from '../helpers';

const unwrap = (res) => {
  if (!res.data.success) throw new Error(res.data.message || 'Request failed');
  return res.data.data;
};

export const credentialsApi = {
  list: (type) =>
    API.get('/api/workflow-credential/', { params: type ? { type } : {} }).then(unwrap),

  get: (id) => API.get(`/api/workflow-credential/${id}`).then(unwrap),

  create: (data) => API.post('/api/workflow-credential/', data).then(unwrap),

  update: (id, data) => API.put(`/api/workflow-credential/${id}`, data).then(unwrap),

  delete: (id) => API.delete(`/api/workflow-credential/${id}`).then(unwrap),

  // Picker endpoints: we handle errors inline in the field (graceful fallback
  // options, disabled state) so we opt out of the global toast interceptor.
  // Otherwise each missing/invalid credential stacks a red toast per dropdown.
  listModels: (id) =>
    API.get(`/api/workflow-credential/${id}/models`, { skipErrorHandler: true }).then(unwrap),

  // Generic picker loader — used by DynamicSelectField when `param.resource`
  // names a provider-specific resource (e.g. 'jiraProjects', 'jiraIssueTypes').
  // `params` is merged into the query string so resource-specific filters
  // (projectKey, query, …) flow through to the backend dispatcher.
  listResources: (id, resource, params = {}) =>
    API.get(`/api/workflow-credential/${id}/resources/${resource}`, {
      params,
      skipErrorHandler: true,
    }).then(unwrap),
};
