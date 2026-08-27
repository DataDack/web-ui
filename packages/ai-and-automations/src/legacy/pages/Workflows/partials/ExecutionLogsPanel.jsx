import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../../../hooks/useWebSocket';
import {
  ArrowLeft,
  Clock,
  Loader2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { JsonViewer } from '@/components/ui/json-viewer';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { workflowsApi } from '../../../api/workflows';
import LambdaLogViewer from './LambdaLogViewer';
import { toast } from 'react-toastify';

// ── Helpers ──────────────────────────────────────────────────────────────

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

function getDatesInRange(from, to) {
  const dates = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

// ── Trigger Type Badge ───────────────────────────────────────────────────

const TRIGGER_STYLES = {
  manual:   { label: 'Manual',   cls: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
  webhook:  { label: 'Webhook',  cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  invoke:   { label: 'Invoke',   cls: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  schedule: { label: 'Schedule', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

function getTriggerStyle(type_) {
  if (!type_) return { label: '—', cls: 'bg-muted text-muted-foreground border-border' };
  if (type_.startsWith('app:')) {
    const platform = type_.slice(4);
    return { label: platform.charAt(0).toUpperCase() + platform.slice(1), cls: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
  }
  return TRIGGER_STYLES[type_] || { label: type_, cls: 'bg-muted text-muted-foreground border-border' };
}

function TriggerTypeBadge({ type }) {
  const { label, cls } = getTriggerStyle(type);
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${cls}`}>
      {label}
    </span>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────

function ExecutionListSkeleton() {
  return (
    <div className='divide-y'>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className='px-4 py-3 flex items-center gap-3'>
          <Skeleton className='w-1.5 h-1.5 rounded-full' />
          <div className='flex-1 space-y-1.5'>
            <Skeleton className='h-3.5 w-32' />
            <div className='flex items-center gap-2'>
              <Skeleton className='h-3 w-20' />
              <Skeleton className='h-4 w-14 rounded-full' />
            </div>
          </div>
          <Skeleton className='h-3.5 w-3.5' />
        </div>
      ))}
    </div>
  );
}

// ── Node Trace Item ───────────────────────────────────────────────────────

function NodeTraceItem({ trace, index, total }) {
  const [open, setOpen] = useState(false);
  const isTrigger = /trigger/i.test(trace.node_type || '') || /trigger/i.test(trace.node_name || '');
  const statusIcon = {
    success: <CheckCircle2 size={14} className='text-emerald-500' />,
    error: <XCircle size={14} className='text-red-500' />,
    skipped: <SkipForward size={14} className='text-muted-foreground' />,
  };

  return (
    <div className='relative flex gap-3'>
      {/* Timeline connector */}
      <div className='flex flex-col items-center shrink-0 w-5'>
        <div className='w-5 h-5 rounded-full border-2 border-border bg-background flex items-center justify-center z-10'>
          <span className='text-[9px] font-bold text-muted-foreground'>{index + 1}</span>
        </div>
        {index < total - 1 && <div className='w-px flex-1 bg-border' />}
      </div>

      {/* Content */}
      <Collapsible open={open} onOpenChange={setOpen} className='flex-1 min-w-0 pb-4'>
        <CollapsibleTrigger className='w-full text-left'>
          <div className='flex items-center gap-2 group'>
            <ChevronRight size={12} className={`text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
            {statusIcon[trace.status] || statusIcon.success}
            <span className='text-xs font-semibold text-foreground truncate'>{trace.node_name}</span>
            <Badge variant='outline' className='text-[9px] h-4 px-1.5 shrink-0'>{trace.node_type}</Badge>
            <span className='text-[10px] text-muted-foreground ml-auto shrink-0'>
              {trace.duration_ms != null ? `${trace.duration_ms.toFixed(1)}ms` : '—'}
            </span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className='mt-2 ml-5 space-y-2'>
            {/* Error */}
            {trace.error && (
              <div className='rounded-md border border-red-500/20 bg-red-500/5 p-2'>
                <span className='text-[10px] font-medium text-red-500'>Error</span>
                <p className='text-[11px] text-red-400 font-mono mt-0.5'>{trace.error}</p>
              </div>
            )}

            {isTrigger ? (
              /* Trigger nodes — show payload once instead of redundant Input/Output */
              trace.output != null && (
                <div>
                  <span className='text-[10px] font-medium text-muted-foreground mb-1 block'>Payload</span>
                  <JsonViewer data={deepParseJsonStrings(trace.output)} maxHeight='400px' defaultExpanded={1} />
                </div>
              )
            ) : (
              <>
                {trace.input != null && (
                  <div>
                    <span className='text-[10px] font-medium text-muted-foreground mb-1 block'>Input</span>
                    <JsonViewer data={deepParseJsonStrings(trace.input)} maxHeight='400px' defaultExpanded={1} />
                  </div>
                )}
                {trace.output != null && (
                  <div>
                    <span className='text-[10px] font-medium text-muted-foreground mb-1 block'>Output</span>
                    <JsonViewer data={deepParseJsonStrings(trace.output)} maxHeight='400px' defaultExpanded={1} />
                  </div>
                )}
              </>
            )}

            {/* Timestamps */}
            {(trace.started_at || trace.ended_at) && (
              <div className='flex gap-4 text-[10px] text-muted-foreground'>
                {trace.started_at && <span>Start: {new Date(trace.started_at).toLocaleTimeString()}</span>}
                {trace.ended_at && <span>End: {new Date(trace.ended_at).toLocaleTimeString()}</span>}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ── Execution Detail ──────────────────────────────────────────────────────

function ExecutionDetail({ execution, onBack }) {
  const [tab, setTab] = useState('traces');

  const traces = execution.node_traces || [];
  const nodeErrors = detectNodeErrors(execution.response);
  const hasNodeErrors = nodeErrors.length > 0;
  const isError = execution.status !== 'success' || hasNodeErrors;

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='h-12 flex items-center gap-2 px-4 border-b shrink-0'>
        <button
          onClick={onBack}
          className='h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
        >
          <ArrowLeft size={14} />
        </button>
        <span className='text-sm font-semibold text-foreground'>Execution Detail</span>
        <div className='flex-1' />
        <Badge variant={isError ? 'destructive' : 'default'} className='text-[10px]'>
          {isError ? (hasNodeErrors ? 'Node Error' : 'Error') : 'Success'}
        </Badge>
      </div>

      {/* Metadata summary */}
      <div className='px-4 py-3 border-b shrink-0'>
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <div>
            <span className='text-muted-foreground'>Trace ID</span>
            <p className='font-mono text-foreground mt-0.5 truncate'>{execution.trace_id || execution.id}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>Duration</span>
            <p className='font-mono text-foreground mt-0.5'>{execution.duration_ms}ms</p>
          </div>
          <div>
            <span className='text-muted-foreground'>Executed At</span>
            <p className='text-foreground mt-0.5'>{new Date(execution.executed_at * 1000).toLocaleString()}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>Version</span>
            <p className='font-mono text-foreground mt-0.5'>v{execution.deploy_version || '—'}</p>
          </div>
          {execution.trigger_type && (
            <div>
              <span className='text-muted-foreground'>Triggered By</span>
              <div className='mt-0.5'>
                <TriggerTypeBadge type={execution.trigger_type} />
              </div>
            </div>
          )}
          {execution.wcu > 0 && (
            <div>
              <span className='text-muted-foreground'>Compute</span>
              <p className='font-mono text-foreground mt-0.5'>{execution.wcu}x WCU ({execution.wcu * 128} MB)</p>
            </div>
          )}
          {execution.wcu_seconds > 0 && (
            <div>
              <span className='text-muted-foreground'>WCU-seconds</span>
              <p className='font-mono text-foreground mt-0.5'>{execution.wcu_seconds.toFixed(3)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className='flex border-b shrink-0'>
        {[
          { key: 'traces', label: 'Node Traces', count: traces.length },
          { key: 'io', label: 'Input / Output' },
          { key: 'logs', label: 'Logs' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`
              px-4 py-2 text-xs font-medium transition-colors relative
              ${tab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
            `}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className='ml-1 text-[10px] text-muted-foreground'>({t.count})</span>
            )}
            {tab === t.key && <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary' />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ScrollArea className='flex-1'>
        <div className='p-4'>

          {/* Traces tab */}
          {tab === 'traces' && (
            traces.length > 0 ? (
              <div className='space-y-0'>
                {traces.map((trace, i) => (
                  <NodeTraceItem key={trace.node_id || i} trace={trace} index={i} total={traces.length} />
                ))}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                <span className='text-sm'>No node traces recorded</span>
                <span className='text-xs mt-1'>Traces are generated by processing nodes (HTTP, AI, IF, etc.)</span>
              </div>
            )
          )}

          {/* I/O tab */}
          {tab === 'io' && (
            <div className='space-y-4'>
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
              {execution.payload && (
                <div>
                  <span className='text-xs font-medium text-muted-foreground mb-1 block'>Request Payload</span>
                  <JsonViewer data={deepParseJsonStrings(execution.payload)} maxHeight='400px' defaultExpanded={1} />
                </div>
              )}
              {execution.response && (
                <div>
                  <span className='text-xs font-medium text-muted-foreground mb-1 block'>Response</span>
                  <JsonViewer data={deepParseJsonStrings(execution.response)} maxHeight='400px' defaultExpanded={2} />
                </div>
              )}
            </div>
          )}

          {/* Logs tab */}
          {tab === 'logs' && (
            execution.log_output ? (
              <LambdaLogViewer
                logOutput={execution.log_output}
                wcuData={execution.wcu ? { wcu: execution.wcu, wcu_seconds: execution.wcu_seconds, quota: execution.quota, credits_charged: execution.credits_charged } : null}
              />
            ) : (
              <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                <span className='text-sm'>No logs available</span>
              </div>
            )
          )}

        </div>
      </ScrollArea>
    </div>
  );
}

export default function ExecutionLogsPanel({ workflowId, open, onClose }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [selectedExec, setSelectedExec] = useState(null); // { id, date }

  // Reset to clean state (list view, today's date) every time the panel opens
  useEffect(() => {
    if (open) {
      setSelectedExec(null);
      const now = new Date().toISOString().split('T')[0];
      setDateRange({ from: now, to: now });
    }
  }, [open]);

  const dates = useMemo(
    () => (dateRange.from && dateRange.to ? getDatesInRange(dateRange.from, dateRange.to) : [today]),
    [dateRange.from, dateRange.to]
  );

  // Fetch executions for all dates in the range with a single query
  const { data: executions = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['workflow-executions', workflowId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const results = await Promise.all(
        dates.map((date) =>
          workflowsApi.listExecutions(workflowId, { date }).then(
            (items) => (items || []).map((exec) => ({ ...exec, _date: date })),
            () => []
          )
        )
      );
      return results.flat().sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    },
    enabled: !!workflowId && open,
  });

  // Real-time execution log updates via WebSocket
  useWebSocket(
    workflowId ? `execution-log:${workflowId}` : null,
    useCallback(
      (payload) => {
        queryClient.setQueryData(
          ['workflow-executions', workflowId, dateRange.from, dateRange.to],
          (old) => {
            if (!old) return [payload];
            if (old.some((e) => e.id === payload.id)) return old;
            return [{ ...payload, _date: new Date().toISOString().split('T')[0] }, ...old];
          },
        );
      },
      [workflowId, dateRange.from, dateRange.to, queryClient],
    ),
    { enabled: !!workflowId && open },
  );

  const isBackgroundRefresh = isFetching && !isLoading;

  // Full detail — fetched only when user clicks an execution
  const { data: selectedExecData, isLoading: detailLoading } = useQuery({
    queryKey: ['workflow-execution-detail', workflowId, selectedExec?.id, selectedExec?.date],
    queryFn: () => workflowsApi.getExecution(workflowId, selectedExec.id, { date: selectedExec.date }),
    enabled: !!selectedExec?.id,
  });

  const handleRefresh = () => refetch();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side='right' className='w-[50vw] sm:max-w-[50vw] p-0 flex flex-col'>
        {selectedExec?.id ? (
          detailLoading ? (
            <div className='flex items-center justify-center h-full'>
              <Loader2 size={20} className='animate-spin text-primary' />
            </div>
          ) : selectedExecData ? (
            <ExecutionDetail execution={selectedExecData} onBack={() => setSelectedExec(null)} />
          ) : (
            <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-2'>
              <span className='text-sm'>Failed to load execution</span>
              <Button variant='outline' size='sm' onClick={() => setSelectedExec(null)}>Back</Button>
            </div>
          )
        ) : (
          <>
            <SheetHeader className='px-4 py-3 border-b shrink-0'>
              <SheetTitle className='text-sm'>Execution Logs</SheetTitle>
            </SheetHeader>

            {/* Date range filter */}
            <div className='px-4 py-2.5 border-b flex items-center gap-2'>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className='h-8 text-xs flex-1'
              />
              <Button variant='outline' size='sm' className='h-8 text-xs shrink-0' onClick={handleRefresh}>
                {isBackgroundRefresh ? <Loader2 size={14} className='animate-spin' /> : 'Refresh'}
              </Button>
            </div>

            {/* List */}
            <ScrollArea className='flex-1'>
              {isLoading ? (
                <ExecutionListSkeleton />
              ) : executions.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
                  <Clock size={28} strokeWidth={1.2} className='opacity-30 mb-2' />
                  <span className='text-sm'>No executions for this date range</span>
                </div>
              ) : (
                <div className='divide-y'>
                  {isBackgroundRefresh && (
                    <div className='px-4 py-2 flex items-center justify-center'>
                      <Loader2 size={14} className='animate-spin text-muted-foreground' />
                    </div>
                  )}
                  {executions.map((exec) => (
                    <button
                      key={exec.id}
                      onClick={() => setSelectedExec({ id: exec.id, date: exec._date })}
                      className='w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left'
                    >
                      <div className='w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <span className='text-xs font-mono text-foreground truncate block'>
                          {exec.id?.slice(0, 16)}
                        </span>
                        <div className='flex items-center gap-2 mt-0.5'>
                          <span className='text-[11px] text-muted-foreground'>
                            {new Date(exec.created_at * 1000).toLocaleString()}
                          </span>
                          {exec.trigger_type && <TriggerTypeBadge type={exec.trigger_type} />}
                          <Badge variant='outline' className='text-[10px] h-4 px-1.5'>
                            {(exec.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight size={14} className='text-muted-foreground/40 shrink-0' />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
