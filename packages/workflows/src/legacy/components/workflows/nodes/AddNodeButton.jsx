import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@datadack/common-ui"

export default function AddNodeButton({ data }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={data?.onClick}
            className='group cursor-pointer'
          >
            <div className='w-11 h-11 rounded-full bg-gradient-to-br from-[#D4AF37]/60 to-[#B8860B]/60 flex items-center justify-center shadow-md ring-2 ring-[#D4AF37]/20 transition-all group-hover:from-[#D4AF37] group-hover:to-[#B8860B] group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#D4AF37]/20 group-hover:ring-[#D4AF37]/50'>
              <Plus size={20} strokeWidth={2.5} className='text-white' />
            </div>

            <Handle
              type='target'
              position={Position.Left}
              id='input_0'
              style={{
                top: '50%',
                width: 10,
                height: 10,
                background: 'var(--muted-foreground)',
                border: '2px solid var(--border)',
              }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side='bottom' className='text-xs'>
          Add Node
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
