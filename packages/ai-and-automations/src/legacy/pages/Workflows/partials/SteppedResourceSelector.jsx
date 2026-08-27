import React, { useMemo, useEffect, useState, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, ChevronsUpDown, ShieldAlert, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { accountsApi } from '../../../api/accounts';
import { integrationsApi } from '../../../api/integrations';
import { UserContext } from '../../../context/User';

// ─────────────────────────────────────────────────────────────────────────────
// Per-platform required OAuth scopes. If the selected account's stored scopes
// don't cover these, the UI shows a "Grant permissions" banner that re-opens
// the provider's consent popup. The backend already requests the union of all
// provider scopes on a fresh connect (BuildConsentURLForAccount), so
// re-consenting upgrades the existing account row to cover every trigger.
// Must stay in sync with platforms/google/scopes.go etc.
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_REQUIRED_SCOPES = {
  // Google
  google_drive: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
  google_sheets: [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
  google_gmail: ['https://www.googleapis.com/auth/gmail.readonly'],
  google_calendar: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
  ],
  // Microsoft (space-delimited; stored the same way in account.scopes)
  microsoft_outlook: ['Mail.Read'],
  microsoft_onedrive: ['Files.Read.All'],
  microsoft_calendar: ['Calendars.Read'],
  microsoft_excel: ['Files.Read.All'],
};

const PLATFORM_TRIGGER_LABEL = {
  google_drive: 'Google Drive',
  google_sheets: 'Google Sheets',
  google_gmail: 'Gmail',
  google_calendar: 'Google Calendar',
  microsoft_outlook: 'Outlook',
  microsoft_onedrive: 'OneDrive',
  microsoft_calendar: 'Outlook Calendar',
  microsoft_excel: 'Microsoft Excel',
};

// Human-readable names for each scope. Used in the ScopeGate to explain
// exactly what permission is missing from the current account.
const SCOPE_LABELS = {
  // Google
  'https://www.googleapis.com/auth/drive.metadata.readonly': 'Drive — read file metadata',
  'https://www.googleapis.com/auth/drive.readonly': 'Drive — read files',
  'https://www.googleapis.com/auth/spreadsheets.readonly': 'Sheets — read spreadsheet contents',
  'https://www.googleapis.com/auth/gmail.readonly': 'Gmail — read messages',
  'https://www.googleapis.com/auth/calendar.readonly': 'Calendar — read calendars',
  'https://www.googleapis.com/auth/calendar.events.readonly': 'Calendar — read events',
  // Microsoft
  'Mail.Read': 'Outlook — read mail',
  'Files.Read.All': 'OneDrive — read files',
  'Calendars.Read': 'Outlook Calendar — read events',
  'User.Read': 'Profile — read user info',
};

function prettyScope(scope) {
  return SCOPE_LABELS[scope] || scope;
}

// Detect whether a backend step-fetch error looks like an auth / scope problem
// — token rejected, account not connected, missing scope — vs. a transient
// failure. When this returns true, the UI shows a Reconnect button inline.
function isAuthOrScopeError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('reconnect') ||
    msg.includes('insufficient') ||
    msg.includes('not connected') ||
    msg.includes('token') ||
    msg.includes('unauthorized') ||
    msg.includes('permission') ||
    msg.includes('scope') ||
    msg.includes('forbidden') ||
    msg.includes('401') ||
    msg.includes('403')
  );
}

