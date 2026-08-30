import { API, openProviderPopup } from '../helpers/api';

// The control plane answers `{ data: ... }` and the transport unwraps it, so a
// successful response arrives here already unwrapped. Failures arrive as thrown
// errors from the transport rather than as a `success: false` body, which is why
// this no longer inspects one — the old backend reported errors as HTTP 200 with
// a flag, and a caller that only checked the flag rendered "No items found" for
// real failures.
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

export const accountsApi = {
  // List the third-party accounts this tenant has connected.
  list: (provider) => {
    const params = provider ? { provider } : {};
    return API.get('/api/accounts/', { params }).then(unwrap);
  },

  // Open the provider's consent screen.
  //
  // Two steps rather than one, because the URL is now built server-side from the
  // caller's own credential. The popup is opened FIRST, synchronously, and
  // pointed at the URL once it arrives: a window.open that happens after an
  // await is a popup blocked by every browser.
  connect: async (provider) => {
    const popup = openProviderPopup();
    try {
      const { url } = await API.get(`/api/accounts/authorize/${provider}`).then(unwrap);
      if (!url) throw new Error('the platform returned no consent URL');
      if (popup) popup.location = url;
      else globalThis.open(url, '_blank', 'width=600,height=700');
      return url;
    } catch (error) {
      if (popup) popup.close();
      throw error;
    }
  },

  // Disconnect an account.
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
