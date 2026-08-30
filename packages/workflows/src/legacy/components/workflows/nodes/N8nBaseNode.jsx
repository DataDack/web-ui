/*
  Generic n8n workflow node renderer.
  Standard node with 1+ input handles on left, 1+ output handles on right.
  Displays icon, label, and a brief parameter summary.
*/

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertCircle } from 'lucide-react';
import { ICON_MAP, BRAND_ICON_MAP } from '../workflowIconMap';
import { getNodeDefinition } from '../../../helpers/n8nNodeRegistry';

function NodeIcon({ name, registryKey, size = 14, color }) {
  const BrandIcon = BRAND_ICON_MAP[registryKey];
  // Brand icons render in the theme foreground so near-black logos (GitHub,
  // Apple, etc.) stay visible in dark mode — the tinted chip still conveys
  // the provider color.
  if (BrandIcon) return <BrandIcon size={size} className='text-foreground' />;
  const Icon = ICON_MAP[name];
  if (!Icon) return <div className='w-3.5 h-3.5 rounded-full' style={{ background: color }} />;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

function getNodeSummary(data) {
  const p = data.parameters || {};
  const key = data.registryKey;

  switch (key) {
    case 'httpRequest':
      return p.url ? `${p.method || 'GET'} ${p.url}` : 'No URL configured';
    case 'code':
      return p.mode === 'runOnceForEachItem' ? 'Run once per item' : 'Run once for all items';
    case 'executeCommand':
      return p.command || 'No command set';
    case 'openAi':
      return `${p.model || 'gpt-4o'} — ${p.prompt ? p.prompt.slice(0, 40) + '...' : 'No prompt'}`;
    case 'slack':
      return p.text ? p.text.slice(0, 50) : 'Send Slack message';
    case 'emailSend':
      return p.toEmail ? `To: ${p.toEmail}` : 'Send email';
    case 'postgres':
    case 'mySql':
      return p.operation === 'executeQuery' ? (p.query ? p.query.slice(0, 50) : 'SQL query') : p.operation || '';
    case 'set':
      return 'Edit fields';
    case 'limit':
      return `Max ${p.maxItems || 10} items`;
    case 'wait':
      return `Wait ${p.amount || 1} ${p.unit || 'seconds'}`;
    default:
      return data.description || '';
  }
}

// Bottom "typed" ports (langchain sub-node attachments). Rendered as labeled
// target handles along the bottom edge, separate from the main input row.
const TYPED_PORT_META = {
  ai_tool: { label: 'Tools', color: '#6366f1' },
  ai_languageModel: { label: 'Model', color: '#10b981' },
  ai_memory: { label: 'Memory', color: '#f59e0b' },
};

export default function N8nBaseNode({ data, selected, id }) {
  const allInputs = data.inputs || ['main'];
  const typedInputs = allInputs.filter((i) => TYPED_PORT_META[i]);
  const inputs = allInputs.filter((i) => !TYPED_PORT_META[i]);
  const outputs = data.outputs || ['main'];

  // Check if credentials are required but not configured
  const def = getNodeDefinition(data.registryKey);
  const userCreds = data.credentials || {};
  const params = data.parameters || {};

  const missingCreds = (() => {
    if (!def?.credentials?.length) return false;

    // Nodes with dynamic credentials by auth mode (e.g. Discord)
    if (def.credentialsByAuthMode) {
      const mode = params.authMode || Object.keys(def.credentialsByAuthMode)[0];
      const needed = def.credentialsByAuthMode[mode] || [];
      return needed.length > 0 && needed.some((c) => !userCreds[c]);
    }

    // Nodes with optional auth (e.g. HTTP Request — has "authentication" param defaulting to "none")
    const authParam = def.parameters?.find((p) => p.key === 'authentication');
    if (authParam) {
      const authValue = params.authentication ?? authParam.default;
      if (authValue === 'none') return false;
    }

    // All other nodes — credentials are required
    return def.credentials.some((c) => !userCreds[c]);
  })();

  return (
    <div
      className={`rounded-xl border bg-card min-w-[200px] max-w-[260px] transition-all ${
        selected && missingCreds ? 'ring-2 ring-red-500 border-red-500 shadow-lg'
        : selected ? 'ring-2 ring-primary border-primary shadow-lg'
        : missingCreds ? 'border-red-500/60 shadow-sm'
        : 'border-border shadow-sm'
      }`}
    >
      {/* Header */}
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b'
        style={{ background: `${data.color || '#666'}15` }}
      >
        <NodeIcon name={data.icon} registryKey={data.registryKey} size={14} color={data.color} />
        <span className='text-xs font-semibold truncate flex-1 text-foreground'>{data.label}</span>
        {missingCreds && (
          <span title='Credentials required — click to configure'>
            <AlertCircle size={13} className='text-red-500 shrink-0' />
          </span>
        )}
      </div>

      {/* Summary */}
      <div className='px-3 py-2 text-[11px] text-muted-foreground truncate'>
        {missingCreds ? (
          <span className='text-red-500'>Credentials required</span>
        ) : (
          getNodeSummary(data)
        )}
      </div>

      {/* Input handles */}
      {inputs.map((_, i) => (
        <Handle
          key={`in-${i}`}
          type='target'
          position={Position.Left}
          id={`input_${i}`}
          style={{
            top: inputs.length === 1 ? '50%' : `${((i + 1) / (inputs.length + 1)) * 100}%`,
            width: 10,
            height: 10,
            background: 'var(--muted-foreground)',
            border: '2px solid var(--border)',
          }}
        />
      ))}

      {/* Output handles */}
      {outputs.map((_, i) => (
        <Handle
          key={`out-${i}`}
          type='source'
          position={Position.Right}
          id={`output_${i}`}
          style={{
            top: outputs.length === 1 ? '50%' : `${((i + 1) / (outputs.length + 1)) * 100}%`,
            width: 10,
            height: 10,
            background: data.color || '#666',
            border: '2px solid var(--border)',
          }}
        />
      ))}

      {/* Bottom typed sub-node ports (Tools, Model, Memory) */}
      {typedInputs.length > 0 && (
        <div className='flex justify-around px-3 pb-1.5 pt-1 text-[10px] text-muted-foreground border-t border-dashed'>
          {typedInputs.map((port) => (
            <span key={port} className='flex items-center gap-1'>
              <span
                className='inline-block w-2 h-2 rounded-full'
                style={{ background: TYPED_PORT_META[port].color }}
              />
              {TYPED_PORT_META[port].label}
            </span>
          ))}
        </div>
      )}
      {typedInputs.map((port, i) => {
        const pct = typedInputs.length === 1 ? 50 : ((i + 1) / (typedInputs.length + 1)) * 100;
        return (
          <Handle
            key={`typed-${port}`}
            type='target'
            position={Position.Bottom}
            id={port}
            style={{
              left: `${pct}%`,
              width: 10,
              height: 10,
              background: TYPED_PORT_META[port].color,
              border: '2px solid var(--border)',
            }}
          />
        );
      })}
    </div>
  );
}
