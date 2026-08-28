import React, { useState, useCallback, useEffect, useMemo, useContext, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle, Copy, Settings2, Check, ExternalLink, Pencil, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import { integrationsApi } from '../../../api/integrations';
import { UserContext } from '../../../context/User';
import AccountSelector from './AccountSelector';
import SteppedResourceSelector, { isResourceComplete } from './SteppedResourceSelector';
import WhatsAppConnect from './WhatsAppConnect';
import InstagramConnect from './InstagramConnect';
import ThreadsConnect from './ThreadsConnect';
import {
  registerPendingTriggerSave,
  clearPendingTriggerSave,
} from '../../../helpers/triggerSaveRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Platform metadata
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORMS = {
  github: { label: 'GitHub', color: '#24292f', authType: 'account', provider: 'github' },
  jira: { label: 'Jira', color: '#0052CC', authType: 'account', provider: 'jira' },
  google_drive: { label: 'Google Drive', color: '#1FA463', authType: 'account', provider: 'google' },
  google_sheets: { label: 'Google Sheets', color: '#0F9D58', authType: 'account', provider: 'google' },
  google_gmail: { label: 'Gmail', color: '#EA4335', authType: 'account', provider: 'google' },
  google_calendar: { label: 'Google Calendar', color: '#4285F4', authType: 'account', provider: 'google' },
  microsoft_outlook: { label: 'Outlook', color: '#0078D4', authType: 'account', provider: 'microsoft' },
  microsoft_onedrive: { label: 'OneDrive', color: '#0078D4', authType: 'account', provider: 'microsoft' },
  microsoft_calendar: { label: 'Outlook Calendar', color: '#0078D4', authType: 'account', provider: 'microsoft' },
  microsoft_excel: { label: 'Microsoft Excel', color: '#217346', authType: 'account', provider: 'microsoft' },
  slack: {
    label: 'Slack',
    color: '#4A154B',
    authType: 'config',
    configFields: [
      { key: 'signing_secret', label: 'Signing Secret', placeholder: 'Your Slack app signing secret', secret: true },
    ],
  },
  telegram: {
    label: 'Telegram',
    color: '#26A5E4',
    authType: 'config',
    configFields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: '123456:ABC-...', secret: true },
    ],
  },
  discord: {
    label: 'Discord',
    color: '#5865F2',
    authType: 'config',
    configFields: [
      { key: 'public_key', label: 'Public Key', placeholder: 'Ed25519 public key' },
      { key: 'application_id', label: 'Application ID', placeholder: 'Discord application ID' },
    ],
  },
  whatsapp: {
    label: 'WhatsApp',
    color: '#25D366',
    // Rendered by WhatsAppConnect — handles Embedded Signup + manual fallback
    // + resource persistence inline. Bypasses the generic account/config flows.
    authType: 'embedded_signup',
  },
  instagram: {
    label: 'Instagram',
    color: '#DD2A7B',
    // Rendered by InstagramConnect — FB Login with Instagram scopes + account
    // picker + manual fallback.
    authType: 'instagram_oauth',
  },
  threads: {
    label: 'Threads',
    color: '#000000',
    // Rendered by ThreadsConnect — threads.net OAuth popup + manual fallback.
    authType: 'threads_oauth',
  },
};

// Parse integration config (JSON string) → resource values object
function extractResourceValues(platform, config) {
  if (!config) return {};
  switch (platform) {
    case 'github':
      return {
        owner: config.repo_owner,
        _owner_is_org: undefined, // can't know from config alone; select step will refresh
        repo: config.repo_name,
        events: config.events || [],
      };
    case 'jira':
      return {
        cloud_id: config.cloud_id,
        project_key: config.project_key,
        events: config.events || [],
      };
    case 'google_drive':
    case 'microsoft_onedrive':
      return {
        folder_id: config.folder_id,
        folder_path: config.folder_path,
        event_filters: config.event_filters || [],
      };
    case 'google_sheets':
      return {
        spreadsheet_id: config.spreadsheet_id,
        sheet_name: config.sheet_name,
        range: config.range,
      };
    case 'google_gmail':
      return {
        label_ids: config.label_ids || [],
      };
    case 'google_calendar':
    case 'microsoft_calendar':
      return {
        calendar_id: config.calendar_id,
        lookahead_seconds: config.lookahead_seconds,
      };
    case 'microsoft_outlook':
      return {
        folder_id: config.folder_id,
      };
    case 'microsoft_excel':
      return {
        drive_item_id: config.drive_item_id,
        worksheet_name: config.worksheet_name,
        range: config.range,
      };
    default:
      return {};
  }
}

