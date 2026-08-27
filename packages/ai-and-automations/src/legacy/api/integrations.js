import { API } from '../helpers';

const unwrap = (res) => {
  if (!res.data.success) throw new Error(res.data.message || 'Request failed');
  return res.data.data;
};

export const integrationsApi = {
  list: ({ page = 1, pageSize = 20 } = {}) =>
    API.get('/api/integration/', { params: { p: page, page_size: pageSize } }).then(unwrap),

  get: (id) => API.get(`/api/integration/${id}`).then(unwrap),

  create: (data) => API.post('/api/integration/', data).then(unwrap),

  update: (id, data) => API.put(`/api/integration/${id}`, data).then(unwrap),

  delete: (id) => API.delete(`/api/integration/${id}`).then(unwrap),

  activate: (id, active) => API.post(`/api/integration/${id}/activate`, { active }).then(unwrap),

  byWorkflow: (workflowId, platform) =>
    API.get('/api/integration/by-workflow', { params: { workflow_id: workflowId, platform } }).then(unwrap),

  events: (id) => API.get(`/api/integration/${id}/events`).then(unwrap),

  // GitHub-specific
  githubConnectUrl: (integrationId) => {
    const base = API.defaults.baseURL || '';
    return `${base}/api/integration/github/connect?integration_id=${integrationId}`;
  },

  githubRepos: (integrationId) =>
    API.get('/api/integration/github/repos', { params: { integration_id: integrationId } }).then(unwrap),

  githubEvents: () =>
    API.get('/api/integration/github/events').then(unwrap),

  githubSetup: (data) =>
    API.post('/api/integration/github/setup', data).then(unwrap),

  githubManageUrl: () => {
    const base = API.defaults.baseURL || '';
    return `${base}/api/integration/github/manage`;
  },

  // Google OAuth — shared by Drive / Sheets / Gmail / Calendar triggers.
  // `trigger` must be one of: google_drive | google_sheets | google_gmail | google_calendar
  googleConnectUrl: (integrationId, trigger) => {
    const base = API.defaults.baseURL || '';
    return `${base}/api/integration/google/connect?integration_id=${integrationId}&trigger=${trigger}`;
  },

  // Jira OAuth + setup
  jiraConnectUrl: (integrationId) => {
    const base = API.defaults.baseURL || '';
    return `${base}/api/integration/jira/connect?integration_id=${integrationId}`;
  },
  jiraSites: (integrationId) =>
    API.get('/api/integration/jira/sites', { params: { integration_id: integrationId } }).then(unwrap),
  jiraProjects: (integrationId) =>
    API.get('/api/integration/jira/projects', { params: { integration_id: integrationId } }).then(unwrap),
  jiraEvents: () =>
    API.get('/api/integration/jira/events').then(unwrap),
  jiraSetup: (data) =>
    API.post('/api/integration/jira/setup', data).then(unwrap),

  // Microsoft OAuth — shared by Outlook / OneDrive / Calendar / Excel triggers.
  // `trigger` must be one of: microsoft_outlook | microsoft_onedrive | microsoft_calendar | microsoft_excel
  microsoftConnectUrl: (integrationId, trigger) => {
    const base = API.defaults.baseURL || '';
    return `${base}/api/integration/microsoft/connect?integration_id=${integrationId}&trigger=${trigger}`;
  },

  // WhatsApp (Meta Cloud API) — Embedded Signup + manual setup
  whatsappBootstrap: () =>
    API.get('/api/integration/whatsapp/bootstrap').then(unwrap),
  whatsappEmbeddedSignup: (integrationId, payload) =>
    API.post(`/api/integration/whatsapp/${integrationId}/embedded-signup`, payload).then(unwrap),
  whatsappManualSetup: (integrationId, payload) =>
    API.post(`/api/integration/whatsapp/${integrationId}/setup`, payload).then(unwrap),
  whatsappRegisterPhone: (integrationId, pin) =>
    API.post(`/api/integration/whatsapp/${integrationId}/register-phone`, { pin }).then(unwrap),
  whatsappPhoneNumbers: (integrationId) =>
    API.get(`/api/integration/whatsapp/${integrationId}/phone-numbers`).then(unwrap),
  whatsappTemplates: (integrationId) =>
    API.get(`/api/integration/whatsapp/${integrationId}/templates`).then(unwrap),
  whatsappSendTest: (integrationId, payload) =>
    API.post(`/api/integration/whatsapp/${integrationId}/send-test`, payload).then(unwrap),

  // Instagram (FB Login with Instagram scopes)
  instagramBootstrap: () =>
    API.get('/api/integration/instagram/bootstrap').then(unwrap),
  instagramListAccounts: (payload) =>
    API.post('/api/integration/instagram/list-accounts', payload).then(unwrap),
  instagramOAuthFinish: (integrationId, payload) =>
    API.post(`/api/integration/instagram/${integrationId}/oauth-finish`, payload).then(unwrap),
  instagramManualSetup: (integrationId, payload) =>
    API.post(`/api/integration/instagram/${integrationId}/setup`, payload).then(unwrap),
  instagramSendTest: (integrationId, payload) =>
    API.post(`/api/integration/instagram/${integrationId}/send-test`, payload).then(unwrap),

  // Threads (threads.net OAuth)
  threadsBootstrap: (integrationId) =>
    API.get('/api/integration/threads/bootstrap', { params: { integration_id: integrationId } }).then(unwrap),
  threadsOAuthFinish: (integrationId, payload) =>
    API.post(`/api/integration/threads/${integrationId}/oauth-finish`, payload).then(unwrap),
  threadsManualSetup: (integrationId, payload) =>
    API.post(`/api/integration/threads/${integrationId}/setup`, payload).then(unwrap),
  threadsSendTest: (integrationId, payload) =>
    API.post(`/api/integration/threads/${integrationId}/send-test`, payload).then(unwrap),
};
