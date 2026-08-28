/*
  Branch node renderer — IF (true/false) and Switch (multiple outputs).
  Shows multiple labeled output handles on the right side.
*/

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { ICON_MAP, BRAND_ICON_MAP } from '../workflowIconMap';

function NodeIcon({ name, registryKey, size = 14, color }) {
  const BrandIcon = BRAND_ICON_MAP[registryKey];
  if (BrandIcon) return <BrandIcon size={size} className='text-foreground' />;
  const Icon = ICON_MAP[name];
  if (!Icon) return <GitBranch size={size} color={color} />;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

const OUTPUT_COLORS = ['#22C55E', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

function getBranchSummary(data) {
  const p = data.parameters || {};
  switch (data.registryKey) {
    case 'if': {
      const conds = p.conditions?.conditions || p['conditions.conditions'] || [];
      return conds.length > 0 ? `${conds.length} condition(s)` : 'No conditions set';
    }
    case 'switch': {
      const rules = p.rules?.values || p['rules.values'] || [];
      return rules.length > 0 ? `${rules.length} rule(s) + fallback` : 'No rules set';
    }
    case 'splitInBatches':
      return `Batch size: ${p.batchSize || 10}`;
    default:
      return data.description || '';
  }
}

export default function N8nBranchNode({ data, selected, id }) {
  const inputs = data.inputs || ['main'];
  const outputs = data.outputs || ['main', 'main'];
  const outputLabels = data.outputLabels || outputs.map((_, i) => `Output ${i}`);

  return (
    <div
      className={`rounded-xl border bg-card min-w-[220px] max-w-[280px] transition-all ${selected ? 'ring-2 ring-primary border-primary shadow-lg' : 'border-border shadow-sm'}`}
    >
      {/* Header */}
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b'
        style={{ background: `${data.color || '#FF9500'}15` }}
      >
        <NodeIcon name={data.icon} registryKey={data.registryKey} size={14} color={data.color} />
        <span className='text-xs font-semibold truncate flex-1 text-foreground'>{data.label}</span>
      </div>

      {/* Summary */}
      <div className='px-3 py-1.5 text-[11px] text-muted-foreground'>
        {getBranchSummary(data)}
      </div>

      {/* Output labels */}
      <div className='px-3 pb-2 flex flex-col gap-0.5'>
        {outputLabels.map((label, i) => (
          <div key={i} className='flex items-center gap-1.5'>
            <div
              className='w-2 h-2 rounded-full'
              style={{ background: OUTPUT_COLORS[i % OUTPUT_COLORS.length] }}
            />
            <span className='text-[10px] text-muted-foreground'>{label}</span>
          </div>
        ))}
      </div>

      {/* Input handles */}
      {inputs.map((_, i) => (
        <Handle
          key={`in-${i}`}
          type='target'
          position={Position.Left}
          id={`input_${i}`}
          style={{
            top: '50%',
            width: 10,
            height: 10,
            background: 'var(--muted-foreground)',
            border: '2px solid var(--border)',
          }}
        />
      ))}

      {/* Output handles — evenly spaced */}
      {outputs.map((_, i) => (
        <Handle
          key={`out-${i}`}
          type='source'
          position={Position.Right}
          id={`output_${i}`}
          style={{
            top: `${((i + 1) / (outputs.length + 1)) * 100}%`,
            width: 10,
            height: 10,
            background: OUTPUT_COLORS[i % OUTPUT_COLORS.length],
            border: '2px solid var(--border)',
          }}
        />
      ))}
    </div>
  );
}
