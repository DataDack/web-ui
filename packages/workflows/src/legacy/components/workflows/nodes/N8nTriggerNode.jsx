/*
  Trigger node renderer — no input handles, distinct visual style.
  Used for Manual Trigger, Webhook, Schedule Trigger.
*/

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { ICON_MAP, BRAND_ICON_MAP } from '../workflowIconMap';

function NodeIcon({ name, registryKey, size = 14, color }) {
  const BrandIcon = BRAND_ICON_MAP[registryKey];
  // Brand icons render in the theme foreground so near-black logos (GitHub,
  // Apple, etc.) stay visible in dark mode — the tinted chip still conveys
  // the provider color.
  if (BrandIcon) return <BrandIcon size={size} className='text-foreground' />;
  const Icon = ICON_MAP[name];
  if (!Icon) return <Zap size={size} color={color} />;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

function getTriggerSummary(data) {
  const p = data.parameters || {};
  switch (data.registryKey) {
    case 'webhook':
      return p.path ? `${p.httpMethod || 'GET'} /${p.path}` : 'Webhook endpoint';
    case 'scheduleTrigger': {
      const field = p['rule.interval.0.field'] || 'minutes';
      const val = p[`rule.interval.0.${field}Interval`] || '';
      return val ? `Every ${val} ${field}` : `Schedule (${field})`;
    }
    case 'githubTrigger':
      return 'GitHub events';
    case 'slackTrigger':
      return 'Slack events';
    case 'telegramTrigger':
      return 'Bot messages';
    case 'discordTrigger':
      return 'Interactions';
    case 'whatsappTrigger':
      return 'WhatsApp messages';
    case 'instagramTrigger':
      return 'DMs and comments';
    case 'threadsTrigger':
      return 'Replies and mentions';
    case 'googleDriveTrigger':
      return 'File changes';
    case 'googleSheetsTrigger':
      return 'Row changes';
    case 'googleGmailTrigger':
      return 'New emails';
    case 'googleCalendarTrigger':
      return 'Calendar events';
    case 'microsoftOutlookTrigger':
      return 'New emails';
    case 'microsoftOneDriveTrigger':
      return 'File changes';
    case 'microsoftCalendarTrigger':
      return 'Calendar events';
    case 'microsoftExcelTrigger':
      return 'Row changes';
    case 'jiraTrigger':
      return 'Issue events';
    case 'manualTrigger':
    default:
      return 'Click to execute';
  }
}

export default function N8nTriggerNode({ data, selected, id }) {
  const outputs = data.outputs || ['main'];
  const inputs = data.inputs || [];
  const acceptsAiTool = inputs.includes('ai_tool');

  return (
    <div
      className={`rounded-xl border-2 border-dashed bg-card min-w-[200px] max-w-[260px] transition-all ${selected ? 'ring-2 ring-primary border-primary shadow-lg' : 'border-border shadow-sm'}`}
    >
      {/* Header with lightning bolt accent */}
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-t-[10px] border-b'
        style={{ background: `${data.color || '#909399'}20` }}
      >
        <div className='flex items-center justify-center w-5 h-5 rounded-md' style={{ background: `${data.color || '#909399'}30` }}>
          <NodeIcon name={data.icon} registryKey={data.registryKey} size={11} color={data.color || '#909399'} />
        </div>
        <span className='text-xs font-semibold truncate flex-1 text-foreground'>{data.label}</span>
      </div>

      {/* Summary */}
      <div className='px-3 py-2 text-[11px] text-muted-foreground truncate'>
        {getTriggerSummary(data)}
      </div>

      {/* ai_tool target handle (bottom) — only when this trigger accepts tools */}
      {acceptsAiTool && (
        <Handle
          type='target'
          position={Position.Bottom}
          id='ai_tool'
          style={{
            left: '50%',
            width: 10,
            height: 10,
            background: data.color || '#6366f1',
            border: '2px solid var(--border)',
          }}
        />
      )}

      {/* Output handles */}
      {outputs.map((_, i) => (
        <Handle
          key={`out-${i}`}
          type='source'
          position={Position.Right}
          id={`output_${i}`}
          style={{
            top: '50%',
            width: 10,
            height: 10,
            background: data.color || '#909399',
            border: '2px solid var(--border)',
          }}
        />
      ))}
    </div>
  );
}
