/*
  CredentialSheet — Slide-out sheet for creating or editing a workflow credential.
  Shows structured form fields based on the credential type schema.
*/

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Key, Loader2, Search, ChevronDown, Check } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { credentialsApi } from '../../../api/workflowCredentials';
import { getCredentialSchema, getCredentialDefaults, APP_GROUPS } from './credentialSchemas';
import { BRAND_ICON_MAP } from '../../../components/workflows/workflowIconMap';
import CredentialFieldRenderer from './CredentialFieldRenderer';

// Map credential type keys to brand icon keys by stripping common suffixes
const CRED_TO_BRAND_KEY = {
  openAiApi: 'openAi',
  anthropicApi: 'anthropicClaude',
  vertexAiApi: 'googleCloud',
  bedrockApi: 'amazonBedrock',
  azureOpenAiApi: 'azureOpenAi',
  mistralCloudApi: 'mistralAi',
  deepSeekApi: 'deepSeek',
  perplexityApi: 'perplexity',
  deepLApi: 'deepL',
  huggingFaceApi: 'huggingFace',
  slackApi: 'slack',
  slackOAuth2Api: 'slack',
  discordBotApi: 'discord',
  discordWebhookApi: 'discord',
  discordOAuth2Api: 'discord',
  telegramApi: 'telegram',
  whatsAppApi: 'whatsApp',
  instagramApi: 'instagram',
  threadsApi: 'threads',
  twilioApi: 'twilio',
  mattermostApi: 'mattermost',
  lineNotifyOAuth2Api: 'line',
  googleSheetsOAuth2Api: 'googleSheets',
  googleCalendarOAuth2Api: 'googleCalendar',
  googleDriveOAuth2Api: 'googleDrive',
  googleCloudStorageOAuth2Api: 'googleCloudStorage',
  salesforceOAuth2Api: 'salesforce',
  hubspotApi: 'hubspot',
  hubspotOAuth2Api: 'hubspot',
  affinityApi: 'affinity',
  zohoOAuth2Api: 'zohoCrm',
  mailchimpApi: 'mailchimp',
  mailchimpOAuth2Api: 'mailchimp',
  sendInBlueApi: 'brevo',
  sendGridApi: 'sendGrid',
  mailgunApi: 'mailgun',
  facebookLeadAdsOAuth2Api: 'facebookLeadAds',
  githubApi: 'github',
  githubOAuth2Api: 'github',
  gitlabApi: 'gitLab',
  gitlabOAuth2Api: 'gitLab',
  jiraSoftwareCloudApi: 'jira',
  jiraSoftwareServerApi: 'jira',
  linearApi: 'linear',
  linearOAuth2Api: 'linear',
  jenkinsApi: 'jenkins',
  circleCiApi: 'circleCI',
  bitbucketApi: 'bitbucket',
  sentryIoApi: 'sentry',
  sentryIoOAuth2Api: 'sentry',
  grafanaApi: 'grafana',
  notionApi: 'notion',
  notionOAuth2Api: 'notion',
  airtableTokenApi: 'airtable',
  airtableOAuth2Api: 'airtable',
  clickUpApi: 'clickUp',
  clickUpOAuth2Api: 'clickUp',
  asanaApi: 'asana',
  asanaOAuth2Api: 'asana',
  trelloApi: 'trello',
  todoistApi: 'todoist',
  todoistOAuth2Api: 'todoist',
  calendlyApi: 'calendly',
  stripeApi: 'stripe',
  payPalApi: 'payPal',
  quickBooksOAuth2Api: 'quickBooks',
  xeroOAuth2Api: 'xero',
  wiseApi: 'wise',
  paddleApi: 'paddle',
  shopifyApi: 'shopify',
  shopifyAccessTokenApi: 'shopify',
  shopifyOAuth2Api: 'shopify',
  wooCommerceApi: 'wooCommerce',
  webflowApi: 'webflow',
  webflowOAuth2Api: 'webflow',
  cloudflareApi: 'cloudflare',
  supabaseApi: 'supabase',
  postgres: 'postgres',
  mySql: 'mySql',
  mongoDb: 'mongoDb',
  redis: 'redis',
  snowflake: 'snowflake',
  elasticsearchApi: 'elasticsearch',
  timescaleDb: 'timescaleDb',
  crateDb: 'crateDb',
  baserowApi: 'baserow',
};

// Reverse-lookup: credential type key → brand icon key
const CRED_TYPE_TO_ICON = {};
for (const group of APP_GROUPS) {
  for (const t of group.types) {
    if (group.icon) CRED_TYPE_TO_ICON[t.key] = group.icon;
  }
}

function CredentialIcon({ credType, iconKey, size = 16 }) {
  const brandKey = iconKey || CRED_TO_BRAND_KEY[credType] || CRED_TYPE_TO_ICON[credType];
  const BrandIcon = brandKey ? BRAND_ICON_MAP[brandKey] : null;
  if (BrandIcon) return <BrandIcon size={size} />;
  return <Key size={size} className='text-muted-foreground' />;
}

