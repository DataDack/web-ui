import React from 'react';
import { Clock, Cpu, HardDrive, Zap, Timer, Gauge, Coins } from 'lucide-react';

function parseReportLine(line) {
  const metrics = {};
  const patterns = [
    { key: 'duration', label: 'Duration', regex: /Duration:\s*([\d.]+)\s*ms/, icon: Clock, unit: 'ms' },
    { key: 'billed', label: 'Billed', regex: /Billed Duration:\s*([\d.]+)\s*ms/, icon: Timer, unit: 'ms' },
    { key: 'memory', label: 'Memory Size', regex: /Memory Size:\s*(\d+)\s*MB/, icon: HardDrive, unit: 'MB' },
    { key: 'memUsed', label: 'Memory Used', regex: /Max Memory Used:\s*(\d+)\s*MB/, icon: Cpu, unit: 'MB' },
    { key: 'init', label: 'Cold Start', regex: /Init Duration:\s*([\d.]+)\s*ms/, icon: Zap, unit: 'ms' },
  ];
  for (const p of patterns) {
    const m = line.match(p.regex);
    if (m) metrics[p.key] = { value: parseFloat(m[1]), ...p };
  }
  return metrics;
}

function parseLambdaLog(raw) {
  if (!raw) return null;
  const lines = raw.split('\n').filter(Boolean);

  let requestId = '';
  let version = '';
  let report = {};
  const userLines = [];

  for (const line of lines) {
    if (line.startsWith('START RequestId:')) {
      const m = line.match(/START RequestId:\s*(\S+)\s+Version:\s*(\S+)/);
      if (m) { requestId = m[1]; version = m[2]; }
    } else if (line.startsWith('REPORT RequestId:')) {
      report = parseReportLine(line);
    } else if (!line.startsWith('END RequestId:')) {
      userLines.push(line);
    }
  }

  return { requestId, version, report, userLines };
}

function MetricCard({ metric }) {
  const Icon = metric.icon;
  return (
    <div className='flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5'>
      <span className='flex items-center gap-1 text-[10px] text-muted-foreground'>
        <Icon size={10} />
        {metric.label}
      </span>
      <span className='text-xs font-semibold font-mono text-foreground'>
        {metric.value}{metric.unit}
      </span>
    </div>
  );
}

export default function LambdaLogViewer({ logOutput, wcuData, className = '' }) {
  const parsed = parseLambdaLog(logOutput);

  if (!parsed) {
    return <span className='text-xs text-muted-foreground'>No logs available</span>;
  }

  const metrics = Object.values(parsed.report);
  const isColdStart = !!parsed.report.init;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Metrics grid */}
      {metrics.length > 0 && (
        <div className='grid grid-cols-3 gap-1.5'>
          {metrics.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>
      )}

      {/* WCU billing metrics */}
      {wcuData && (wcuData.wcu > 0 || wcuData.wcu_seconds > 0) && (
        <div className='grid grid-cols-3 gap-1.5'>
          <MetricCard metric={{ key: 'wcu', label: 'WCU', value: `${wcuData.wcu}x`, unit: '', icon: Gauge }} />
          <MetricCard metric={{ key: 'wcuSec', label: 'WCU-seconds', value: wcuData.wcu_seconds?.toFixed(3) || '0', unit: '', icon: Timer }} />
          <MetricCard metric={{ key: 'quota', label: 'Quota', value: wcuData.quota || 0, unit: '', icon: Cpu }} />
          {wcuData.credits_charged > 0 && (
            <MetricCard metric={{ key: 'cc', label: 'Credits Charged', value: `${Number(wcuData.credits_charged).toFixed(2)} CC`, unit: '', icon: Coins }} />
          )}
        </div>
      )}

      {/* Cold start indicator */}
      {isColdStart && (
        <div className='flex items-center gap-1.5 text-[10px] text-amber-500'>
          <Zap size={10} />
          <span>Cold start detected ({parsed.report.init.value}ms init)</span>
        </div>
      )}

      {/* Request metadata */}
      {parsed.requestId && (
        <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
          <span>RequestId: <span className='font-mono'>{parsed.requestId}</span></span>
          {parsed.version && <span>Version: <span className='font-mono'>{parsed.version}</span></span>}
        </div>
      )}

      {/* User log lines */}
      {parsed.userLines.length > 0 && (
        <div>
          <span className='text-[10px] font-medium text-muted-foreground'>Application Logs</span>
          <pre className='mt-1 text-[10px] font-mono bg-muted rounded-md p-2 overflow-auto max-h-48 whitespace-pre-wrap'>
            {parsed.userLines.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