// Inline reconnect CTA rendered inside a step's error card. Triggers the
// provider OAuth popup so the user can re-grant with the union scope set.
function InlineReconnectButton({ platform, className }) {
  const provider = platformToProvider(platform);
  const [userState] = useContext(UserContext);
  const userId = userState?.user?.id;
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'account-connected' && event.data?.provider === provider) {
        setConnecting(false);
        queryClient.invalidateQueries({ queryKey: ['connected-accounts', provider] });
        queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['stepped'] });
        toast.success('Permissions updated');
      } else if (event.data?.type === 'account-connect-error') {
        setConnecting(false);
        toast.error(`Grant failed: ${event.data.error || 'unknown'}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [provider, queryClient]);

  if (!provider) return null;

  return (
    <Button
      size='sm'
      variant='outline'
      className={`h-7 text-[11px] gap-1.5 border-destructive/40 ${className || ''}`}
      disabled={connecting || !userId}
      onClick={() => {
        if (!userId) { toast.error('Please log in first'); return; }
        setConnecting(true);
        window.open(accountsApi.connectUrl(provider, userId), '_blank', 'width=600,height=700');
      }}
    >
      {connecting ? <Loader2 size={11} className='animate-spin' /> : <ExternalLink size={11} />}
      Reconnect with new permissions
    </Button>
  );
}

function platformToProvider(platform) {
  if (!platform) return null;
  if (platform.startsWith('google_')) return 'google';
  if (platform.startsWith('microsoft_')) return 'microsoft';
  if (platform === 'github' || platform === 'jira') return platform;
  return null;
}

function parseScopeString(str) {
  if (!str) return new Set();
  return new Set(String(str).split(/\s+/).filter(Boolean));
}

function missingScopes(accountScopes, required) {
  if (!required || required.length === 0) return [];
  const have = parseScopeString(accountScopes);
  return required.filter((s) => !have.has(s));
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform-specific step definitions
// ─────────────────────────────────────────────────────────────────────────────
// Each platform defines an ordered list of steps. Each step has:
//   key       — the field name to store in resource values
//   label     — user-facing label
//   type      — 'select' | 'multiselect' | 'text' | 'number'
//   fetch     — (accountId, values) => Promise<Options>  for select/multiselect
//   options   — static options (alternative to fetch)
//   mapOption — map an API result item to { value, label, description? }
//   optional  — step can be skipped
//   placeholder — for text/number
//   dependsOn — keys this step depends on; step hidden until all are set
//   showWhen  — (values) => boolean — conditional visibility
//
// On change, the parent receives the full values object.

const STEPS = {
  github: [
    {
      key: 'owner',
      label: 'Organization',
      type: 'select',
      fetch: (accountId) => accountsApi.githubOrgs(accountId),
      mapOption: (o) => ({
        value: o.login,
        label: o.name || o.login,
        meta: { is_org: o.is_org },
      }),
    },
    {
      key: 'repo',
      label: 'Repository',
      type: 'select',
      dependsOn: ['owner'],
      fetch: (accountId, values) => {
        // We stored is_org in a parallel `_owner_is_org` field via sideEffect
        const isOrg = values._owner_is_org === true || values._owner_is_org === 'true';
        return accountsApi.githubRepos(accountId, values.owner, isOrg);
      },
      mapOption: (r) => ({
        value: r.name || r.Name,
        label: r.full_name || r.FullName || `${r.Owner}/${r.Name}`,
        description: r.description || r.Description,
      }),
    },
    {
      key: 'events',
      label: 'Events',
      type: 'multiselect',
      dependsOn: ['repo'],
      fetch: () => integrationsApi.githubEvents(),
      mapOption: (e) => ({
        value: e.name || e.Name,
        label: e.name || e.Name,
        description: e.description || e.Description,
        category: e.category || e.Category,
      }),
    },
  ],

  jira: [
    {
      key: 'cloud_id',
      label: 'Atlassian Site',
      type: 'select',
      fetch: (accountId) => accountsApi.jiraSites(accountId),
      mapOption: (s) => ({
        value: s.id || s.ID,
        label: s.name || s.Name,
        description: s.url || s.URL,
      }),
    },
    {
      key: 'project_key',
      label: 'Project',
      type: 'select',
      dependsOn: ['cloud_id'],
      fetch: (accountId, values) => accountsApi.jiraProjects(accountId, values.cloud_id),
      mapOption: (p) => ({
        value: p.key || p.Key,
        label: `${p.key || p.Key} — ${p.name || p.Name}`,
      }),
    },
    {
      key: 'events',
      label: 'Events',
      type: 'multiselect',
      dependsOn: ['project_key'],
      fetch: () => integrationsApi.jiraEvents(),
      mapOption: (e) => ({
        value: e.name || e.Name,
        label: e.name || e.Name,
        description: e.description || e.Description,
        category: e.category || e.Category,
      }),
    },
  ],

  google_drive: [
    {
      key: 'folder_id',
      label: 'Folder (optional — leave empty for all)',
      type: 'select',
      optional: true,
      fetch: (accountId) => accountsApi.googleDriveFolders(accountId),
      mapOption: (f) => ({ value: f.id || f.ID, label: f.name || f.Name }),
    },
    {
      key: 'event_filters',
      label: 'Event types',
      type: 'multiselect',
      options: [
        { value: 'added', label: 'Added', description: 'File added to watched folder' },
        { value: 'updated', label: 'Updated', description: 'File modified' },
        { value: 'deleted', label: 'Deleted', description: 'File removed' },
        { value: 'trashed', label: 'Trashed', description: 'File moved to trash' },
      ],
    },
  ],

  google_sheets: [
    {
      key: 'spreadsheet_id',
      label: 'Spreadsheet',
      type: 'select',
      fetch: (accountId) => accountsApi.googleSpreadsheets(accountId),
      mapOption: (s) => ({ value: s.id || s.ID, label: s.name || s.Name }),
    },
    {
      key: 'sheet_name',
      label: 'Sheet',
      type: 'select',
      dependsOn: ['spreadsheet_id'],
      fetch: (accountId, values) => accountsApi.googleSpreadsheetTabs(accountId, values.spreadsheet_id),
      mapOption: (t) => ({ value: t.name || t.Name, label: t.name || t.Name }),
    },
    {
      key: 'range',
      label: 'Range',
      type: 'text',
      placeholder: 'A:Z',
    },
  ],

  google_gmail: [
    {
      key: 'label_ids',
      label: 'Labels',
      type: 'multiselect',
      fetch: (accountId) => accountsApi.googleGmailLabels(accountId),
      mapOption: (l) => ({
        value: l.id || l.ID,
        label: l.name || l.Name,
        category: (l.type || l.Type) === 'system' ? 'System' : 'Custom',
      }),
    },
  ],

  google_calendar: [
    {
      key: 'calendar_id',
      label: 'Calendar',
      type: 'select',
      fetch: (accountId) => accountsApi.googleCalendars(accountId),
      mapOption: (c) => ({
        value: c.id || c.ID,
        label: c.summary || c.Summary,
        description: c.primary ? 'Primary calendar' : undefined,
      }),
    },
    {
      key: 'lookahead_seconds',
      label: 'Lookahead window (seconds)',
      type: 'number',
      placeholder: '900',
    },
  ],

  microsoft_outlook: [
    {
      key: 'folder_id',
      label: 'Mail folder',
      type: 'select',
      fetch: (accountId) => accountsApi.microsoftOutlookFolders(accountId),
      mapOption: (f) => ({
        value: f.displayName || f.DisplayName,
        label: f.displayName || f.DisplayName,
        description: (f.totalItemCount ?? f.TotalItemCount) ? `${f.totalItemCount || f.TotalItemCount} messages` : undefined,
      }),
    },
  ],

  microsoft_onedrive: [
    {
      key: 'folder_path',
      label: 'Folder (optional)',
      type: 'select',
      optional: true,
      fetch: (accountId) => accountsApi.microsoftOneDriveFolders(accountId),
      mapOption: (f) => ({
        value: f.path || f.Path || f.name || f.Name,
        label: f.name || f.Name,
      }),
    },
    {
      key: 'event_filters',
      label: 'Event types',
      type: 'multiselect',
      options: [
        { value: 'added', label: 'Added' },
        { value: 'updated', label: 'Updated' },
        { value: 'deleted', label: 'Deleted' },
      ],
    },
  ],

  microsoft_calendar: [
    {
      key: 'calendar_id',
      label: 'Calendar',
      type: 'select',
      fetch: (accountId) => accountsApi.microsoftCalendars(accountId),
      mapOption: (c) => ({
        value: c.id || c.ID,
        label: c.name || c.Name,
        description: (c.isDefaultCalendar || c.IsDefaultCalendar) ? 'Default calendar' : undefined,
      }),
    },
  ],

  microsoft_excel: [
    {
      key: 'drive_item_id',
      label: 'Excel file',
      type: 'select',
      fetch: (accountId) => accountsApi.microsoftExcelFiles(accountId),
      mapOption: (f) => ({ value: f.id || f.ID, label: f.name || f.Name }),
    },
    {
      key: 'worksheet_name',
      label: 'Worksheet',
      type: 'select',
      dependsOn: ['drive_item_id'],
      fetch: (accountId, values) => accountsApi.microsoftExcelWorksheets(accountId, values.drive_item_id),
      mapOption: (w) => ({ value: w.name || w.Name, label: w.name || w.Name }),
    },
    {
      key: 'range',
      label: 'Range',
      type: 'text',
      placeholder: 'A1:Z1000',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Single step renderer
// ─────────────────────────────────────────────────────────────────────────────

function SelectStep({ step, accountId, values, onChange, disabled }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stepped', accountId, step.key, ...(step.dependsOn || []).map((k) => values[k])],
    queryFn: () => step.fetch(accountId, values),
    enabled: !!accountId && !disabled && !!step.fetch,
    retry: false,
  });

  const items = useMemo(() => {
    if (step.options) return step.options;
    if (!Array.isArray(data)) return [];
    return data.map(step.mapOption);
  }, [data, step]);

  const handleSelect = (val) => {
    const item = items.find((i) => i.value === val);
    const updates = { [step.key]: val };
    // side-effect: GitHub owner step stores is_org alongside owner
    if (step.key === 'owner' && item?.meta) {
      updates._owner_is_org = item.meta.is_org;
    }
    onChange(updates);
  };

  return (
    <div className='space-y-1.5'>
      <Label className='text-[11px] font-medium'>
        {step.label}
        {!step.optional && <span className='text-destructive ml-1'>*</span>}
      </Label>
      <Select value={values[step.key] || ''} onValueChange={handleSelect} disabled={disabled || isLoading}>
        <SelectTrigger className='h-8 text-xs'>
          <SelectValue placeholder={
            isLoading ? 'Loading...' :
            error ? 'Failed to load' :
            items.length === 0 ? 'No items found' :
            `Select ${step.label.toLowerCase()}`
          } />
        </SelectTrigger>
        <SelectContent className='w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]'>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className='text-xs'>
              <div className='flex flex-col items-start min-w-0 max-w-full'>
                <span className='truncate max-w-full'>{item.label}</span>
                {item.description && (
                  <span className='text-[10px] text-muted-foreground truncate max-w-full'>{item.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <div className='rounded border border-destructive/30 bg-destructive/5 p-2 space-y-1.5'>
          <p className='text-[10px] font-semibold text-destructive'>
            Couldn&apos;t load {step.label.toLowerCase()}
          </p>
          <p className='text-[10px] text-destructive/80 mt-0.5 break-words'>
            {error.message || 'Failed to load options'}
          </p>
          {isAuthOrScopeError(error) && <InlineReconnectButton platform={step._platform} />}
        </div>
      )}
    </div>
  );
}

function MultiSelectStep({ step, accountId, values, onChange, disabled }) {
  const [open, setOpen] = React.useState(false);
  const selected = Array.isArray(values[step.key]) ? values[step.key] : [];

  const { data, error } = useQuery({
    queryKey: ['stepped', accountId, step.key, ...(step.dependsOn || []).map((k) => values[k])],
    queryFn: () => step.fetch(accountId, values),
    enabled: !!accountId && !disabled && !!step.fetch,
    retry: false,
  });

  const items = useMemo(() => {
    if (step.options) return step.options;
    if (!Array.isArray(data)) return [];
    return data.map(step.mapOption);
  }, [data, step]);

  const grouped = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      const cat = item.category || 'Options';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  const toggle = (val) => {
    const newSelected = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange({ [step.key]: newSelected });
  };

  return (
    <div className='space-y-1.5'>
      <Label className='text-[11px] font-medium'>
        {step.label}
        {!step.optional && <span className='text-destructive ml-1'>*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='w-full justify-between h-8 text-xs font-normal'
            disabled={disabled}
          >
            {selected.length > 0 ? `${selected.length} selected` : `Select ${step.label.toLowerCase()}`}
            <ChevronsUpDown size={12} className='ml-auto opacity-50 shrink-0' />
          </Button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-[var(--radix-popover-trigger-width)] p-0 max-h-[320px] overflow-y-auto'>
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className='px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/30 sticky top-0 z-10'>
                {cat}
              </div>
              {catItems.map((item) => {
                const checked = selected.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type='button'
                    className={`flex items-start gap-2 w-full text-left px-2 py-1.5 hover:bg-accent ${checked ? 'bg-accent/40' : ''}`}
                    onClick={() => toggle(item.value)}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border mt-0.5 ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                      {checked && <Check size={10} className='text-primary-foreground' />}
                    </span>
                    <span className='flex-1 min-w-0'>
                      <span className='text-xs leading-tight block'>{item.label}</span>
                      {item.description && (
                        <span className='text-[9px] text-muted-foreground leading-tight block'>{item.description}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div className='p-3 text-xs text-muted-foreground text-center'>No items available</div>
          )}
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className='flex flex-wrap gap-1'>
          {selected.map((v) => (
            <Badge
              key={v}
              variant='secondary'
              className='text-[10px] h-5 px-1.5 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive'
              onClick={() => toggle(v)}
            >
              {v}
              <span className='text-[8px] opacity-60'>×</span>
            </Badge>
          ))}
        </div>
      )}
      {error && (
        <div className='rounded border border-destructive/30 bg-destructive/5 p-2 space-y-1.5'>
          <p className='text-[10px] font-semibold text-destructive'>
            Couldn&apos;t load {step.label.toLowerCase()}
          </p>
          <p className='text-[10px] text-destructive/80 mt-0.5 break-words'>
            {error.message || 'Failed to load options'}
          </p>
          {isAuthOrScopeError(error) && <InlineReconnectButton platform={step._platform} />}
        </div>
      )}
    </div>
  );
}

function TextStep({ step, values, onChange, disabled }) {
  return (
    <div className='space-y-1.5'>
      <Label className='text-[11px] font-medium'>
        {step.label}
        {!step.optional && <span className='text-destructive ml-1'>*</span>}
      </Label>
      <Input
        type={step.type === 'number' ? 'number' : 'text'}
        placeholder={step.placeholder}
        value={values[step.key] ?? ''}
        onChange={(e) => onChange({ [step.key]: step.type === 'number' ? Number(e.target.value) : e.target.value })}
        className='h-8 text-xs'
        disabled={disabled}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

// ScopeGate — if the selected account's stored scopes don't cover the trigger's
// required scopes, render a banner with a "Grant permissions" button that
// re-opens the provider's OAuth popup. The backend's BuildConsentURLForAccount
// requests the union of all trigger scopes, so one re-consent covers every
// trigger on that provider. On success (postMessage account-connected), the
// accounts cache is invalidated so the updated scopes flow back in.
function ScopeGate({ platform, accountId, children }) {
  const queryClient = useQueryClient();
  const [userState] = useContext(UserContext);
  const userId = userState?.user?.id;
  const [connecting, setConnecting] = useState(false);

  const provider = platformToProvider(platform);
  const required = PLATFORM_REQUIRED_SCOPES[platform] || [];
  const triggerLabel = PLATFORM_TRIGGER_LABEL[platform] || platform;

  const { data: accounts } = useQuery({
    queryKey: ['connected-accounts', provider],
    queryFn: () => accountsApi.list(provider),
    enabled: !!provider,
  });

  const account = useMemo(
    () => (Array.isArray(accounts) ? accounts.find((a) => a.id === accountId) : null),
    [accounts, accountId],
  );

  const missing = useMemo(() => {
    if (!account || required.length === 0) return [];
    return missingScopes(account.scopes, required);
  }, [account, required]);

  // Listen for the OAuth popup callback — when the user finishes re-consenting,
  // refetch the accounts list so the updated scopes are picked up.
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'account-connected' && event.data?.provider === provider) {
        setConnecting(false);
        queryClient.invalidateQueries({ queryKey: ['connected-accounts', provider] });
        queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        toast.success('Permissions updated');
      } else if (event.data?.type === 'account-connect-error') {
        setConnecting(false);
        toast.error(`Grant failed: ${event.data.error || 'unknown'}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [provider, queryClient]);

  if (!provider || required.length === 0 || !account) return children;
  if (missing.length === 0) return children;

  const handleGrant = () => {
    if (!userId) {
      toast.error('Please log in first');
      return;
    }
    setConnecting(true);
    const url = accountsApi.connectUrl(provider, userId);
    window.open(url, '_blank', 'width=600,height=700');
  };

  const accountName = account.account_label || account.account_email || account.account_id;

  return (
    <div className='rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2.5'>
      <div className='flex items-start gap-2'>
        <ShieldAlert size={14} className='text-amber-500 mt-0.5 shrink-0' />
        <div className='flex-1 min-w-0 space-y-1'>
          <p className='text-[11px] font-semibold text-amber-700 dark:text-amber-400'>
            {triggerLabel} trigger can&apos;t use this account yet
          </p>
          <p className='text-[10px] text-muted-foreground leading-relaxed'>
            <span className='font-medium text-foreground'>{accountName}</span> hasn&apos;t granted
            {' '}the permissions this trigger needs. Re-authorize to add them.
          </p>
          <div className='pt-1'>
            <p className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
              Missing permissions
            </p>
            <ul className='space-y-0.5'>
              {missing.map((s) => (
                <li key={s} className='text-[10px] text-foreground flex items-start gap-1'>
                  <span className='text-amber-500 mt-px'>•</span>
                  <span className='break-all'>{prettyScope(s)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <Button
        size='sm'
        variant='outline'
        className='w-full h-8 text-xs gap-1.5 border-amber-500/40'
        onClick={handleGrant}
        disabled={connecting}
      >
        {connecting ? <Loader2 size={12} className='animate-spin' /> : <ExternalLink size={12} />}
        Grant {triggerLabel} access
      </Button>
    </div>
  );
}

export default function SteppedResourceSelector({ platform, accountId, value, onChange }) {
  const steps = STEPS[platform] || [];
  const values = value || {};

  const handleStepChange = (updates) => {
    onChange({ ...values, ...updates });
  };

  return (
    <ScopeGate platform={platform} accountId={accountId}>
      <div className='space-y-3'>
        {steps.map((step) => {
          const dependenciesMet = !step.dependsOn || step.dependsOn.every((k) => {
            const v = values[k];
            return v !== undefined && v !== '' && v !== null;
          });
          const show = dependenciesMet && (!step.showWhen || step.showWhen(values));
          if (!show) return null;

          // Inject _platform so step renderers can surface a provider-specific
          // reconnect button in their error card.
          const stepWithPlatform = { ...step, _platform: platform };
          if (step.type === 'multiselect') {
            return <MultiSelectStep key={step.key} step={stepWithPlatform} accountId={accountId} values={values} onChange={handleStepChange} />;
          }
          if (step.type === 'text' || step.type === 'number') {
            return <TextStep key={step.key} step={stepWithPlatform} values={values} onChange={handleStepChange} />;
          }
          return <SelectStep key={step.key} step={stepWithPlatform} accountId={accountId} values={values} onChange={handleStepChange} />;
        })}
      </div>
    </ScopeGate>
  );
}

// Check if all required steps are filled
export function isResourceComplete(platform, values) {
  const steps = STEPS[platform] || [];
  if (!values) return false;
  for (const step of steps) {
    if (step.optional) continue;
    // Check dependencies — if not met, this step is hidden, skip
    const dependenciesMet = !step.dependsOn || step.dependsOn.every((k) => {
      const v = values[k];
      return v !== undefined && v !== '' && v !== null;
    });
    if (!dependenciesMet) continue;
    const v = values[step.key];
    if (step.type === 'multiselect') {
      if (!Array.isArray(v) || v.length === 0) return false;
    } else {
      if (v === undefined || v === '' || v === null) return false;
    }
  }
  return true;
}
