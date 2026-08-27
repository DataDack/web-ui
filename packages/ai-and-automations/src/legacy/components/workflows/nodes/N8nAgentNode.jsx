/*
  AI Agent node renderer — n8n's langchain agent. Standard main in/out on
  left/right, plus two target handles on the bottom for attaching a language
  model (ai_languageModel) and tools (ai_tool).
*/

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertCircle, Bot } from 'lucide-react';
import { ICON_MAP, BRAND_ICON_MAP } from '../workflowIconMap';

function NodeIcon({ name, registryKey, size = 14, color }) {
  const BrandIcon = BRAND_ICON_MAP[registryKey];
  if (BrandIcon) return <BrandIcon size={size} className='text-foreground' />;
  const Icon = ICON_MAP[name];
  if (!Icon) return <Bot size={size} color={color} strokeWidth={2} />;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

function getSummary(data) {
  const p = data.parameters || {};
  if (p.text) return p.text.slice(0, 60);
  if (p.promptType) return `Prompt: ${p.promptType}`;
  return 'AI Agent';
}

export default function N8nAgentNode({ data, selected }) {
  const accent = data.color || '#a855f7';

  return (
    <div
      className={`rounded-xl border bg-card min-w-[220px] max-w-[280px] transition-all ${
        selected ? 'ring-2 ring-primary border-primary shadow-lg' : 'border-border shadow-sm'
      }`}
    >
      {/* Main input (left) */}
      <Handle
        type='target'
        position={Position.Left}
        id='input_0'
        style={{
          top: '50%',
          width: 10,
          height: 10,
          background: 'hsl(var(--muted-foreground))',
          border: '2px solid hsl(var(--border))',
        }}
      />

      {/* Main output (right) */}
      <Handle
        type='source'
        position={Position.Right}
        id='output_0'
        style={{
          top: '50%',
          width: 10,
          height: 10,
          background: accent,
          border: '2px solid hsl(var(--border))',
        }}
      />

      {/* Header */}
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b'
        style={{ background: `${accent}15` }}
      >
        <NodeIcon name={data.icon} registryKey={data.registryKey} size={14} color={accent} />
        <span className='text-xs font-semibold truncate flex-1 text-foreground'>{data.label}</span>
      </div>

      {/* Summary */}
      <div className='px-3 py-2 text-[11px] text-muted-foreground truncate'>
        {getSummary(data)}
      </div>

      {/* Bottom handles: language model + tools */}
      <div className='flex justify-around px-3 pb-2 pt-1 text-[10px] text-muted-foreground border-t border-dashed'>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block w-2 h-2 rounded-full'
            style={{ background: '#10b981' }}
          />
          Model
        </span>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block w-2 h-2 rounded-full'
            style={{ background: '#6366f1' }}
          />
          Tools
        </span>
      </div>

      <Handle
        type='target'
        position={Position.Bottom}
        id='ai_languageModel'
        style={{
          left: '30%',
          width: 10,
          height: 10,
          background: '#10b981',
          border: '2px solid hsl(var(--border))',
        }}
      />
      <Handle
        type='target'
        position={Position.Bottom}
        id='ai_tool'
        style={{
          left: '70%',
          width: 10,
          height: 10,
          background: '#6366f1',
          border: '2px solid hsl(var(--border))',
        }}
      />
    </div>
  );
}
