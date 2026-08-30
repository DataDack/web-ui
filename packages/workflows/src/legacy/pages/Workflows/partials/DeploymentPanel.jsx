/*
  DeploymentPanel — Sheet panel for testing deployed workflows.
  Shows deployment info, JSON payload editor, and invocation results.
*/

import React, { useState, useEffect } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  Badge,
  Button,
  JsonCodeEditor,
  JsonViewer,
  Label,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { toast } from 'react-toastify';
import LambdaLogViewer from './LambdaLogViewer';

// Recursively parse JSON strings within an object so they render as
// expandable trees instead of raw escaped text.
function deepParseJsonStrings(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return deepParseJsonStrings(JSON.parse(trimmed));
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepParseJsonStrings);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepParseJsonStrings(v);
    }
    return out;
  }
  return value;
}

// Check if any node in the results contains an error in its output
function detectNodeErrors(body) {
  const results = body?.results || body?.body?.results;
  if (!results || typeof results !== 'object') return [];

  const errors = [];
  for (const [nodeName, outputs] of Object.entries(results)) {
    const items = Array.isArray(outputs) ? outputs : [outputs];
    for (const item of items) {
      const json = item?.json || item;
      if (json?.raw?.error || json?.error) {
        const err = json.raw?.error || json.error;
        errors.push({
          node: nodeName,
          code: err.code || err.type || 'error',
          message: err.message || JSON.stringify(err),
        });
      }
    }
  }
  return errors;
}

export default function DeploymentPanel({ deployInfo, onInvoke, invoking, onClose, open }) {
  const [payloadStr, setPayloadStr] = useState('{\n  "body": [{ "json": {} }]\n}');
  const [result, setResult] = useState(null);

  // Reset to clean state every time the panel opens
  useEffect(() => {
    if (open) {
      setResult(null);
    }
  }, [open]);

  const handleInvoke = async () => {
    let parsed;
    try {
      parsed = JSON.parse(payloadStr);
    } catch {
      toast.error('Invalid JSON payload');
      return;
    }

    const start = Date.now();
    const resp = await onInvoke(parsed);
    const duration = Date.now() - start;

    if (resp) {
      setResult({ ...resp, duration });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side='right' className='w-[50vw] sm:max-w-[50vw] p-0 flex flex-col gap-0'>
        <SheetHeader className='px-4 py-3 border-b space-y-0'>
          <SheetTitle className='text-sm'>Test Workflow</SheetTitle>
          {deployInfo && (
            <SheetDescription className='text-xs flex items-center gap-1.5 pt-1'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block' />
              Latest {deployInfo.latest_version_tag || '—'} &middot; Live {deployInfo.default_version_tag || deployInfo.latest_version_tag || '—'}
              {deployInfo.deployed_at && (
                <> &middot; {new Date(deployInfo.deployed_at * 1000).toLocaleString()}</>
              )}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className='flex-1'>
          <div className='p-4 space-y-4'>
            {/* Lambda name */}
            {deployInfo?.lambda_name && (
              <div className='text-[10px] text-muted-foreground/50 font-mono truncate'>
                {deployInfo.lambda_name}
              </div>
            )}

            {/* Payload editor */}
            <div className='space-y-2'>
              <Label className='text-xs uppercase tracking-wide'>Input Payload</Label>
              <JsonCodeEditor
                value={payloadStr}
                onChange={setPayloadStr}
                minHeight='160px'
                maxHeight='300px'
              />
            </div>

            {/* Invoke button */}
            <Button
              onClick={handleInvoke}
              disabled={invoking}
              className='w-full h-9 font-medium text-sm gap-2'
            >
              {invoking ? (
                <Loader2 size={14} className='animate-spin' />
              ) : (
                <Play size={14} />
              )}
              {invoking ? 'Running...' : 'Invoke'}
            </Button>

            {/* Results */}
            {result && (() => {
              const nodeErrors = detectNodeErrors(result.body);
              const hasNodeErrors = nodeErrors.length > 0;
              const isError = result.status_code !== 200 || hasNodeErrors;

              return (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      {isError ? (
                        <XCircle size={13} className='text-red-500' />
                      ) : (
                        <CheckCircle2 size={13} className='text-emerald-500' />
                      )}
                      <span className='text-xs text-foreground'>
                        {hasNodeErrors ? 'Node Error' : `Status ${result.status_code}`}
                      </span>
                      <span className='text-xs text-muted-foreground flex items-center gap-1'>
                        <Clock size={10} />
                        {result.duration}ms
                      </span>
                      {result.trace_id && (
                        <Badge variant='outline' className='text-[10px] h-4 px-1.5 font-mono'>
                          {result.trace_id}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Node-level errors */}
                  {hasNodeErrors && (
                    <div className='space-y-1.5'>
                      {nodeErrors.map((err, i) => (
                        <div key={i} className='rounded-md border border-red-500/20 bg-red-500/5 p-2.5'>
                          <div className='flex items-center gap-1.5 mb-1'>
                            <XCircle size={11} className='text-red-500 shrink-0' />
                            <span className='text-[11px] font-semibold text-red-500'>{err.node}</span>
                            <Badge variant='outline' className='text-[9px] h-3.5 px-1 border-red-500/30 text-red-400'>
                              {err.code}
                            </Badge>
                          </div>
                          <p className='text-[11px] text-red-400 font-mono leading-relaxed'>{err.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <JsonViewer data={deepParseJsonStrings(result.body)} maxHeight='300px' defaultExpanded={3} />

                  {result.log_output && (
                    <details className='group' open>
                      <summary className='text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors'>
                        Lambda Logs
                      </summary>
                      <div className='mt-2'>
                        <LambdaLogViewer
                          logOutput={result.log_output}
                          wcuData={result.wcu ? { wcu: result.wcu, wcu_seconds: result.wcu_seconds, quota: result.quota } : null}
                        />
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
