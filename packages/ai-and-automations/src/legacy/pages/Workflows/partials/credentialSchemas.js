/*
  Credential Schemas — Structured field definitions for every credential type
  in the n8n node registry. Each schema maps a credential type string to its
  human-readable label and form fields so we can render proper inputs instead
  of a raw JSON textarea.

  The backend stores credentials as encrypted JSON in the `data` field.
  The frontend serialises these structured form values to JSON before sending.
*/

export const CREDENTIAL_SCHEMAS = {
  // ── HTTP / Generic Auth ────────────────────────────────────────────────────

  httpBasicAuth: {
    label: 'HTTP Basic Auth',
    fields: [
      { key: 'user', label: 'Username', type: 'string', required: true, placeholder: 'username' },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },

  httpHeaderAuth: {
    label: 'HTTP Header Auth',
    fields: [
      { key: 'name', label: 'Header Name', type: 'string', required: true, placeholder: 'Authorization' },
      { key: 'value', label: 'Header Value', type: 'password', required: true, placeholder: 'Bearer sk-...' },
    ],
  },

  // ── AI / LLM ───────────────────────────────────────────────────────────────

  openAiApi: {
    label: 'OpenAI API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
      { key: 'organizationId', label: 'Organization ID', type: 'string', placeholder: 'org-...' },
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.openai.com/v1' },
    ],
  },

  anthropicApi: {
    label: 'Anthropic API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-...' },
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.anthropic.com' },
    ],
  },

  vertexAiApi: {
    label: 'Google Vertex AI',
    fields: [
      { key: 'serviceAccountJson', label: 'Service Account JSON', type: 'textarea', required: true, placeholder: '{ "type": "service_account", ... }' },
      { key: 'projectId', label: 'Project ID', type: 'string', required: true, placeholder: 'my-gcp-project' },
      { key: 'region', label: 'Region', type: 'string', required: true, placeholder: 'us-central1', default: 'us-central1' },
    ],
  },

  bedrockApi: {
    label: 'Amazon Bedrock',
    fields: [
      { key: 'accessKeyId', label: 'AWS Access Key ID', type: 'password', required: true, placeholder: 'AKIA...' },
      { key: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'string', required: true, placeholder: 'us-east-1', default: 'us-east-1' },
    ],
  },

  azureOpenAiApi: {
    label: 'Azure OpenAI',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'resourceName', label: 'Resource Name', type: 'string', required: true, placeholder: 'my-resource' },
      { key: 'apiVersion', label: 'API Version', type: 'string', required: true, placeholder: '2024-10-21', default: '2024-10-21' },
    ],
  },

  mistralCloudApi: {
    label: 'Mistral Cloud API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  deepSeekApi: {
    label: 'DeepSeek API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.deepseek.com' },
    ],
  },

  perplexityApi: {
    label: 'Perplexity API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'pplx-...' },
    ],
  },

  deepLApi: {
    label: 'DeepL API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'planType', label: 'Plan Type', type: 'select', options: ['free', 'pro'], default: 'free' },
    ],
  },

  huggingFaceApi: {
    label: 'Hugging Face API',
    fields: [
      { key: 'apiKey', label: 'API Token', type: 'password', required: true, placeholder: 'hf_...' },
    ],
  },

  // ── Communication ──────────────────────────────────────────────────────────

  slackApi: {
    label: 'Slack API Token',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'xoxb-...' },
    ],
  },

  slackOAuth2Api: {
    label: 'Slack OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'xoxb-...' },
    ],
  },

  discordBotApi: {
    label: 'Discord Bot',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
    ],
  },

  discordWebhookApi: {
    label: 'Discord Webhook',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://discord.com/api/webhooks/...' },
    ],
  },

  discordOAuth2Api: {
    label: 'Discord OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
    ],
  },

  telegramApi: {
    label: 'Telegram API',
    fields: [
      { key: 'accessToken', label: 'Bot Token', type: 'password', required: true, placeholder: '123456:ABC-...' },
    ],
  },

  whatsAppApi: {
    label: 'WhatsApp Business API',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'businessAccountId', label: 'Business Account ID', type: 'string', required: true },
    ],
  },

  instagramApi: {
    label: 'Instagram Business API',
    fields: [
      { key: 'igUserId', label: 'Instagram Business Account ID', type: 'string', required: true, placeholder: '17841400000000000' },
      { key: 'pageId', label: 'Facebook Page ID', type: 'string', required: true, placeholder: '123456789012345' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', required: true, placeholder: 'EAAG…' },
      { key: 'username', label: 'Username', type: 'string', placeholder: 'acme_coffee' },
    ],
  },

  threadsApi: {
    label: 'Threads API',
    fields: [
      { key: 'threadsUserId', label: 'Threads User ID', type: 'string', required: true, placeholder: '1234567890' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'TH…' },
      { key: 'username', label: 'Username', type: 'string', placeholder: 'acme' },
    ],
  },

  twilioApi: {
    label: 'Twilio API',
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'string', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
    ],
  },

  microsoftTeamsOAuth2Api: {
    label: 'Microsoft Teams OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'tenantId', label: 'Tenant ID', type: 'string', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  mattermostApi: {
    label: 'Mattermost API',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'url', required: true, placeholder: 'https://mattermost.example.com' },
    ],
  },

  lineNotifyOAuth2Api: {
    label: 'LINE Notify OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  rocketchatApi: {
    label: 'Rocket.Chat API',
    fields: [
      { key: 'userId', label: 'User ID', type: 'string', required: true },
      { key: 'authKey', label: 'Auth Key', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'url', required: true, placeholder: 'https://chat.example.com' },
    ],
  },

  // ── Email / SMTP ───────────────────────────────────────────────────────────

  smtp: {
    label: 'SMTP',
    fields: [
      { key: 'host', label: 'Host', type: 'string', required: true, placeholder: 'smtp.gmail.com' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 587 },
      { key: 'user', label: 'Username', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'secure', label: 'SSL/TLS', type: 'boolean', default: true },
    ],
  },

  // ── Google Services ────────────────────────────────────────────────────────

  googleSheetsOAuth2Api: {
    label: 'Google Sheets OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  googleCalendarOAuth2Api: {
    label: 'Google Calendar OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  googleDriveOAuth2Api: {
    label: 'Google Drive OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  googleCloudStorageOAuth2Api: {
    label: 'Google Cloud Storage OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
      { key: 'projectId', label: 'Project ID', type: 'string' },
    ],
  },

  // ── Cloud / AWS ────────────────────────────────────────────────────────────

  s3: {
    label: 'S3',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'string', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'string', required: true, placeholder: 'us-east-1' },
      { key: 'endpoint', label: 'Custom Endpoint', type: 'url', placeholder: 'https://s3.amazonaws.com' },
    ],
  },

  aws: {
    label: 'AWS',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'string', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'string', required: true, placeholder: 'us-east-1' },
    ],
  },

  cloudflareApi: {
    label: 'Cloudflare API',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },

  supabaseApi: {
    label: 'Supabase API',
    fields: [
      { key: 'host', label: 'Project URL', type: 'url', required: true, placeholder: 'https://xxx.supabase.co' },
      { key: 'serviceRole', label: 'Service Role Key', type: 'password', required: true },
    ],
  },

  // ── CRM ────────────────────────────────────────────────────────────────────

  salesforceOAuth2Api: {
    label: 'Salesforce OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
      { key: 'instanceUrl', label: 'Instance URL', type: 'url', placeholder: 'https://yourorg.salesforce.com' },
    ],
  },

  hubspotApi: {
    label: 'HubSpot API Key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  hubspotOAuth2Api: {
    label: 'HubSpot OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  pipedriveApi: {
    label: 'Pipedrive API Token',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'domain', label: 'Company Domain', type: 'string', required: true, placeholder: 'yourcompany' },
    ],
  },

  pipedriveOAuth2Api: {
    label: 'Pipedrive OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  copperApi: {
    label: 'Copper API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'email', label: 'Email', type: 'string', required: true, placeholder: 'user@example.com' },
    ],
  },

  agileCrmApi: {
    label: 'Agile CRM API',
    fields: [
      { key: 'email', label: 'Email', type: 'string', required: true },
      { key: 'apiKey', label: 'REST API Key', type: 'password', required: true },
      { key: 'subdomain', label: 'Subdomain', type: 'string', required: true, placeholder: 'yourcompany' },
    ],
  },

  freshworksCrmApi: {
    label: 'Freshworks CRM API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'string', required: true, placeholder: 'yourcompany.freshworks.com' },
    ],
  },

  affinityApi: {
    label: 'Affinity API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  zohoOAuth2Api: {
    label: 'Zoho OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
      { key: 'domain', label: 'Domain', type: 'select', options: ['com', 'eu', 'in', 'com.au', 'jp'], default: 'com' },
    ],
  },

  highLevelApi: {
    label: 'HighLevel API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // ── Marketing ──────────────────────────────────────────────────────────────

  mailchimpApi: {
    label: 'Mailchimp API Key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'xxx-us1' },
    ],
  },

  mailchimpOAuth2Api: {
    label: 'Mailchimp OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'server', label: 'Server Prefix', type: 'string', placeholder: 'us1' },
    ],
  },

  activeCampaignApi: {
    label: 'ActiveCampaign API',
    fields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true, placeholder: 'https://yourorg.api-us1.com' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  sendInBlueApi: {
    label: 'Brevo (Sendinblue) API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  convertKitApi: {
    label: 'ConvertKit API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
  },

  lemlistApi: {
    label: 'Lemlist API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  mailgunApi: {
    label: 'Mailgun API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'string', required: true, placeholder: 'mg.example.com' },
      { key: 'apiDomain', label: 'API Domain', type: 'select', options: ['api.mailgun.net', 'api.eu.mailgun.net'], default: 'api.mailgun.net' },
    ],
  },

  mailjetEmailApi: {
    label: 'Mailjet Email API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },

  mailjetSmsApi: {
    label: 'Mailjet SMS API',
    fields: [
      { key: 'token', label: 'API Token', type: 'password', required: true },
    ],
  },

  sendGridApi: {
    label: 'SendGrid API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'SG.xxx' },
    ],
  },

  facebookLeadAdsOAuth2Api: {
    label: 'Facebook Lead Ads OAuth2',
    fields: [
      { key: 'clientId', label: 'App ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'App Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  linkedInOAuth2Api: {
    label: 'LinkedIn OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  // ── Developer Tools ────────────────────────────────────────────────────────

  githubApi: {
    label: 'GitHub API Token',
    fields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'ghp_...' },
      { key: 'server', label: 'GitHub Server', type: 'url', placeholder: 'https://api.github.com' },
    ],
  },

  githubOAuth2Api: {
    label: 'GitHub OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  gitlabApi: {
    label: 'GitLab API Token',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'server', label: 'GitLab Server', type: 'url', placeholder: 'https://gitlab.com' },
    ],
  },

  gitlabOAuth2Api: {
    label: 'GitLab OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'server', label: 'GitLab Server', type: 'url', placeholder: 'https://gitlab.com' },
    ],
  },

  jiraSoftwareCloudApi: {
    label: 'Jira Software Cloud',
    fields: [
      { key: 'email', label: 'Email', type: 'string', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'string', required: true, placeholder: 'yourorg.atlassian.net' },
    ],
  },

  jiraSoftwareServerApi: {
    label: 'Jira Software Server',
    fields: [
      { key: 'email', label: 'Email', type: 'string', required: true },
      { key: 'password', label: 'Password / API Token', type: 'password', required: true },
      { key: 'domain', label: 'Server URL', type: 'url', required: true },
    ],
  },

  linearApi: {
    label: 'Linear API Key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'lin_api_...' },
    ],
  },

  linearOAuth2Api: {
    label: 'Linear OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  jenkinsApi: {
    label: 'Jenkins API',
    fields: [
      { key: 'username', label: 'Username', type: 'string', required: true },
      { key: 'apiKey', label: 'API Token', type: 'password', required: true },
      { key: 'baseUrl', label: 'Jenkins URL', type: 'url', required: true, placeholder: 'https://jenkins.example.com' },
    ],
  },

  circleCiApi: {
    label: 'CircleCI API',
    fields: [
      { key: 'apiKey', label: 'Personal API Token', type: 'password', required: true },
    ],
  },

  bitbucketApi: {
    label: 'Bitbucket API',
    fields: [
      { key: 'username', label: 'Username', type: 'string', required: true },
      { key: 'appPassword', label: 'App Password', type: 'password', required: true },
    ],
  },

  sentryIoApi: {
    label: 'Sentry.io API Token',
    fields: [
      { key: 'token', label: 'Auth Token', type: 'password', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://sentry.io' },
    ],
  },

  sentryIoOAuth2Api: {
    label: 'Sentry.io OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  grafanaApi: {
    label: 'Grafana API',
    fields: [
      { key: 'apiKey', label: 'API Key / Service Account Token', type: 'password', required: true },
      { key: 'baseUrl', label: 'Grafana URL', type: 'url', required: true, placeholder: 'https://grafana.example.com' },
    ],
  },

  // ── Productivity ───────────────────────────────────────────────────────────

  notionApi: {
    label: 'Notion API Token',
    fields: [
      { key: 'apiKey', label: 'Integration Token', type: 'password', required: true, placeholder: 'secret_...' },
    ],
  },

  notionOAuth2Api: {
    label: 'Notion OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  airtableTokenApi: {
    label: 'Airtable Personal Access Token',
    fields: [
      { key: 'apiKey', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'pat...' },
    ],
  },

  airtableOAuth2Api: {
    label: 'Airtable OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  clickUpApi: {
    label: 'ClickUp API Token',
    fields: [
      { key: 'accessToken', label: 'API Token', type: 'password', required: true },
    ],
  },

  clickUpOAuth2Api: {
    label: 'ClickUp OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  asanaApi: {
    label: 'Asana API Token',
    fields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },

  asanaOAuth2Api: {
    label: 'Asana OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  trelloApi: {
    label: 'Trello API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },

  todoistApi: {
    label: 'Todoist API Token',
    fields: [
      { key: 'apiKey', label: 'API Token', type: 'password', required: true },
    ],
  },

  todoistOAuth2Api: {
    label: 'Todoist OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  mondayComApi: {
    label: 'Monday.com API Token',
    fields: [
      { key: 'apiToken', label: 'API Token (v2)', type: 'password', required: true },
    ],
  },

  mondayComOAuth2Api: {
    label: 'Monday.com OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  calendlyApi: {
    label: 'Calendly API',
    fields: [
      { key: 'apiKey', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },

  microsoftOutlookOAuth2Api: {
    label: 'Microsoft Outlook OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'tenantId', label: 'Tenant ID', type: 'string', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  // ── Finance ────────────────────────────────────────────────────────────────

  stripeApi: {
    label: 'Stripe API',
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
    ],
  },

  payPalApi: {
    label: 'PayPal API',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'secret', label: 'Secret', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'live'], default: 'sandbox' },
    ],
  },

  quickBooksOAuth2Api: {
    label: 'QuickBooks OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
      { key: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'production'], default: 'sandbox' },
    ],
  },

  xeroOAuth2Api: {
    label: 'Xero OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
    ],
  },

  wiseApi: {
    label: 'Wise API',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'live'], default: 'sandbox' },
    ],
  },

  chargebeeApi: {
    label: 'Chargebee API',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'accountName', label: 'Account Name', type: 'string', required: true, placeholder: 'yoursite' },
    ],
  },

  paddleApi: {
    label: 'Paddle API',
    fields: [
      { key: 'vendorId', label: 'Vendor ID', type: 'string', required: true },
      { key: 'vendorAuthCode', label: 'Auth Code', type: 'password', required: true },
      { key: 'sandbox', label: 'Use Sandbox', type: 'boolean', default: false },
    ],
  },

  // ── eCommerce ──────────────────────────────────────────────────────────────

  shopifyApi: {
    label: 'Shopify API Key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'shopSubdomain', label: 'Shop Subdomain', type: 'string', required: true, placeholder: 'myshop' },
    ],
  },

  shopifyAccessTokenApi: {
    label: 'Shopify Access Token',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'shopSubdomain', label: 'Shop Subdomain', type: 'string', required: true, placeholder: 'myshop' },
    ],
  },

  shopifyOAuth2Api: {
    label: 'Shopify OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'shopSubdomain', label: 'Shop Subdomain', type: 'string', required: true, placeholder: 'myshop' },
    ],
  },

  wooCommerceApi: {
    label: 'WooCommerce API',
    fields: [
      { key: 'consumerKey', label: 'Consumer Key', type: 'password', required: true },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true },
      { key: 'url', label: 'WooCommerce URL', type: 'url', required: true, placeholder: 'https://mystore.com' },
    ],
  },

  magento2Api: {
    label: 'Magento 2 API',
    fields: [
      { key: 'host', label: 'Host', type: 'url', required: true, placeholder: 'https://magento.example.com' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },

  webflowApi: {
    label: 'Webflow API Token',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },

  webflowOAuth2Api: {
    label: 'Webflow OAuth2',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
  },

  // ── Databases ──────────────────────────────────────────────────────────────

  postgres: {
    label: 'PostgreSQL',
    fields: [
      { key: 'host', label: 'Host', type: 'string', required: true, default: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 5432 },
      { key: 'database', label: 'Database', type: 'string', required: true },
      { key: 'user', label: 'User', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'ssl', label: 'SSL', type: 'select', options: ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'], default: 'disable' },
    ],
  },

  mySql: {
    label: 'MySQL',
    fields: [
      { key: 'host', label: 'Host', type: 'string', required: true, default: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 3306 },
      { key: 'database', label: 'Database', type: 'string', required: true },
      { key: 'user', label: 'User', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'ssl', label: 'SSL', type: 'boolean', default: false },
    ],
  },

  mongoDb: {
    label: 'MongoDB',
    fields: [
      { key: 'connectionString', label: 'Connection String', type: 'password', required: true, placeholder: 'mongodb+srv://user:pass@cluster.mongodb.net/db' },
      { key: 'database', label: 'Database', type: 'string' },
    ],
  },

  redis: {
    label: 'Redis',
    fields: [
      { key: 'host', label: 'Host', type: 'string', required: true, default: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 6379 },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'database', label: 'Database Number', type: 'number', default: 0 },
    ],
  },

  snowflake: {
    label: 'Snowflake',
    fields: [
      { key: 'account', label: 'Account', type: 'string', required: true, placeholder: 'orgname-accountname' },
      { key: 'username', label: 'Username', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'database', label: 'Database', type: 'string', required: true },
      { key: 'warehouse', label: 'Warehouse', type: 'string' },
      { key: 'schema', label: 'Schema', type: 'string', default: 'PUBLIC' },
      { key: 'role', label: 'Role', type: 'string' },
    ],
  },

  crateDb: {
    label: 'CrateDB',
    fields: [
      { key: 'host', label: 'Host', type: 'string', required: true, default: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 4200 },
      { key: 'user', label: 'User', type: 'string', default: 'crate' },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'ssl', label: 'SSL', type: 'boolean', default: false },
    ],
  },

  timescaleDb: {
    label: 'TimescaleDB',
    fields: [
      { key: 'host', label: 'Host', type: 'string', required: true, default: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 5432 },
      { key: 'database', label: 'Database', type: 'string', required: true },
      { key: 'user', label: 'User', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'ssl', label: 'SSL', type: 'select', options: ['disable', 'allow', 'prefer', 'require'], default: 'disable' },
    ],
  },

  elasticsearchApi: {
    label: 'Elasticsearch API',
    fields: [
      { key: 'baseUrl', label: 'Base URL', type: 'url', required: true, placeholder: 'https://localhost:9200' },
      { key: 'username', label: 'Username', type: 'string' },
      { key: 'password', label: 'Password', type: 'password' },
    ],
  },

  questDb: {
    label: 'QuestDB',
    fields: [
      { key: 'host', label: 'Host', type: 'string', required: true, default: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 8812 },
      { key: 'user', label: 'User', type: 'string', default: 'admin' },
      { key: 'password', label: 'Password', type: 'password', default: 'quest' },
      { key: 'database', label: 'Database', type: 'string', default: 'qdb' },
    ],
  },

  nocoDbApiToken: {
    label: 'NocoDB API Token',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'host', label: 'Host URL', type: 'url', required: true, placeholder: 'https://app.nocodb.com' },
    ],
  },

  nocoDb: {
    label: 'NocoDB (User Token)',
    fields: [
      { key: 'user', label: 'Email', type: 'string', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'host', label: 'Host URL', type: 'url', required: true, placeholder: 'https://app.nocodb.com' },
    ],
  },

  baserowApi: {
    label: 'Baserow API',
    fields: [
      { key: 'apiToken', label: 'Database Token', type: 'password', required: true },
      { key: 'host', label: 'Host URL', type: 'url', default: 'https://api.baserow.io' },
    ],
  },
};

