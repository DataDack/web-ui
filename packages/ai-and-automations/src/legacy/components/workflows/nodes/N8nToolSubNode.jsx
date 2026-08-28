/*
  Tool sub-node renderer — attaches to an MCP Server Trigger via an ai_tool edge.
  One source handle on top (id='ai_tool'); no inputs, no main outputs.
*/

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import { ICON_MAP, BRAND_ICON_MAP } from '../workflowIconMap';

function NodeIcon({ name, registryKey, size = 14, color }) {
  const BrandIcon = BRAND_ICON_MAP[registryKey];
  if (BrandIcon) return <BrandIcon size={size} className='text-foreground' />;
  const Icon = ICON_MAP[name];
  if (!Icon) return <Wrench size={size} color={color} strokeWidth={2} />;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

function getToolSummary(data) {
  const p = data.parameters || {};
  return p.name ? `Tool: ${p.name}` : 'Unnamed tool';
}

export default function N8nToolSubNode({ data, selected }) {
  return (
    <div
      className={`rounded-xl border bg-card min-w-[200px] max-w-[260px] transition-all ${selected ? 'ring-2 ring-primary border-primary shadow-lg' : 'border-border shadow-sm'}`}
    >
      <Handle
        type='source'
        position={Position.Top}
        id='ai_tool'
        style={{
          left: '50%',
          width: 10,
          height: 10,
          background: data.color || '#6366f1',
          border: '2px solid var(--border)',
        }}
      />

      <div
        className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b'
        style={{ background: `${data.color || '#6366f1'}15` }}
      >
        <NodeIcon name={data.icon} registryKey={data.registryKey} size={14} color={data.color || '#6366f1'} />
        <span className='text-xs font-semibold truncate flex-1 text-foreground'>{data.label}</span>
      </div>

      <div className='px-3 py-2 text-[11px] text-muted-foreground truncate'>
        {getToolSummary(data)}
      </div>
    </div>
  );
}
