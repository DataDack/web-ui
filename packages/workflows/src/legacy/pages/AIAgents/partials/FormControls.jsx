import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@datadack/common-ui"

export function RangeSlider({ label, icon: Icon, value, min, max, step, onChange, hint }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between'>
        <label className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
          {Icon && <Icon size={11} />}
          {label}
        </label>
        <span className='text-xs font-mono tabular-nums'>{value}</span>
      </div>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>
          onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
        }
        className='w-full accent-[#D4AF37] cursor-pointer h-1.5'
      />
      {hint && <span className='text-[10px] text-muted-foreground'>{hint}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${checked ? 'bg-violet-500' : 'bg-muted'
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

export function InfoTooltip({ text }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle size={14} className='text-muted-foreground/60 cursor-help' />
        </TooltipTrigger>
        <TooltipContent side='top' className='max-w-[220px] text-xs'>
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
