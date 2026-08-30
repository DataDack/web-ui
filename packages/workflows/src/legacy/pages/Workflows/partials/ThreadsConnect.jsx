import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, AlertCircle, KeyRound } from 'lucide-react';
import { SiThreads } from 'react-icons/si';
import { Button, Input, Label } from "@datadack/common-ui"
import { toast } from 'react-toastify';
import { integrationsApi } from '../../../api/integrations';

// Threads OAuth runs on threads.net, not facebook.com, so we can't use
// FB.login. Open the consent URL in a popup, then listen for a postMessage
// from the callback page that carries the code back.

export default function ThreadsConnect({ integrationId, integration, workflowId, onConnected }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('oauth'); // 'oauth' | 'manual'
  const [connecting, setConnecting] = useState(false);
  const [resolvedId, setResolvedId] = useState(integrationId || null);
  const popupRef = useRef(null);

  const [manual, setManual] = useState({
    threads_user_id: '',
    access_token: '',
    username: '',
    verify_token: '',
  });

  const ensureIntegration = async () => {
    if (resolvedId) return resolvedId;
    if (!workflowId) throw new Error('Save the workflow first so Threads can be linked');
    const created = await integrationsApi.create({
      workflow_id: workflowId,
      integration_name: 'threads',
      config: '{}',
    });
    const newId = created?.integration?.id || created?.id;
    if (!newId) throw new Error('Failed to create Threads integration');
    setResolvedId(newId);
    queryClient.invalidateQueries({ queryKey: ['integration-by-workflow', workflowId, 'threads'] });
    return newId;
  };

  const { data: bootstrap, isLoading: bootstrapLoading, error: bootstrapError } = useQuery({
    queryKey: ['threads-bootstrap', resolvedId || integrationId],
    queryFn: () => integrationsApi.threadsBootstrap(resolvedId || integrationId || ''),
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  const oauthAvailable = !!bootstrap?.consent_url;

  useEffect(() => {
    if (bootstrapError || (bootstrap && !oauthAvailable)) {
      setMode('manual');
    }
  }, [bootstrap, bootstrapError, oauthAvailable]);

  // Listen for the popup's postMessage carrying the code. The backend's
  // /api/integration/threads/callback page is responsible for posting
  // { type: 'THREADS_OAUTH', code } back to window.opener.
  useEffect(() => {
    const handler = async (event) => {
      const data = event.data;
      if (!data || data.type !== 'THREADS_OAUTH' || !data.code) return;

      try {
        const id = await ensureIntegration();
        await integrationsApi.threadsOAuthFinish(id, {
          code: data.code,
          redirect_uri: bootstrap?.redirect_uri,
        });
        toast.success('Threads connected');
        queryClient.invalidateQueries({ queryKey: ['integration-by-workflow'] });
        onConnected?.();
      } catch (err) {
        toast.error(err.message || String(err));
      } finally {
        setConnecting(false);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap, workflowId, resolvedId]);

  const launchOAuth = async () => {
    if (!bootstrap?.consent_url) {
      toast.error('Threads OAuth is not configured on this server');
      return;
    }
    setConnecting(true);
    try {
      await ensureIntegration();
    } catch (err) {
      toast.error(err.message || String(err));
      setConnecting(false);
      return;
    }
    const w = 600;
    const h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    popupRef.current = window.open(
      bootstrap.consent_url,
      'threads-oauth',
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    if (!popupRef.current) {
      toast.error('Popup blocked — allow popups for this site and retry');
      setConnecting(false);
    }
  };

  const submitManual = async () => {
    if (!manual.threads_user_id || !manual.access_token) {
      toast.error('Threads user ID and access token are required');
      return;
    }
    setConnecting(true);
    try {
      const id = await ensureIntegration();
      await integrationsApi.threadsManualSetup(id, manual);
      toast.success('Threads connected');
      queryClient.invalidateQueries({ queryKey: ['integration-by-workflow'] });
      onConnected?.();
    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setConnecting(false);
    }
  };

  const cfg = integration?.config || {};
  const isConnected = !!(cfg.threads_user_id && cfg.access_token);

  if (isConnected) {
    return (
      <div className='space-y-2'>
        <div className='rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3'>
          <div className='flex items-center gap-2'>
            <Check size={12} className='text-emerald-500' />
            <span className='text-[11px] font-medium text-emerald-600'>Threads connected</span>
          </div>
          <div className='mt-2 space-y-0.5 text-[10px] font-mono text-muted-foreground'>
            {cfg.username && <div>@{cfg.username}</div>}
            <div>User ID: {cfg.threads_user_id}</div>
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
            className='w-full h-9 gap-2 bg-foreground hover:bg-foreground/90 text-background'
            disabled={(!workflowId && !resolvedId) || connecting || bootstrapLoading || !oauthAvailable}
            onClick={launchOAuth}
          >
            {connecting || bootstrapLoading ? (
              <Loader2 size={14} className='animate-spin' />
            ) : (
              <SiThreads size={14} />
            )}
            {connecting ? 'Connecting…' : 'Connect Threads'}
          </Button>
          <p className='text-[10px] text-muted-foreground leading-relaxed'>
            Opens the Threads consent screen. Token is long-lived (60 days) and
            auto-refreshes while the workflow is active.
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

      {mode === 'manual' && (
        <div className='space-y-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>Threads User ID</Label>
            <Input
              className='h-8 text-xs font-mono'
              placeholder='1234567890'
              value={manual.threads_user_id}
              onChange={(e) => setManual((p) => ({ ...p, threads_user_id: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>Access Token</Label>
            <Input
              type='password'
              className='h-8 text-xs font-mono'
              placeholder='THxxxx…'
              value={manual.access_token}
              onChange={(e) => setManual((p) => ({ ...p, access_token: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>
              Username <span className='text-muted-foreground font-normal'>(optional)</span>
            </Label>
            <Input
              className='h-8 text-xs'
              placeholder='acme'
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
