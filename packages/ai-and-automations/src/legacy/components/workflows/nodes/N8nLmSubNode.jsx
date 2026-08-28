/*
  Language-model sub-node renderer — attaches to an AI Agent via an
  ai_languageModel edge. One source handle on top (id='ai_languageModel');
  no inputs, no main outputs.
*/

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { ICON_MAP, BRAND_ICON_MAP } from '../workflowIconMap';
import { getNodeDefinition } from '../../../helpers/n8nNodeRegistry';

function NodeIcon({ name, registryKey, size = 14, color }) {
  const BrandIcon = BRAND_ICON_MAP[registryKey];
  if (BrandIcon) return <BrandIcon size={size} className='text-foreground' />;
  const Icon = ICON_MAP[name];
  if (!Icon) return <Sparkles size={size} color={color} strokeWidth={2} />;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

function getSummary(data) {
  const p = data.parameters || {};
  return p.model ? `Model: ${p.model}` : 'No model selected';
}

export default function N8nLmSubNode({ data, selected }) {
  const def = getNodeDefinition(data.registryKey);
  const userCreds = data.credentials || {};
  const missingCreds =
    def?.credentials?.length > 0 && def.credentials.some((c) => !userCreds[c]);

  const accent = data.color || '#10b981';

  return (
    <div
      className={`rounded-xl border bg-card min-w-[200px] max-w-[260px] transition-all ${
        selected && missingCreds ? 'ring-2 ring-red-500 border-red-500 shadow-lg'
        : selected ? 'ring-2 ring-primary border-primary shadow-lg'
        : missingCreds ? 'border-red-500/60 shadow-sm'
        : 'border-border shadow-sm'
      }`}
    >
      <Handle
        type='source'
        position={Position.Top}
        id='ai_languageModel'
        style={{
          left: '50%',
          width: 10,
          height: 10,
          background: accent,
          border: '2px solid var(--border)',
        }}
      />

      <div
        className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b'
        style={{ background: `${accent}15` }}
      >
        <NodeIcon name={data.icon} registryKey={data.registryKey} size={14} color={accent} />
        <span className='text-xs font-semibold truncate flex-1 text-foreground'>{data.label}</span>
        {missingCreds && (
          <span title='Credentials required'>
            <AlertCircle size={13} className='text-red-500 shrink-0' />
          </span>
        )}
      </div>

      <div className='px-3 py-2 text-[11px] text-muted-foreground truncate'>
        {missingCreds ? (
          <span className='text-red-500'>Credentials required</span>
        ) : (
          getSummary(data)
        )}
      </div>
    </div>
  );
}
