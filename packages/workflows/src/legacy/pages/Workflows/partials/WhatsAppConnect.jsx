import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, AlertCircle, KeyRound } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Button, Input, Label } from "@datadack/common-ui"
import { toast } from 'react-toastify';
import { integrationsApi } from '../../../api/integrations';

// ─────────────────────────────────────────────────────────────────────────────
// Facebook JS SDK loader — runs once per tab. We don't pull the SDK at module
// load because most users of this app never touch WhatsApp; defer until the
// first render of this component.
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function WhatsAppConnect({ integrationId, integration, workflowId, onConnected }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('embedded'); // 'embedded' | 'manual'
  const [connecting, setConnecting] = useState(false);
  const [resolvedId, setResolvedId] = useState(integrationId || null);

  // Integrations for other platforms are created on workflow save. WhatsApp
  // needs the ID up-front because the Embedded Signup callback targets a
  // specific :id/embedded-signup endpoint. Lazy-create on first connect click.
  const ensureIntegration = async () => {
    if (resolvedId) return resolvedId;
    if (!workflowId) throw new Error('Save the workflow first so WhatsApp can be linked');
    const created = await integrationsApi.create({
      workflow_id: workflowId,
      integration_name: 'whatsapp',
      config: '{}',
    });
    const newId = created?.integration?.id || created?.id;
    if (!newId) throw new Error('Failed to create WhatsApp integration');
    setResolvedId(newId);
    queryClient.invalidateQueries({ queryKey: ['integration-by-workflow', workflowId, 'whatsapp'] });
    return newId;
  };
  const [manual, setManual] = useState({
    waba_id: '',
    phone_number_id: '',
    access_token: '',
    verify_token: '',
  });

  const sessionInfoRef = useRef(null);

  // Fetch public bootstrap (app_id + config_id). If server returns an error,
  // the Embedded Signup path is unavailable — fall back to the manual form.
  const { data: bootstrap, isLoading: bootstrapLoading, error: bootstrapError } = useQuery({
    queryKey: ['whatsapp-bootstrap'],
    queryFn: integrationsApi.whatsappBootstrap,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  const esAvailable = !!bootstrap?.app_id && !!bootstrap?.config_id;

  // Switch to manual mode automatically if ES isn't configured on the server.
  useEffect(() => {
    if (bootstrapError || (bootstrap && !esAvailable)) {
      setMode('manual');
    }
  }, [bootstrap, bootstrapError, esAvailable]);

  // Capture the session_info event Meta's Embedded Signup dialog posts back
  // to the opener window. It carries waba_id + phone_number_id — values the
  // bare OAuth code doesn't include.
  useEffect(() => {
    const handler = (event) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }
      let data;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.event === 'FINISH') {
        sessionInfoRef.current = {
          waba_id: data?.data?.waba_id || '',
          phone_number_id: data?.data?.phone_number_id || '',
          business_id: data?.data?.business_id || '',
        };
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const launchEmbeddedSignup = async () => {
    setConnecting(true);
    sessionInfoRef.current = null;
    let id;
    try {
      id = await ensureIntegration();
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
                // Meta delivers the code here; waba_id + phone_number_id
                // arrived separately via the session_info postMessage.
                const session = sessionInfoRef.current || {};
                if (!session.waba_id || !session.phone_number_id) {
                  throw new Error(
                    'Embedded Signup completed but no WABA/phone data was returned. Try again or use manual setup.'
                  );
                }
                await integrationsApi.whatsappEmbeddedSignup(id, {
                  code: response.authResponse.code,
                  waba_id: session.waba_id,
                  phone_number_id: session.phone_number_id,
                  business_id: session.business_id || '',
                });
                toast.success('WhatsApp connected');
                queryClient.invalidateQueries({ queryKey: ['integration-by-workflow'] });
                onConnected?.();
              } else if (response?.status === 'unknown') {
                // User closed the popup — treat as cancel, not an error.
              } else {
                throw new Error(response?.authResponse?.error_message || 'Embedded Signup did not complete');
              }
            } catch (err) {
              toast.error(err.message || String(err));
            } finally {
              setConnecting(false);
            }
          })();
        },
        {
          config_id: bootstrap.config_id,
          response_type: 'code',
          override_default_response_type: true,
          extras: { version: 'v3' },
        }
      );
    } catch (err) {
      toast.error(err.message || String(err));
      setConnecting(false);
    }
  };

  const submitManual = async () => {
    if (!manual.waba_id || !manual.phone_number_id || !manual.access_token) {
      toast.error('WABA ID, phone number ID and access token are required');
      return;
    }
    setConnecting(true);
    try {
      const id = await ensureIntegration();
      await integrationsApi.whatsappManualSetup(id, manual);
      toast.success('WhatsApp connected');
      queryClient.invalidateQueries({ queryKey: ['integration-by-workflow'] });
      onConnected?.();
    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setConnecting(false);
    }
  };

  // Derive a lightweight connected state from the integration config.
  const cfg = integration?.config || {};
  // The access token is never in config — token_secret names the encrypted row
  // holding it — so a stored credential is what "connected" reads, not the
  // token itself.
  const isConnected = !!(cfg.waba_id && cfg.phone_number_id && cfg.token_secret);

  if (isConnected) {
    return (
      <div className='space-y-2'>
        <div className='rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3'>
          <div className='flex items-center gap-2'>
            <Check size={12} className='text-emerald-500' />
            <span className='text-[11px] font-medium text-emerald-600'>WhatsApp connected</span>
          </div>
          <div className='mt-2 space-y-0.5 text-[10px] font-mono text-muted-foreground'>
            <div>WABA: {cfg.waba_id}</div>
            <div>Phone ID: {cfg.phone_number_id}</div>
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

      {mode === 'embedded' && (
        <div className='space-y-2'>
          <Button
            size='sm'
            className='w-full h-9 gap-2 bg-[#25D366] hover:bg-[#20BA58] text-white'
            disabled={(!workflowId && !resolvedId) || connecting || bootstrapLoading || !esAvailable}
            onClick={launchEmbeddedSignup}
          >
            {connecting || bootstrapLoading ? (
              <Loader2 size={14} className='animate-spin' />
            ) : (
              <SiWhatsapp size={14} />
            )}
            {connecting ? 'Connecting…' : 'Connect WhatsApp'}
          </Button>
          <p className='text-[10px] text-muted-foreground leading-relaxed'>
            Opens Meta's one-click signup. You'll pick your WhatsApp Business
            Account and phone number — webhook wiring happens automatically.
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
            <Label className='text-[11px] font-medium'>WABA ID</Label>
            <Input
              className='h-8 text-xs font-mono'
              placeholder='123456789012345'
              value={manual.waba_id}
              onChange={(e) => setManual((p) => ({ ...p, waba_id: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>Phone Number ID</Label>
            <Input
              className='h-8 text-xs font-mono'
              placeholder='109876543210987'
              value={manual.phone_number_id}
              onChange={(e) => setManual((p) => ({ ...p, phone_number_id: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>Access Token</Label>
            <Input
              type='password'
              className='h-8 text-xs font-mono'
              placeholder='EAAG…'
              value={manual.access_token}
              onChange={(e) => setManual((p) => ({ ...p, access_token: e.target.value }))}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] font-medium'>
              Verify Token <span className='text-muted-foreground font-normal'>(optional)</span>
            </Label>
            <Input
              className='h-8 text-xs font-mono'
              placeholder='leave blank to use server default'
              value={manual.verify_token}
              onChange={(e) => setManual((p) => ({ ...p, verify_token: e.target.value }))}
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
          {esAvailable && (
            <button
              type='button'
              className='text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2'
              onClick={() => setMode('embedded')}
            >
              ← Use Embedded Signup instead
            </button>
          )}
        </div>
      )}
    </div>
  );
}
