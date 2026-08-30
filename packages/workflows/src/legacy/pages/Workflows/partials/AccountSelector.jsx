import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, ExternalLink } from 'lucide-react';
import { SiGithub, SiGoogle, SiJira } from 'react-icons/si';
import { BsMicrosoft } from 'react-icons/bs';
import { toast } from 'react-toastify';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { accountsApi } from '../../../api/accounts';
import { integrationsApi } from '../../../api/integrations';

const PROVIDER_META = {
  github: { label: 'GitHub', icon: SiGithub, color: '#24292f' },
  google: { label: 'Google', icon: SiGoogle, color: '#4285F4' },
  microsoft: { label: 'Microsoft', icon: BsMicrosoft, color: '#0078D4' },
  jira: { label: 'Jira', icon: SiJira, color: '#0052CC' },
};

// GitHub's avatar endpoint redirects <username>.png to the user's avatar image.
// Used as a fallback when the ConnectedAccount row doesn't have an avatar_url
// stored yet (pre-migration accounts).
function githubAvatarUrl(username) {
  if (!username) return null;
  return `https://github.com/${encodeURIComponent(username)}.png?size=48`;
}

// AccountAvatar — renders the stored provider avatar URL (populated during
// the OAuth callback), falling back to GitHub's URL-pattern avatar for legacy
// GitHub rows, and finally to the provider icon.
function AccountAvatar({ provider, account, size = 14, fallbackIcon: FallbackIcon, fallbackColor }) {
  const [errored, setErrored] = React.useState(false);
  let src = null;
  if (!errored) {
    if (account?.avatar_url) {
      src = account.avatar_url;
    } else if (provider === 'github') {
      src = githubAvatarUrl(account?.account_id || account?.account_label);
    }
  }
  if (src) {
    return (
      <img
        src={src}
        alt=''
        width={size}
        height={size}
        className='rounded-full shrink-0 object-cover'
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    );
  }
  if (FallbackIcon) return <FallbackIcon size={size} style={{ color: fallbackColor }} />;
  return null;
}

// Provider "manage permissions" URLs — where the user reviews/revokes the
// OAuth app's scopes on the provider's side.
function getProviderConfigureUrl(provider) {
  switch (provider) {
    case 'github':
      return integrationsApi.githubManageUrl();
    case 'google':
      return 'https://myaccount.google.com/permissions';
    case 'microsoft':
      return 'https://myaccount.microsoft.com/privacy#apps-and-services';
    case 'jira':
      return 'https://id.atlassian.com/manage-profile/apps';
    default:
      return null;
  }
}

/**
 * AccountSelector — reusable dropdown for picking a connected account for a
 * given provider. Shows existing accounts + "Connect new account" option.
 *
 * Props:
 *   - provider: 'github' | 'google' | 'microsoft' | 'jira'
 *   - userId: current user's ID (needed for OAuth connect URL)
 *   - value: selected account ID
 *   - onChange: (accountId: string) => void
 *   - label: optional custom label (default: "Account")
 */
export default function AccountSelector({ provider, userId, value, onChange, label }) {
  const queryClient = useQueryClient();
  const meta = PROVIDER_META[provider] || {};
  const ProviderIcon = meta.icon;
  const [connecting, setConnecting] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['connected-accounts', provider],
    queryFn: () => accountsApi.list(provider),
    enabled: !!provider,
  });

  const accountList = Array.isArray(accounts) ? accounts : [];

  // Auto-select first account if none selected and accounts exist
  useEffect(() => {
    if (!value && accountList.length > 0) {
      onChange(accountList[0].id);
    }
  }, [accountList, value, onChange]);

  // Listen for OAuth popup callback
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'account-connected' && event.data?.provider === provider) {
        setConnecting(false);
        queryClient.invalidateQueries({ queryKey: ['connected-accounts', provider] });
        queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        if (event.data.accountId) {
          onChange(event.data.accountId);
        }
        toast.success(`${meta.label || provider} account connected`);
      } else if (event.data?.type === 'account-connect-error') {
        setConnecting(false);
        toast.error(`Connect failed: ${event.data.error || 'unknown'}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [provider, queryClient, onChange, meta.label]);

  const handleConnect = useCallback(() => {
    setConnecting(true);
    accountsApi.connect(provider).catch((error) => {
      setConnecting(false);
      toast.error(`Could not start the ${provider} connection: ${error.message}`);
    });
  }, [provider]);

  const configureUrl = getProviderConfigureUrl(provider);

  const handleSelectChange = useCallback((val) => {
    if (val === '__connect_new__') {
      handleConnect();
      return;
    }
    if (val === '__configure_permissions__') {
      if (configureUrl) {
        window.open(configureUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    onChange(val);
  }, [handleConnect, onChange, configureUrl]);

  // No accounts yet — show Connect button
  if (!isLoading && accountList.length === 0) {
    return (
      <div className='space-y-1.5'>
        <Label className='text-[11px] font-medium'>{label || `${meta.label || provider} Account`}</Label>
        <Button
          variant='outline'
          size='sm'
          className='w-full text-xs h-8 gap-1.5'
          onClick={handleConnect}
          disabled={connecting}
          style={{ borderColor: `${meta.color}40` }}
        >
          {connecting ? (
            <Loader2 size={12} className='animate-spin' />
          ) : ProviderIcon ? (
            <ProviderIcon size={13} style={{ color: meta.color }} />
          ) : null}
          Connect {meta.label || provider}
        </Button>
        <p className='text-[10px] text-muted-foreground'>
          One-click connect, no client secrets needed
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-1.5'>
      <Label className='text-[11px] font-medium'>{label || `${meta.label || provider} Account`}</Label>
      <Select value={value || ''} onValueChange={handleSelectChange}>
        <SelectTrigger className='h-8 text-xs'>
          <SelectValue placeholder={isLoading ? 'Loading accounts...' : 'Select account'} />
        </SelectTrigger>
        <SelectContent className='w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]'>
          {accountList.map((account) => (
            <SelectItem key={account.id} value={account.id} className='text-xs'>
              <span className='flex items-center gap-1.5 min-w-0'>
                <AccountAvatar
                  provider={provider}
                  account={account}
                  size={16}
                  fallbackIcon={ProviderIcon}
                  fallbackColor={meta.color}
                />
                <span className='truncate'>{account.account_label || account.account_email}</span>
              </span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value='__connect_new__' className='text-xs'>
            <span className='flex items-center gap-1.5 text-primary'>
              <Plus size={12} />
              Connect new account
            </span>
          </SelectItem>
          {configureUrl && (
            <SelectItem value='__configure_permissions__' className='text-xs'>
              <span className='flex items-center gap-1.5 text-muted-foreground'>
                <ExternalLink size={12} />
                Configure permissions
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