// Collect unique categories in order for grouping
const APP_CATEGORIES = [...new Set(APP_GROUPS.map((g) => g.category))];

export { CredentialIcon, CRED_TO_BRAND_KEY };

export default function CredentialSheet({
  open,
  onClose,
  credType: credTypeProp,
  editCredential,
  onSaved,
}) {
  const [selectedApp, setSelectedApp] = useState(null);   // APP_GROUPS entry
  const [selectedType, setSelectedType] = useState('');    // credential type key
  const [appSearch, setAppSearch] = useState('');
  const [appPopoverOpen, setAppPopoverOpen] = useState(false);
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);

  const activeCredType = credTypeProp || selectedType;
  const schema = useMemo(() => getCredentialSchema(activeCredType), [activeCredType]);

  const [name, setName] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!editCredential;
  const needsPicker = !credTypeProp && !isEdit;

  // Filtered app groups for the search
  const filteredApps = useMemo(() => {
    if (!appSearch) return APP_GROUPS;
    const q = appSearch.toLowerCase();
    return APP_GROUPS.filter((g) =>
      g.app.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.types.some((t) => t.label.toLowerCase().includes(q))
    );
  }, [appSearch]);

  // Group filtered apps by category
  const groupedApps = useMemo(() => {
    const map = {};
    for (const g of filteredApps) {
      if (!map[g.category]) map[g.category] = [];
      map[g.category].push(g);
    }
    return map;
  }, [filteredApps]);

  // Initialize form when opening
  useEffect(() => {
    if (!open) return;
    setError(null);
    setAppSearch('');
    setSelectedApp(null);
    setSelectedType('');
    setAppPopoverOpen(false);
    setTypePopoverOpen(false);

    if (editCredential) {
      setName(editCredential.name || '');
      try {
        const parsed = typeof editCredential.data === 'string'
          ? JSON.parse(editCredential.data)
          : editCredential.data || {};
        setFieldValues(parsed);
      } catch {
        setFieldValues({});
      }
    } else {
      setName('');
      setFieldValues(getCredentialDefaults(credTypeProp || ''));
    }
  }, [open, editCredential, credTypeProp]);

  const handleSelectApp = useCallback((appGroup) => {
    setSelectedApp(appGroup);
    setAppPopoverOpen(false);
    setAppSearch('');
    if (appGroup.types.length === 1) {
      setSelectedType(appGroup.types[0].key);
      setFieldValues(getCredentialDefaults(appGroup.types[0].key));
    } else {
      setSelectedType('');
    }
  }, []);

  const handleSelectType = useCallback((typeKey) => {
    setSelectedType(typeKey);
    setTypePopoverOpen(false);
    setFieldValues(getCredentialDefaults(typeKey));
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeCredType) {
      setError('Please select a credential type');
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate required fields
    if (schema) {
      for (const field of schema.fields) {
        if (field.required) {
          const val = fieldValues[field.key];
          if (val === undefined || val === null || val === '') {
            setError(`${field.label} is required`);
            return;
          }
        }
      }
    }

    setSaving(true);
    setError(null);

    try {
      const dataStr = JSON.stringify(fieldValues);

      let result;
      if (isEdit) {
        result = await credentialsApi.update(editCredential.id, {
          name,
          data: dataStr,
        });
      } else {
        result = await credentialsApi.create({
          name,
          type: activeCredType,
          data: dataStr,
        });
      }

      if (onSaved) onSaved(result);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  }, [name, fieldValues, activeCredType, isEdit, editCredential, schema, onSaved, onClose]);

  const schemaLabel = schema?.label || activeCredType || 'Credential';
  const appLabel = selectedApp?.app || schemaLabel;

  const headerTitle = isEdit ? `Edit ${schemaLabel}` : 'New Credential';
  const headerDesc = isEdit
    ? 'Update the credential fields below.'
    : 'Select an app, auth type, and fill in the credentials.';

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side='right'
        className='w-[440px] sm:max-w-[440px] flex flex-col p-0 bg-background border-border'
      >
        {/* Header */}
        <SheetHeader className='px-5 py-4 shrink-0 border-b'>
          <SheetTitle className='text-sm flex items-center gap-2'>
            <div className='w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center'>
              {selectedApp ? (
                <CredentialIcon iconKey={selectedApp.icon} credType={activeCredType} size={14} />
              ) : (
                <Key size={14} className='text-primary' />
              )}
            </div>
            {headerTitle}
          </SheetTitle>
          <SheetDescription className='text-xs text-muted-foreground'>
            {headerDesc}
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className='flex-1'>
          <div className='px-5 py-4 space-y-4'>
            {/* Error */}
            {error && (
              <div className='text-xs text-destructive p-2.5 rounded-md bg-destructive/10 border border-destructive/20'>
                {error}
              </div>
            )}

            {/* ── App selector popover ── */}
            {needsPicker && (
              <div className='space-y-1.5'>
                <Label className='text-[11px] font-medium flex items-center gap-1'>
                  Application
                  <span className='text-destructive'>*</span>
                </Label>
                <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full h-8 justify-between text-xs font-normal'
                    >
                      {selectedApp ? (
                        <span className='flex items-center gap-2'>
                          <CredentialIcon iconKey={selectedApp.icon} size={13} />
                          {selectedApp.app}
                        </span>
                      ) : (
                        <span className='text-muted-foreground'>Select an app...</span>
                      )}
                      <ChevronDown size={12} className='text-muted-foreground shrink-0' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align='start'
                    side='bottom'
                    sideOffset={4}
                    avoidCollisions={true}
                    collisionPadding={16}
                    className='w-[var(--radix-popover-trigger-width)] p-0 flex flex-col max-h-[60vh]'
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div className='p-2 border-b shrink-0'>
                      <div className='relative'>
                        <Search size={13} className='absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground' />
                        <Input
                          value={appSearch}
                          onChange={(e) => setAppSearch(e.target.value)}
                          placeholder='Search apps...'
                          className='h-7 pl-7 text-xs'
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className='flex-1 overflow-y-auto overscroll-contain min-h-0'>
                      {Object.keys(groupedApps).length === 0 ? (
                        <div className='p-3 text-xs text-muted-foreground text-center'>No apps found</div>
                      ) : (
                        APP_CATEGORIES.filter((cat) => groupedApps[cat]).map((cat) => (
                          <div key={cat}>
                            <div className='px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky top-0 z-10'>
                              {cat}
                            </div>
                            {groupedApps[cat].map((g) => (
                              <button
                                key={g.app}
                                type='button'
                                className='w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/50 transition-colors'
                                onClick={() => handleSelectApp(g)}
                              >
                                <div className='w-4 h-4 rounded flex items-center justify-center shrink-0'>
                                  <CredentialIcon iconKey={g.icon} size={12} />
                                </div>
                                <span className='flex-1'>{g.app}</span>
                                {selectedApp?.app === g.app && (
                                  <Check size={12} className='text-primary shrink-0' />
                                )}
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* ── Auth type selector popover (only if app has multiple types) ── */}
            {needsPicker && selectedApp && selectedApp.types.length > 1 && (
              <div className='space-y-1.5'>
                <Label className='text-[11px] font-medium flex items-center gap-1'>
                  Auth Type
                  <span className='text-destructive'>*</span>
                </Label>
                <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full h-8 justify-between text-xs font-normal'
                    >
                      {selectedType ? (
                        <span>{selectedApp.types.find(t => t.key === selectedType)?.label}</span>
                      ) : (
                        <span className='text-muted-foreground'>Select auth type...</span>
                      )}
                      <ChevronDown size={12} className='text-muted-foreground shrink-0' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align='start'
                    className='w-[var(--radix-popover-trigger-width)] p-0'
                  >
                    <div className='py-1'>
                      {selectedApp.types.map((t) => (
                        <button
                          key={t.key}
                          type='button'
                          className='w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors'
                          onClick={() => handleSelectType(t.key)}
                        >
                          <div className='flex-1'>
                            <div className='font-medium'>{t.label}</div>
                            <div className='text-[10px] text-muted-foreground'>
                              {getCredentialSchema(t.key)?.label}
                            </div>
                          </div>
                          {selectedType === t.key && (
                            <Check size={12} className='text-primary shrink-0' />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* ── Credential name + fields (once type is resolved) ── */}
            {activeCredType && (
              <>
                <Separator />

                <div className='space-y-1.5'>
                  <Label className='text-[11px] font-medium flex items-center gap-1'>
                    Credential Name
                    <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`My ${appLabel}`}
                    className='h-8 text-xs'
                  />
                </div>

                <Separator />

                {schema ? (
                  <CredentialFieldRenderer
                    fields={schema.fields}
                    values={fieldValues}
                    onChange={setFieldValues}
                  />
                ) : (
                  <div className='space-y-1.5'>
                    <Label className='text-[11px] font-medium'>Credential Data (JSON)</Label>
                    <textarea
                      value={JSON.stringify(fieldValues, null, 2)}
                      onChange={(e) => {
                        try {
                          setFieldValues(JSON.parse(e.target.value));
                        } catch {
                          // Allow typing invalid JSON temporarily
                        }
                      }}
                      rows={6}
                      className='w-full px-3 py-2 text-xs rounded-md border bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y'
                      placeholder='{"key": "value"}'
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className='shrink-0 px-5 py-3 border-t flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onClose}
            className='h-8 text-xs'
          >
            Cancel
          </Button>
          <Button
            size='sm'
            onClick={handleSave}
            disabled={saving || !name.trim() || !activeCredType}
            className='h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white'
          >
            {saving && <Loader2 size={12} className='animate-spin' />}
            {isEdit ? 'Update' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
