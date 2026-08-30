import { INTEGRATIONS_API as API, openProviderPopup } from '../helpers/api';
import { accountsApi } from './accounts';

// The control plane answers `{ data: ... }` and the transport unwraps it before
// this sees it. Failures arrive as thrown errors rather than as a `success:
// false` body, which is why nothing here inspects one any more.
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

// Which OAuth provider backs a given trigger. GitHub and Jira map one-to-one;
// the four Google triggers and the four Microsoft ones each share a single
// connected account, which is why connecting once covers all of them.
const providerForTrigger = (trigger) => {
  if (!trigger) return null;
  if (trigger === 'github' || trigger === 'jira') return trigger;
  if (trigger.startsWith('google_')) return 'google';
  if (trigger.startsWith('microsoft_')) return 'microsoft';
  return null;
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

  eventPayload: (id, eventId) => API.get(`/api/integration/${id}/events/${eventId}`).then(unwrap),

  // What a tenant has to paste into Slack's or Discord's own console, and the
  // signing secret for the ones that need it. A route of its own rather than a
  // field on the integration, so the secret is fetched deliberately instead of
  // riding along on every list response.
  setup: (id) => API.get(`/api/integration/${id}/setup`).then(unwrap),

  // Which providers this deployment can actually complete a connection for. The
  // console disables what it cannot honour rather than opening a popup that
  // dead-ends on a provider's error page.
  //
  // Answers `{ oauth, meta, platforms }`: oauth keyed by provider, meta keyed by
  // PRODUCT (Threads can be its own Meta app and be available when WhatsApp is
  // not), platforms the trigger sources this build can wire.
  providers: () => API.get('/api/integration-providers').then(unwrap),

  // The whole third-party surface in one answer: every platform this build
  // knows, with how it connects and whether this deployment can.
  //
  // Distinct from providers() above, which is four booleans for the connect
  // dialog. This is what the Integrations page renders — it is the only call
  // that knows Slack and Telegram exist at all, because neither has a
  // platform-level application and so neither appears in the oauth map.
  //
  // Each item: { key, label, category, mechanism, provider, trigger, available,
  // reason, events }. `mechanism` is what the UI switches on — oauth,
  // meta, self_service, bot_token, github_app — so a new platform of an
  // existing kind needs no change here.
  catalog: () => API.get('/api/integration-catalog').then(unwrap),

  // ── OAuth ────────────────────────────────────────────────────────────────
  //
  // One entry point for every provider. The consent URL is built server-side
  // from the caller's own credential, so there is no per-provider URL for the
  // client to assemble and no user id for it to pass — which is what stopped
  // one tenant being able to attach an account to another.
  connect: (trigger) => {
    const provider = providerForTrigger(trigger);
    if (!provider) {
      return Promise.reject(new Error(`${trigger} does not connect through an account`));
    }
    return accountsApi.connect(provider);
  },

  // GitHub's own page for editing which repositories its app may reach. An
  // external destination, opened directly.
  githubManageUrl: () => 'https://github.com/settings/installations',

  githubRepos: (accountId, owner, isOrg) => accountsApi.githubRepos(accountId, owner, isOrg),
  githubOrgs: (accountId) => accountsApi.githubOrgs(accountId),
  githubEvents: () => API.get('/api/integration-providers/github/events').then(unwrap),

  jiraSites: (accountId) => accountsApi.jiraSites(accountId),
  jiraProjects: (accountId, cloudId) => accountsApi.jiraProjects(accountId, cloudId),
  jiraEvents: () => API.get('/api/integration-providers/jira/events').then(unwrap),

  // ── Meta products ────────────────────────────────────────────────────────
  //
  // WhatsApp, Instagram and Threads share one shape now: bootstrap describes
  // what the console may offer, setup finishes the connection with either an
  // authorization code or a pasted token, and the rest act on the integration.
  // The old surface had three near-identical sets of endpoints per product.
  metaBootstrap: (product) => API.get(`/api/integration-providers/${product}/bootstrap`).then(unwrap),
  metaSetup: (integrationId, payload) =>
    API.post(`/api/integration/${integrationId}/meta/setup`, payload).then(unwrap),
  // Spend an authorization code and list what it grants access to, for the
  // Instagram flow where a business account has to be picked before setup can
  // finish. The token stays server-side; only the list comes back.
  metaAccounts: (integrationId, code) =>
    API.post(`/api/integration/${integrationId}/meta/accounts`, { code }).then(unwrap),
  metaPhoneNumbers: (integrationId) =>
    API.get(`/api/integration/${integrationId}/meta/phone-numbers`).then(unwrap),
  metaTemplates: (integrationId) =>
    API.get(`/api/integration/${integrationId}/meta/templates`).then(unwrap),
  metaRegisterPhone: (integrationId, pin) =>
    API.post(`/api/integration/${integrationId}/meta/register-phone`, { pin }).then(unwrap),
  metaSendTest: (integrationId, payload) =>
    API.post(`/api/integration/${integrationId}/meta/send-test`, payload).then(unwrap),

  // Open a Threads consent screen. Threads is a plain redirect rather than a JS
  // SDK dialog, so the console opens the URL bootstrap hands back — through the
  // same synchronous-open-then-navigate dance every other popup uses.
  threadsConnect: async () => {
    const popup = openProviderPopup();
    try {
      const bootstrap = await integrationsApi.metaBootstrap('threads');
      if (!bootstrap?.consent_url) {
        throw new Error(bootstrap?.reason || 'Threads is not configured on this platform');
      }
      if (popup) popup.location = bootstrap.consent_url;
      else globalThis.open(bootstrap.consent_url, '_blank', 'width=600,height=700');
      return bootstrap;
    } catch (error) {
      if (popup) popup.close();
      throw error;
    }
  },

  // ── Names the ported panels still call ───────────────────────────────────
  //
  // Kept as thin aliases rather than renamed at every call site: the panels are
  // a large body of working UI and this is the whole of what changed for them.
  whatsappBootstrap: () => integrationsApi.metaBootstrap('whatsapp'),
  whatsappEmbeddedSignup: (integrationId, payload) => integrationsApi.metaSetup(integrationId, payload),
  whatsappManualSetup: (integrationId, payload) => integrationsApi.metaSetup(integrationId, payload),
  whatsappRegisterPhone: (integrationId, pin) => integrationsApi.metaRegisterPhone(integrationId, pin),
  whatsappPhoneNumbers: (integrationId) => integrationsApi.metaPhoneNumbers(integrationId),
  whatsappTemplates: (integrationId) => integrationsApi.metaTemplates(integrationId),
  whatsappSendTest: (integrationId, payload) => integrationsApi.metaSendTest(integrationId, payload),

  instagramBootstrap: () => integrationsApi.metaBootstrap('instagram'),
  instagramListAccounts: (integrationId, payload) =>
    integrationsApi.metaAccounts(integrationId, payload?.code),
  instagramOAuthFinish: (integrationId, payload) => integrationsApi.metaSetup(integrationId, payload),
  instagramManualSetup: (integrationId, payload) => integrationsApi.metaSetup(integrationId, payload),
  instagramSendTest: (integrationId, payload) => integrationsApi.metaSendTest(integrationId, payload),

  threadsBootstrap: () => integrationsApi.metaBootstrap('threads'),
  threadsOAuthFinish: (integrationId, payload) => integrationsApi.metaSetup(integrationId, payload),
  threadsManualSetup: (integrationId, payload) => integrationsApi.metaSetup(integrationId, payload),
  threadsSendTest: (integrationId, payload) => integrationsApi.metaSendTest(integrationId, payload),
};