/*
  APP_GROUPS — Groups credential types by application / service.
  Each entry has:
    - app: Human-readable app name
    - icon: Key into BRAND_ICON_MAP (used in CredentialSheet)
    - category: Grouping for visual separation
    - types: Array of { key, label } where key is the CREDENTIAL_SCHEMAS key
             and label is a short auth-type descriptor (e.g. "API Token", "OAuth2")

  Apps with a single type will skip the type-selection step in the UI.
*/
export const APP_GROUPS = [
  // ── AI / LLM ──
  { app: 'OpenAI', icon: 'openAi', category: 'AI / LLM', types: [
    { key: 'openAiApi', label: 'API Key' },
  ]},
  { app: 'Anthropic', icon: 'anthropicClaude', category: 'AI / LLM', types: [
    { key: 'anthropicApi', label: 'API Key' },
  ]},
  { app: 'Google Vertex AI', icon: 'googleCloud', category: 'AI / LLM', types: [
    { key: 'vertexAiApi', label: 'Service Account' },
  ]},
  { app: 'Amazon Bedrock', icon: 'amazonBedrock', category: 'AI / LLM', types: [
    { key: 'bedrockApi', label: 'IAM Credentials' },
  ]},
  { app: 'Azure OpenAI', icon: 'azureOpenAi', category: 'AI / LLM', types: [
    { key: 'azureOpenAiApi', label: 'API Key' },
  ]},
  { app: 'Mistral', icon: 'mistralAi', category: 'AI / LLM', types: [
    { key: 'mistralCloudApi', label: 'API Key' },
  ]},
  { app: 'DeepSeek', icon: 'deepSeek', category: 'AI / LLM', types: [
    { key: 'deepSeekApi', label: 'API Key' },
  ]},
  { app: 'Perplexity', icon: 'perplexity', category: 'AI / LLM', types: [
    { key: 'perplexityApi', label: 'API Key' },
  ]},
  { app: 'DeepL', icon: 'deepL', category: 'AI / LLM', types: [
    { key: 'deepLApi', label: 'API Key' },
  ]},
  { app: 'Hugging Face', icon: 'huggingFace', category: 'AI / LLM', types: [
    { key: 'huggingFaceApi', label: 'API Token' },
  ]},

  // ── Communication ──
  { app: 'Slack', icon: 'slack', category: 'Communication', types: [
    { key: 'slackApi', label: 'API Token' },
    { key: 'slackOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Discord', icon: 'discord', category: 'Communication', types: [
    { key: 'discordBotApi', label: 'Bot Token' },
    { key: 'discordWebhookApi', label: 'Webhook' },
    { key: 'discordOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Telegram', icon: 'telegram', category: 'Communication', types: [
    { key: 'telegramApi', label: 'Bot Token' },
  ]},
  { app: 'WhatsApp', icon: 'whatsApp', category: 'Communication', types: [
    { key: 'whatsAppApi', label: 'Business API' },
  ]},
  { app: 'Instagram', icon: 'instagram', category: 'Communication', types: [
    { key: 'instagramApi', label: 'Business API' },
  ]},
  { app: 'Threads', icon: 'threads', category: 'Communication', types: [
    { key: 'threadsApi', label: 'API' },
  ]},
  { app: 'Twilio', icon: 'twilio', category: 'Communication', types: [
    { key: 'twilioApi', label: 'API Key' },
  ]},
  // Microsoft Teams — use Connected Accounts (no client_id/secret for users)
  { app: 'Mattermost', icon: 'mattermost', category: 'Communication', types: [
    { key: 'mattermostApi', label: 'API Token' },
  ]},
  { app: 'LINE Notify', icon: 'line', category: 'Communication', types: [
    { key: 'lineNotifyOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Rocket.Chat', icon: null, category: 'Communication', types: [
    { key: 'rocketchatApi', label: 'API' },
  ]},

  // ── Email ──
  { app: 'SMTP', icon: null, category: 'Email', types: [
    { key: 'smtp', label: 'SMTP' },
  ]},
  { app: 'SendGrid', icon: 'sendGrid', category: 'Email', types: [
    { key: 'sendGridApi', label: 'API Key' },
  ]},
  { app: 'Mailgun', icon: 'mailgun', category: 'Email', types: [
    { key: 'mailgunApi', label: 'API Key' },
  ]},
  { app: 'Mailjet', icon: null, category: 'Email', types: [
    { key: 'mailjetEmailApi', label: 'Email API' },
    { key: 'mailjetSmsApi', label: 'SMS API' },
  ]},
  // Microsoft Outlook — use Connected Accounts (no client_id/secret for users)
  // Google Sheets, Calendar, Drive, Cloud Storage — use Connected Accounts

  // ── Cloud / Infrastructure ──
  { app: 'AWS', icon: null, category: 'Cloud', types: [
    { key: 'aws', label: 'IAM Credentials' },
    { key: 's3', label: 'S3' },
  ]},
  { app: 'Cloudflare', icon: 'cloudflare', category: 'Cloud', types: [
    { key: 'cloudflareApi', label: 'API Token' },
  ]},
  { app: 'Supabase', icon: 'supabase', category: 'Cloud', types: [
    { key: 'supabaseApi', label: 'API Key' },
  ]},

  // ── CRM ──
  { app: 'Salesforce', icon: 'salesforce', category: 'CRM', types: [
    { key: 'salesforceOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'HubSpot', icon: 'hubspot', category: 'CRM', types: [
    { key: 'hubspotApi', label: 'API Key' },
    { key: 'hubspotOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Pipedrive', icon: null, category: 'CRM', types: [
    { key: 'pipedriveApi', label: 'API Token' },
    { key: 'pipedriveOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Copper', icon: null, category: 'CRM', types: [
    { key: 'copperApi', label: 'API Key' },
  ]},
  { app: 'Agile CRM', icon: null, category: 'CRM', types: [
    { key: 'agileCrmApi', label: 'API Key' },
  ]},
  { app: 'Freshworks CRM', icon: null, category: 'CRM', types: [
    { key: 'freshworksCrmApi', label: 'API Key' },
  ]},
  { app: 'Affinity', icon: 'affinity', category: 'CRM', types: [
    { key: 'affinityApi', label: 'API Key' },
  ]},
  { app: 'Zoho', icon: 'zohoCrm', category: 'CRM', types: [
    { key: 'zohoOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'HighLevel', icon: null, category: 'CRM', types: [
    { key: 'highLevelApi', label: 'API Key' },
  ]},

  // ── Marketing ──
  { app: 'Mailchimp', icon: 'mailchimp', category: 'Marketing', types: [
    { key: 'mailchimpApi', label: 'API Key' },
    { key: 'mailchimpOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'ActiveCampaign', icon: null, category: 'Marketing', types: [
    { key: 'activeCampaignApi', label: 'API Key' },
  ]},
  { app: 'Brevo (Sendinblue)', icon: 'brevo', category: 'Marketing', types: [
    { key: 'sendInBlueApi', label: 'API Key' },
  ]},
  { app: 'ConvertKit', icon: null, category: 'Marketing', types: [
    { key: 'convertKitApi', label: 'API Key' },
  ]},
  { app: 'Lemlist', icon: null, category: 'Marketing', types: [
    { key: 'lemlistApi', label: 'API Key' },
  ]},
  { app: 'Facebook Lead Ads', icon: 'facebookLeadAds', category: 'Marketing', types: [
    { key: 'facebookLeadAdsOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'LinkedIn', icon: null, category: 'Marketing', types: [
    { key: 'linkedInOAuth2Api', label: 'OAuth2' },
  ]},

  // ── Developer Tools ──
  { app: 'GitHub', icon: 'github', category: 'Developer Tools', types: [
    { key: 'githubApi', label: 'API Token' },
  ]},
  { app: 'GitLab', icon: 'gitLab', category: 'Developer Tools', types: [
    { key: 'gitlabApi', label: 'API Token' },
    { key: 'gitlabOAuth2Api', label: 'OAuth2' },
  ]},
  // Jira — use Connected Accounts (OAuth 2.0 flow, no manual tokens)
  { app: 'Linear', icon: 'linear', category: 'Developer Tools', types: [
    { key: 'linearApi', label: 'API Key' },
    { key: 'linearOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Jenkins', icon: 'jenkins', category: 'Developer Tools', types: [
    { key: 'jenkinsApi', label: 'API Key' },
  ]},
  { app: 'CircleCI', icon: 'circleCI', category: 'Developer Tools', types: [
    { key: 'circleCiApi', label: 'API Token' },
  ]},
  { app: 'Bitbucket', icon: 'bitbucket', category: 'Developer Tools', types: [
    { key: 'bitbucketApi', label: 'App Password' },
  ]},
  { app: 'Sentry', icon: 'sentry', category: 'Developer Tools', types: [
    { key: 'sentryIoApi', label: 'API Token' },
    { key: 'sentryIoOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Grafana', icon: 'grafana', category: 'Developer Tools', types: [
    { key: 'grafanaApi', label: 'API Key' },
  ]},

  // ── Productivity ──
  { app: 'Notion', icon: 'notion', category: 'Productivity', types: [
    { key: 'notionApi', label: 'API Token' },
    { key: 'notionOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Airtable', icon: 'airtable', category: 'Productivity', types: [
    { key: 'airtableTokenApi', label: 'Access Token' },
    { key: 'airtableOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'ClickUp', icon: 'clickUp', category: 'Productivity', types: [
    { key: 'clickUpApi', label: 'API Token' },
    { key: 'clickUpOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Asana', icon: 'asana', category: 'Productivity', types: [
    { key: 'asanaApi', label: 'API Token' },
    { key: 'asanaOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Trello', icon: 'trello', category: 'Productivity', types: [
    { key: 'trelloApi', label: 'API Key' },
  ]},
  { app: 'Todoist', icon: 'todoist', category: 'Productivity', types: [
    { key: 'todoistApi', label: 'API Token' },
    { key: 'todoistOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Monday.com', icon: null, category: 'Productivity', types: [
    { key: 'mondayComApi', label: 'API Token' },
    { key: 'mondayComOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Calendly', icon: 'calendly', category: 'Productivity', types: [
    { key: 'calendlyApi', label: 'API Token' },
  ]},

  // ── Finance ──
  { app: 'Stripe', icon: 'stripe', category: 'Finance', types: [
    { key: 'stripeApi', label: 'API Key' },
  ]},
  { app: 'PayPal', icon: 'payPal', category: 'Finance', types: [
    { key: 'payPalApi', label: 'API Key' },
  ]},
  { app: 'QuickBooks', icon: 'quickBooks', category: 'Finance', types: [
    { key: 'quickBooksOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Xero', icon: 'xero', category: 'Finance', types: [
    { key: 'xeroOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'Wise', icon: 'wise', category: 'Finance', types: [
    { key: 'wiseApi', label: 'API Token' },
  ]},
  { app: 'Chargebee', icon: null, category: 'Finance', types: [
    { key: 'chargebeeApi', label: 'API Key' },
  ]},
  { app: 'Paddle', icon: 'paddle', category: 'Finance', types: [
    { key: 'paddleApi', label: 'API Key' },
  ]},

  // ── eCommerce ──
  { app: 'Shopify', icon: 'shopify', category: 'eCommerce', types: [
    { key: 'shopifyApi', label: 'API Key' },
    { key: 'shopifyAccessTokenApi', label: 'Access Token' },
    { key: 'shopifyOAuth2Api', label: 'OAuth2' },
  ]},
  { app: 'WooCommerce', icon: 'wooCommerce', category: 'eCommerce', types: [
    { key: 'wooCommerceApi', label: 'API Key' },
  ]},
  { app: 'Magento', icon: null, category: 'eCommerce', types: [
    { key: 'magento2Api', label: 'API Token' },
  ]},
  { app: 'Webflow', icon: 'webflow', category: 'eCommerce', types: [
    { key: 'webflowApi', label: 'API Token' },
    { key: 'webflowOAuth2Api', label: 'OAuth2' },
  ]},

  // ── Databases ──
  { app: 'PostgreSQL', icon: 'postgres', category: 'Databases', types: [
    { key: 'postgres', label: 'Connection' },
  ]},
  { app: 'MySQL', icon: 'mySql', category: 'Databases', types: [
    { key: 'mySql', label: 'Connection' },
  ]},
  { app: 'MongoDB', icon: 'mongoDb', category: 'Databases', types: [
    { key: 'mongoDb', label: 'Connection String' },
  ]},
  { app: 'Redis', icon: 'redis', category: 'Databases', types: [
    { key: 'redis', label: 'Connection' },
  ]},
  { app: 'Snowflake', icon: 'snowflake', category: 'Databases', types: [
    { key: 'snowflake', label: 'Connection' },
  ]},
  { app: 'Elasticsearch', icon: 'elasticsearch', category: 'Databases', types: [
    { key: 'elasticsearchApi', label: 'API' },
  ]},
  { app: 'TimescaleDB', icon: 'timescaleDb', category: 'Databases', types: [
    { key: 'timescaleDb', label: 'Connection' },
  ]},
  { app: 'CrateDB', icon: 'crateDb', category: 'Databases', types: [
    { key: 'crateDb', label: 'Connection' },
  ]},
  { app: 'QuestDB', icon: null, category: 'Databases', types: [
    { key: 'questDb', label: 'Connection' },
  ]},
  { app: 'NocoDB', icon: null, category: 'Databases', types: [
    { key: 'nocoDbApiToken', label: 'API Token' },
    { key: 'nocoDb', label: 'User Token' },
  ]},
  { app: 'Baserow', icon: 'baserow', category: 'Databases', types: [
    { key: 'baserowApi', label: 'API Token' },
  ]},

  // ── Generic / HTTP ──
  { app: 'HTTP Basic Auth', icon: null, category: 'Generic', types: [
    { key: 'httpBasicAuth', label: 'Basic Auth' },
  ]},
  { app: 'HTTP Header Auth', icon: null, category: 'Generic', types: [
    { key: 'httpHeaderAuth', label: 'Header Auth' },
  ]},
];

/**
 * Get the credential schema for a given type.
 * Returns the schema if found, or null if no schema is defined.
 */
export function getCredentialSchema(credType) {
  return CREDENTIAL_SCHEMAS[credType] || null;
}

/**
 * Build default form values from a credential schema.
 * Used to pre-fill the form when creating a new credential.
 */
export function getCredentialDefaults(credType) {
  const schema = CREDENTIAL_SCHEMAS[credType];
  if (!schema) return {};
  const defaults = {};
  for (const field of schema.fields) {
    if (field.default !== undefined) {
      defaults[field.key] = field.default;
    } else if (field.type === 'boolean') {
      defaults[field.key] = false;
    } else {
      defaults[field.key] = '';
    }
  }
  return defaults;
}
