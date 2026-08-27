/*
  NodeConfigHeader — Node identity header for the config panel.
  Shows node icon, inline-editable label, and type badge.
*/

import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BRAND_ICON_MAP } from '../../../components/workflows/workflowIconMap';

export default function NodeConfigHeader({ data, def, onLabelChange }) {
  const BrandIcon = data.registryKey ? BRAND_ICON_MAP[data.registryKey] : null;

  return (
    <div className='px-4 py-3 border-b'>
      <div className='flex items-center gap-2.5'>
        <div
          className='w-8 h-8 rounded-lg flex items-center justify-center shrink-0'
          style={{ background: `${data.color || '#666'}20` }}
        >
          {BrandIcon ? (
            <BrandIcon size={16} className='text-foreground' />
          ) : (
            <div
              className='w-3 h-3 rounded-full'
              style={{ background: data.color || '#666' }}
            />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <Input
            value={data.label || ''}
            onChange={(e) => onLabelChange(e.target.value)}
            className='h-7 text-sm font-semibold border-transparent bg-transparent px-1.5 hover:bg-muted/30 focus:bg-background focus:border-input'
          />
          <div className='flex items-center gap-1.5 mt-0.5 px-1.5'>
            <Badge variant='secondary' className='text-[9px] h-4 px-1.5 font-normal'>
              {def?.n8nType || 'Unknown'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