// Convert resource values → integration config payload
function resourceValuesToConfig(platform, values) {
  switch (platform) {
    case 'jira':
      return {
        cloud_id: values.cloud_id,
        project_key: values.project_key,
        jql_filter: values.project_key ? `project = ${values.project_key}` : '',
        events: values.events || [],
      };
    case 'google_drive':
    case 'microsoft_onedrive':
      return {
        folder_id: values.folder_id || '',
        folder_path: values.folder_path || '',
        event_filters: values.event_filters || [],
      };
    case 'google_sheets':
      return {
        spreadsheet_id: values.spreadsheet_id,
        sheet_name: values.sheet_name,
        range: values.range || 'A:Z',
        poll_interval_sec: 60,
      };
    case 'google_gmail':
      return { label_ids: values.label_ids || [] };
    case 'google_calendar':
    case 'microsoft_calendar':
      return {
        calendar_id: values.calendar_id,
        lookahead_seconds: Number(values.lookahead_seconds) || 900,
      };
    case 'microsoft_outlook':
      return { folder_id: values.folder_id };
    case 'microsoft_excel':
      return {
        drive_item_id: values.drive_item_id,
        worksheet_name: values.worksheet_name || 'Sheet1',
        range: values.range || 'A1:Z1000',
        poll_interval_sec: 60,
      };
    default:
      return values;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AppTriggerSetup({ workflowId, nodeData }) {
  const queryClient = useQueryClient();
  const [userState] = useContext(UserContext);
  const userId = userState?.user?.id;

  const platform = nodeData?.parameters?.platform || 'github';
  const platformMeta = PLATFORMS[platform] || PLATFORMS.github;
  const usesAccount = platformMeta.authType === 'account';

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [resourceValues, setResourceValues] = useState({});
  const [configValues, setConfigValues] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Look up existing integration for this workflow + platform
  const { data: rawIntegration, isLoading: integrationLoading, refetch: refetchIntegration } = useQuery({
    queryKey: ['integration-by-workflow', workflowId, platform],
    queryFn: () => integrationsApi.byWorkflow(workflowId, platform),
    enabled: !!workflowId,
    retry: false,
  });

  const integration = useMemo(() => {
    if (!rawIntegration) return null;
    let config = rawIntegration.config;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch { config = {}; }
    }
    return { ...rawIntegration, config: config || {} };
  }, [rawIntegration]);

  const integrationId = integration?.id;

  // Hydrate state from existing integration
  useEffect(() => {
    if (!integration) return;
    if (integration.account_id) setSelectedAccountId(integration.account_id);
    if (usesAccount) {
      setResourceValues(extractResourceValues(platform, integration.config));
    } else {
      setConfigValues(integration.config || {});
    }
  }, [integration?.id]); // eslint-disable-line

  // Listen for OAuth popup callbacks (both account-connected and integration-oauth-done)
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'account-connected' || event.data?.type === 'integration-oauth-done') {
        refetchIntegration();
        queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        if (event.data?.accountId) setSelectedAccountId(event.data.accountId);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [refetchIntegration, queryClient]);

  // ── Pending-save registration ──────────────────────────────────────────────
  // Trigger setup (create/update integration + register webhook) is deferred
  // until the workflow itself is saved or deployed. We publish a save function
  // keyed by workflowId+platform into a shared registry; WorkflowStudio's
  // save/deploy handlers flush the registry after the workflow persist.

  // Snapshot latest state into refs so the registered closure always runs
  // against current values (the registry holds the fn across renders).
  const stateRef = useRef({
    selectedAccountId: '',
    resourceValues: {},
    configValues: {},
    integrationId: null,
  });
  stateRef.current = {
    selectedAccountId,
    resourceValues,
    configValues,
    integrationId,
  };

  const doTriggerSave = useCallback(async () => {
    const snap = stateRef.current;
    // Nothing to do — config-based platform without any field set, or
    // account-based platform without a complete resource picked.
    if (!usesAccount) {
      const hasAllFields = (platformMeta.configFields || []).every((f) => snap.configValues[f.key]);
      if (!hasAllFields) return;
      try {
        // config is sent as an object, not a JSON string. The control plane
        // stores it as jsonb and merges partial updates into it; a string would
        // be stored as a JSON string and every later merge would refuse it.
        const data = await integrationsApi.create({
          workflow_id: workflowId,
          integration_name: platform,
          config: snap.configValues,
        });
        const newId = data?.integration?.id || data?.id;
        await integrationsApi.activate(newId, true);
        queryClient.invalidateQueries({ queryKey: ['integration-by-workflow', workflowId, platform] });
      } catch (err) {
        toast.error(`${platformMeta.label} setup failed: ${err.message}`);
        throw err;
      }
      return;
    }

    if (!snap.selectedAccountId || !isResourceComplete(platform, snap.resourceValues)) return;

    try {
      const config = resourceValuesToConfig(platform, snap.resourceValues);
      let newId;
      if (snap.integrationId) {
        await integrationsApi.update(snap.integrationId, {
          account_id: snap.selectedAccountId,
          config,
        });
        newId = snap.integrationId;
      } else {
        const data = await integrationsApi.create({
          workflow_id: workflowId,
          integration_name: platform,
          account_id: snap.selectedAccountId || undefined,
          config,
        });
        newId = data?.integration?.id || data?.id;
      }

      // Activation is what registers the webhook or opens the push channel, for
      // every platform that has one. There is no longer a per-platform setup
      // call: GitHub's hook and Jira's dynamic webhook are created from the
      // config saved above, by the same activate that turns the row on. The
      // control plane refuses to mark a row active if that registration fails,
      // so an integration cannot report as working while receiving nothing.
      if (snap.selectedAccountId) {
        await integrationsApi.activate(newId, true);
      }

      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['integration-by-workflow', workflowId, platform] });
    } catch (err) {
      toast.error(`${platformMeta.label} setup failed: ${err.message}`);
      throw err;
    }
  }, [workflowId, platform, platformMeta.label, platformMeta.configFields, usesAccount, queryClient]);

  // Publish/clear our pending save whenever the workflow or platform changes.
  useEffect(() => {
    if (!workflowId || !platform) return undefined;
    registerPendingTriggerSave(workflowId, platform, doTriggerSave);
    return () => clearPendingTriggerSave(workflowId, platform);
  }, [workflowId, platform, doTriggerSave]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (integrationLoading) {
    return (
      <div className='flex items-center justify-center py-4'>
        <Loader2 size={16} className='animate-spin text-muted-foreground' />
      </div>
    );
  }

  // Prefer the new is_active boolean; fall back to legacy status string for
  // compatibility with any backend version that predates that column.
  const isActive =
    integration?.is_active === true || integration?.status === 'active';
  const webhookUrl = integration
    ? `${window.location.origin}/webhook/custom/${integration.id}/${integration.workflow_version || 0}/${platform}`
    : '';

  // WhatsApp — Embedded Signup flow rendered by its own component.
  // Setup is persisted directly by the WhatsApp backend endpoints, so we
  // skip the pending-save registry and just refetch on completion.
  if (platform === 'whatsapp') {
    return (
      <WhatsAppConnect
        integrationId={integrationId}
        integration={integration}
        workflowId={workflowId}
        onConnected={refetchIntegration}
      />
    );
  }

  if (platform === 'instagram') {
    return (
      <InstagramConnect
        integrationId={integrationId}
        integration={integration}
        workflowId={workflowId}
        onConnected={refetchIntegration}
      />
    );
  }

  if (platform === 'threads') {
    return (
      <ThreadsConnect
        integrationId={integrationId}
        integration={integration}
        workflowId={workflowId}
        onConnected={refetchIntegration}
      />
    );
  }

  // Config-based platforms (Slack, Telegram, Discord)
  if (!usesAccount) {
    if (isActive && !isEditing) {
      return (
        <div className='space-y-3'>
          <div className='rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3'>
            <div className='flex items-center gap-2'>
              <Check size={12} className='text-emerald-500' />
              <span className='text-[11px] font-medium text-emerald-600'>{platformMeta.label} is active</span>
            </div>
          </div>
          {webhookUrl && (
            <div className='space-y-1'>
              <Label className='text-[10px] uppercase tracking-wider text-muted-foreground'>Webhook URL</Label>
              <div className='flex items-center gap-1.5 rounded-lg border bg-muted/30 pl-2.5 pr-1 py-1'>
                <code className='flex-1 text-[10px] font-mono break-all select-all'>{webhookUrl}</code>
                <Button variant='ghost' size='icon' className='h-6 w-6' onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success('Webhook URL copied');
                }}>
                  <Copy size={11} />
                </Button>
              </div>
            </div>
          )}
          <Button variant='outline' size='sm' className='w-full text-xs h-8 gap-1.5' onClick={() => {
            setConfigValues(integration.config || {});
            setIsEditing(true);
          }}>
            <Settings2 size={12} /> Edit configuration
          </Button>
        </div>
      );
    }

    return (
      <div className='space-y-3'>
        {!isActive && (
          <div className='rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3'>
            <div className='flex items-center gap-2'>
              <AlertCircle size={12} className='text-amber-500' />
              <span className='text-[11px] font-medium text-amber-600'>Not connected</span>
            </div>
          </div>
        )}
        {(platformMeta.configFields || []).map((field) => (
          <div key={field.key} className='space-y-1'>
            <Label className='text-[11px] font-medium'>{field.label}</Label>
            <Input
              type={field.secret ? 'password' : 'text'}
              placeholder={field.placeholder}
              value={configValues[field.key] || ''}
              onChange={(e) => setConfigValues((p) => ({ ...p, [field.key]: e.target.value }))}
              className='h-8 text-xs'
            />
          </div>
        ))}
        {isEditing && (
          <Button variant='outline' size='sm' className='w-full text-xs h-8' onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        )}
        <TriggerSaveNotice platformLabel={platformMeta.label} />
      </div>
    );
  }

  // Account-based platforms (GitHub, Google, Microsoft, Jira) — stepped flow
  const canSave = !!selectedAccountId && isResourceComplete(platform, resourceValues);

  // Live/Active display
  if (isActive && !isEditing) {
    return (
      <div className='space-y-3'>
        <div className='relative overflow-hidden rounded-xl border bg-card'>
          <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent' />
          <div className='p-3'>
            <div className='flex items-center gap-2 mb-2'>
              <span className='text-[11px] font-semibold'>{platformMeta.label}</span>
              <span className='inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-px'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
                <span className='text-[9px] font-medium text-emerald-600 uppercase tracking-wider'>Live</span>
              </span>
            </div>
            <ActiveSummary platform={platform} integration={integration} />
          </div>
        </div>
        {webhookUrl && platform !== 'google_drive' && platform !== 'google_sheets' && platform !== 'google_gmail' && platform !== 'google_calendar' && platform !== 'microsoft_excel' && (
          <div className='space-y-1.5'>
            <Label className='text-[9px] font-semibold text-muted-foreground uppercase tracking-widest'>Webhook URL</Label>
            <div className='flex items-center gap-1.5 rounded-lg border bg-muted/30 pl-2.5 pr-1 py-1'>
              <code className='flex-1 text-[10px] font-mono break-all select-all'>{webhookUrl}</code>
              <Button variant='ghost' size='icon' className='h-6 w-6' onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast.success('Webhook URL copied');
              }}>
                <Copy size={11} />
              </Button>
            </div>
          </div>
        )}
        <Button variant='outline' size='sm' className='w-full text-xs h-8 gap-1.5' onClick={() => setIsEditing(true)}>
          <Pencil size={12} /> Edit configuration
        </Button>
      </div>
    );
  }

  // Setup / Edit mode
  return (
    <div className='space-y-3'>
      {isEditing && (
        <div className='rounded-lg border bg-blue-500/5 border-blue-500/20 p-2.5'>
          <div className='flex items-center gap-2'>
            <Check size={12} className='text-blue-500' />
            <span className='text-[11px] font-medium text-blue-600'>Editing {platformMeta.label} integration</span>
          </div>
        </div>
      )}

      {!isActive && !isEditing && (
        <div className='rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3'>
          <p className='text-[10px] text-muted-foreground leading-relaxed'>
            Connect your {platformMeta.label} account and select a resource to configure this trigger.
          </p>
        </div>
      )}

      {/* Step 1: Account */}
      <AccountSelector
        provider={platformMeta.provider}
        userId={userId}
        value={selectedAccountId}
        onChange={setSelectedAccountId}
      />

      {/* Step 2+: Resource steps (only shown when account is selected) */}
      {selectedAccountId && (
        <SteppedResourceSelector
          platform={platform}
          accountId={selectedAccountId}
          value={resourceValues}
          onChange={setResourceValues}
        />
      )}

      {/* Cancel (edit mode only) */}
      {isEditing && (
        <Button
          variant='outline'
          size='sm'
          className='w-full text-xs h-8'
          onClick={() => {
            setIsEditing(false);
            if (integration) {
              setSelectedAccountId(integration.account_id || '');
              setResourceValues(extractResourceValues(platform, integration.config));
            }
          }}
        >
          Cancel
        </Button>
      )}
      <TriggerSaveNotice platformLabel={platformMeta.label} dimmed={!canSave} />
    </div>
  );
}

