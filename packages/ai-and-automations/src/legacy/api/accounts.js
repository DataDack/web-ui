import { API } from '../helpers/api';

// The backend returns errors as HTTP 200 with { success: false, message: ... }.
// Throw so React Query flips to the error state and the real message surfaces
// in the UI (rather than silently returning the error payload as if it were
// data, which caused dropdowns to render "No items found" for real failures).
const unwrap = (res) => {
  const body = res?.data;
  if (body && body.success === false) {
    throw new Error(body.message || 'Request failed');
  }
  return body?.data ?? body;
};

export const accountsApi = {
  // List all connected accounts for the authenticated user
  list: (provider) => {
    const params = provider ? { provider } : {};
    return API.get('/api/accounts/', { params }).then(unwrap);
  },

  // Get OAuth connect URL for a provider (opens in popup)
  connectUrl: (provider, userId) => {
    const base = API.defaults.baseURL || '';
    return `${base}/api/accounts/oauth/${provider}/connect?user_id=${userId}`;
  },

  // Disconnect an account
  disconnect: (id) => API.delete(`/api/accounts/${id}`).then(unwrap),

  // ── GitHub resources ──
  githubOrgs: (accountId) =>
    API.get(`/api/accounts/${accountId}/github/orgs`).then(unwrap),
  githubRepos: (accountId, owner, isOrg) =>
    API.get(`/api/accounts/${accountId}/github/repos`, { params: { owner, is_org: isOrg ? 'true' : 'false' } }).then(unwrap),

  // ── Google resources ──
  googleDriveFolders: (accountId, parent) =>
    API.get(`/api/accounts/${accountId}/google/drive/folders`, { params: parent ? { parent } : {} }).then(unwrap),
  googleSpreadsheets: (accountId) =>
    API.get(`/api/accounts/${accountId}/google/sheets/spreadsheets`).then(unwrap),
  googleSpreadsheetTabs: (accountId, spreadsheetId) =>
    API.get(`/api/accounts/${accountId}/google/sheets/${spreadsheetId}/tabs`).then(unwrap),
  googleGmailLabels: (accountId) =>
    API.get(`/api/accounts/${accountId}/google/gmail/labels`).then(unwrap),
  googleCalendars: (accountId) =>
    API.get(`/api/accounts/${accountId}/google/calendar/calendars`).then(unwrap),

  // ── Microsoft resources ──
  microsoftOutlookFolders: (accountId) =>
    API.get(`/api/accounts/${accountId}/microsoft/outlook/folders`).then(unwrap),
  microsoftOneDriveFolders: (accountId, parent) =>
    API.get(`/api/accounts/${accountId}/microsoft/onedrive/folders`, { params: parent ? { parent } : {} }).then(unwrap),
  microsoftCalendars: (accountId) =>
    API.get(`/api/accounts/${accountId}/microsoft/calendar/calendars`).then(unwrap),
  microsoftExcelFiles: (accountId) =>
    API.get(`/api/accounts/${accountId}/microsoft/excel/files`).then(unwrap),
  microsoftExcelWorksheets: (accountId, driveItemId) =>
    API.get(`/api/accounts/${accountId}/microsoft/excel/files/${driveItemId}/worksheets`).then(unwrap),

  // ── Jira resources ──
  jiraSites: (accountId) =>
    API.get(`/api/accounts/${accountId}/jira/sites`).then(unwrap),
  jiraProjects: (accountId, cloudId) =>
    API.get(`/api/accounts/${accountId}/jira/projects`, { params: cloudId ? { cloud_id: cloudId } : {} }).then(unwrap),
};
