import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, AlertCircle, KeyRound } from 'lucide-react';
import { SiInstagram } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-toastify';
import { integrationsApi } from '../../../api/integrations';

// ─────────────────────────────────────────────────────────────────────────────
// Facebook JS SDK loader — shared shape with WhatsAppConnect, but kept local
// so the two flows can evolve independently. The SDK singleton is shared
// across the page, so double-loading is harmless.
// ─────────────────────────────────────────────────────────────────────────────

let fbSDKLoadPromise = null;

function loadFacebookSDK(appId) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.FB) return Promise.resolve(window.FB);
  if (fbSDKLoadPromise) return fbSDKLoadPromise;

  fbSDKLoadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      });
      resolve(window.FB);
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.body.appendChild(script);
  });
  return fbSDKLoadPromise;
}

export default function InstagramConnect({ integrationId, integration, workflowId, onConnected }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('oauth'); // 'oauth' | 'manual' | 'picker'
  const [connecting, setConnecting] = useState(false);
  const [resolvedId, setResolvedId] = useState(integrationId || null);
  const [accounts, setAccounts] = useState([]);
  const userTokenRef = useRef(null);

  const [manual, setManual] = useState({
    ig_user_id: '',
    page_id: '',
    page_access_token: '',
    username: '',
    verify_token: '',
  });

  const ensureIntegration = async () => {
    if (resolvedId) return resolvedId;
    if (!workflowId) throw new Error('Save the workflow first so Instagram can be linked');
    const created = await integrationsApi.create({
      workflow_id: workflowId,
      integration_name: 'instagram',
      config: '{}',
    });
    const newId = created?.integration?.id || created?.id;
    if (!newId) throw new Error('Failed to create Instagram integration');
    setResolvedId(newId);
    queryClient.invalidateQueries({ queryKey: ['integration-by-workflow', workflowId, 'instagram'] });
    return newId;
  };

  const { data: bootstrap, isLoading: bootstrapLoading, error: bootstrapError } = useQuery({
    queryKey: ['instagram-bootstrap'],
    queryFn: integrationsApi.instagramBootstrap,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  const oauthAvailable = !!bootstrap?.app_id;

  useEffect(() => {
    if (bootstrapError || (bootstrap && !oauthAvailable)) {
      setMode('manual');
    }
  }, [bootstrap, bootstrapError, oauthAvailable]);

  const launchOAuth = async () => {
    setConnecting(true);
    try {
      await ensureIntegration();
    } catch (err) {
      toast.error(err.message || String(err));
      setConnecting(false);
      return;
    }
    try {
      const FB = await loadFacebookSDK(bootstrap.app_id);
      FB.login(
        (response) => {
          (async () => {
            try {
              if (response?.authResponse?.code) {
                const { user_access_token, accounts: list } =
                  await integrationsApi.instagramListAccounts({
                    code: response.authResponse.code,
                    redirect_uri: bootstrap.redirect_uri,
                  });
                userTokenRef.current = user_access_token;
                if (!list || list.length === 0) {
                  throw new Error(
                    'No Instagram Business accounts found for this Facebook user. Connect a Facebook Page with an Instagram Business/Creator account, then try again.'
                  );
                }
                setAccounts(list);
                setMode('picker');
              } else if (response?.status === 'unknown') {
                // user closed popup — treat as cancel
              } else {
                throw new Error(response?.authResponse?.error_message || 'Login did not complete');
              }
            } catch (err) {
              toast.error(err.message || String(err));
            } finally {
              setConnecting(false);
            }
          })();
        },
        {
          scope: (bootstrap.scopes || []).join(','),
          response_type: 'code',
          override_default_response_type: true,
        }
      );
    } catch (err) {
      toast.error(err.message || String(err));
      setConnecting(false);
    }
  };

  const pickAccount = async (account) => {
    if (!userTokenRef.current) {
      toast.error('Session expired — please retry connection');
      setMode('oauth');
      return;
    }
    setConnecting(true);
    try {
      const id = await ensureIntegration();
      await integrationsApi.instagramOAuthFinish(id, {
        user_access_token: userTokenRef.current,
        ig_user_id: account.id,
        page_id: account.page_id,
        username: account.username,
      });
      toast.success(`Instagram connected as @${account.username}`);
      queryClient.invalidateQueries({ queryKey: ['integration-by-workflow'] });
      onConnected?.();
    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setConnecting(false);
    }
  };

  const submitManual = async () => {
    if (!manual.ig_user_id || !manual.page_id || !manual.page_access_token) {
      toast.error('IG user ID, page ID, and page access token are required');
      return;
    }
    setConnecting(true);
    try {
      const id = await ensureIntegration();
      await integrationsApi.instagramManualSetup(id, manual);
      toast.success('Instagram connected');
      queryClient.invalidateQueries({ queryKey: ['integration-by-workflow'] });
      onConnected?.();
    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setConnecting(false);
    }
  };

  const cfg = integration?.config || {};
  const isConnected = !!(cfg.ig_user_id && cfg.page_access_token);

  if (isConnected) {
    return (
      <div className='space-y-2'>
        <div className='rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3'>
          <div className='flex items-center gap-2'>
            <Check size={12} className='text-emerald-500' />
            <span className='text-[11px] font-medium text-emerald-600'>Instagram connected</span>
          </div>
          <div className='mt-2 space-y-0.5 text-[10px] font-mono text-muted-foreground'>
            {cfg.username && <div>@{cfg.username}</div>}
            <div>IG ID: {cfg.ig_user_id}</div>
            {cfg.page_id && <div>Page: {cfg.page_id}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {!workflowId && !resolvedId && (
        <div className='rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3'>
          <div className='flex items-center gap-2'>
            <AlertCircle size={12} className='text-amber-500' />
            <span className='text-[11px] font-medium text-amber-600'>
              Save the workflow first to enable connect
            </span>
          </div>
        </div>
      )}

      {mode === 'oauth' && (
        <div className='space-y-2'>
          <Button
            size='sm'
            className='w-full h-9 gap-2 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white'
            disabled={(!workflowId && !resolvedId) || connecting || bootstrapLoading || !oauthAvailable}
            onClick={launchOAuth}
          >
            {connecting || bootstrapLoading ? (
              <Loader2 size={14} className='animate-spin' />
            ) : (
              <SiInstagram size={14} />
            )}
            {connecting ? 'Connecting…' : 'Connect Instagram'}
          </Button>
          <p className='text-[10px] text-muted-foreground leading-relaxed'>
            Opens Facebook Login. Requires an Instagram Business or Creator account
            linked to a Facebook Page.
          </p>
          <button
            type='button'
            className='text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2'
            onClick={() => setMode('manual')}
          >
            Use access token manually
          </button>
        </div>
      )}

      {mode === 'picker' && (
        <div className='space-y-2'>
          <div className='text-[11px] font-medium'>Pick the account to link</div>
          <div className='space-y-1.5 max-h-60 overflow-y-auto'>
            {accounts.map((a) => (
              <button
                key={a.id}
                type='button'
                disabled={connecting}
                onClick={() => pickAccount(a)}
                className='w-full flex items-center gap-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 p-2 text-left transition-colors'
              >
                {a.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.profile_picture_url}
                    alt={a.username}
                    className='h-7 w-7 rounded-full object-cover'
                  />
                ) : (
                  <div className='h-7 w-7 rounded-full bg-muted flex items-center justify-center'>
                    <SiInstagram size={12} />
                  </div>
                )}
                <div className='flex-1 min-w-0'>
                  <div className='text-[11px] font-medium truncate'>@{a.username || a.name || a.id}</div>
                  {a.name && a.name !== a.username && (
                    <div className='text-[10px] text-muted-foreground truncate'>{a.name}</div>
                  )}
                </div>
                {connecting && <Loader2 size={12} className='animate-spin text-muted-foreground' />}
              </button>
            ))}
          </div>
          <button
            type='button'
            className='text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2'
            onClick={() => setMode('oauth')}
          >
            Back
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className='space-y-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>Instagram Business Account ID</Label>
            <Input
              className='h-8 text-xs font-mono'
              placeholder='17841400000000000'
              value={manual.ig_user_id}
              onChange={(e) => setManual((p) => ({ ...p, ig_user_id: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>Facebook Page ID</Label>
            <Input
              className='h-8 text-xs font-mono'
              placeholder='123456789012345'
              value={manual.page_id}
              onChange={(e) => setManual((p) => ({ ...p, page_id: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>Page Access Token</Label>
            <Input
              type='password'
              className='h-8 text-xs font-mono'
              placeholder='EAAG…'
              value={manual.page_access_token}
              onChange={(e) => setManual((p) => ({ ...p, page_access_token: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>
              Username <span className='text-muted-foreground font-normal'>(optional)</span>
            </Label>
            <Input
              className='h-8 text-xs'
              placeholder='acme_coffee'
              value={manual.username}
              onChange={(e) => setManual((p) => ({ ...p, username: e.target.value }))}
            />
          </div>
          <Button
            size='sm'
            className='w-full h-8 gap-1.5'
            disabled={(!workflowId && !resolvedId) || connecting}
            onClick={submitManual}
          >
            {connecting ? <Loader2 size={12} className='animate-spin' /> : <KeyRound size={12} />}
            {connecting ? 'Saving…' : 'Save configuration'}
          </Button>
          {oauthAvailable && (
            <button
              type='button'
              className='text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2'
              onClick={() => setMode('oauth')}
            >
              Back to one-click connect
            </button>
          )}
        </div>
      )}
    </div>
  );
}