// Inline notice shown where the old Setup Trigger / Save Changes button
// used to live. Explains that the trigger is pending until the workflow save.
function TriggerSaveNotice({ platformLabel, dimmed = false }) {
  return (
    <div
      className={`rounded-md border border-dashed bg-muted/20 px-2.5 py-2 flex items-start gap-2 ${
        dimmed ? 'opacity-60' : ''
      }`}
    >
      <Info size={12} className='text-muted-foreground mt-0.5 shrink-0' />
      <p className='text-[10px] leading-relaxed text-muted-foreground'>
        {platformLabel} will be activated when you click <span className='font-semibold text-foreground'>Save</span>
        {' '}or <span className='font-semibold text-foreground'>Deploy</span> on the workflow.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActiveSummary — shows current integration config in live view
// ─────────────────────────────────────────────────────────────────────────────

function ActiveSummary({ platform, integration }) {
  const cfg = integration?.config || {};
  switch (platform) {
    case 'github':
      return (
        <div className='flex flex-col gap-1'>
          {cfg.repo_owner && cfg.repo_name && (
            <a
              href={`https://github.com/${cfg.repo_owner}/${cfg.repo_name}`}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground'
            >
              {cfg.repo_owner}/{cfg.repo_name}
              <ExternalLink size={9} className='opacity-60' />
            </a>
          )}
          <div className='flex flex-wrap gap-1 mt-1'>
            {(cfg.events || []).map((e) => (
              <Badge key={e} variant='outline' className='text-[10px] h-4 px-1.5 font-mono'>{e}</Badge>
            ))}
          </div>
        </div>
      );
    case 'jira':
      return (
        <div className='flex flex-col gap-1 text-[11px]'>
          {cfg.domain && <span className='text-muted-foreground'>Site: {cfg.domain}</span>}
          {cfg.project_key && <span className='text-muted-foreground'>Project: {cfg.project_key}</span>}
          <div className='flex flex-wrap gap-1 mt-1'>
            {(cfg.events || []).map((e) => (
              <Badge key={e} variant='outline' className='text-[10px] h-4 px-1.5 font-mono'>{e}</Badge>
            ))}
          </div>
        </div>
      );
    case 'google_sheets':
      return (
        <div className='text-[11px] text-muted-foreground'>
          {cfg.spreadsheet_id && <div>Spreadsheet: <code className='font-mono'>{cfg.spreadsheet_id}</code></div>}
          {cfg.sheet_name && <div>Sheet: {cfg.sheet_name}</div>}
          {cfg.range && <div>Range: <code className='font-mono'>{cfg.range}</code></div>}
        </div>
      );
    case 'google_drive':
      return (
        <div className='text-[11px] text-muted-foreground'>
          {cfg.folder_id ? <div>Folder: <code className='font-mono'>{cfg.folder_id}</code></div> : <div>All accessible files</div>}
          <div className='flex flex-wrap gap-1 mt-1'>
            {(cfg.event_filters || []).map((e) => (
              <Badge key={e} variant='outline' className='text-[10px] h-4 px-1.5'>{e}</Badge>
            ))}
          </div>
        </div>
      );
    case 'google_gmail':
      return (
        <div className='flex flex-wrap gap-1'>
          {(cfg.label_ids || []).map((l) => (
            <Badge key={l} variant='outline' className='text-[10px] h-4 px-1.5'>{l}</Badge>
          ))}
        </div>
      );
    case 'google_calendar':
    case 'microsoft_calendar':
      return (
        <div className='text-[11px] text-muted-foreground'>
          {cfg.calendar_id && <div>Calendar: <code className='font-mono'>{cfg.calendar_id}</code></div>}
        </div>
      );
    case 'microsoft_outlook':
      return (
        <div className='text-[11px] text-muted-foreground'>
          {cfg.folder_id && <div>Folder: {cfg.folder_id}</div>}
        </div>
      );
    case 'microsoft_onedrive':
      return (
        <div className='text-[11px] text-muted-foreground'>
          {cfg.folder_path ? <div>Folder: <code className='font-mono'>{cfg.folder_path}</code></div> : <div>All files</div>}
        </div>
      );
    case 'microsoft_excel':
      return (
        <div className='text-[11px] text-muted-foreground'>
          {cfg.drive_item_id && <div>File: <code className='font-mono'>{cfg.drive_item_id}</code></div>}
          {cfg.worksheet_name && <div>Sheet: {cfg.worksheet_name}</div>}
          {cfg.range && <div>Range: <code className='font-mono'>{cfg.range}</code></div>}
        </div>
      );
    default:
      return null;
  }
}
