import React, { useState, useEffect } from 'react';
import { Thermometer, Hash } from 'lucide-react';
import {
  Button,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
} from "@datadack/common-ui"
import { RangeSlider } from './FormControls';
import { PROVIDER_META } from './constants';

export default function SubAgentEditorSheet({ open, onClose, subAgent, onSave, modelsByProvider, providerOptions }) {
  const [local, setLocal] = useState(subAgent ?? {});
  const [subProvider, setSubProvider] = useState('');

  useEffect(() => {
    if (subAgent) setLocal({ ...subAgent, role: subAgent.role || '' });
  }, [subAgent]);

  useEffect(() => {
    if (!local.model || Object.keys(modelsByProvider ?? {}).length === 0) return;
    const match = Object.entries(modelsByProvider).find(([, models]) =>
      models.includes(local.model),
    );
    if (match) setSubProvider(match[0]);
  }, [local.model, modelsByProvider]);

  const update = (key, val) => setLocal((prev) => ({ ...prev, [key]: val }));

  const initials = (local.name || 'AG').slice(0, 2).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side='right'
        className='w-[520px] sm:max-w-[520px] flex flex-col p-0 bg-background border-border'
      >
        {/* Header with avatar */}
        <SheetHeader className='px-5 pt-5 pb-4 shrink-0 border-b border-border'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 text-xs font-bold'>
              {initials}
            </div>
            <div className='flex-1 min-w-0'>
              <Input
                value={local.name ?? ''}
                onChange={(e) => update('name', e.target.value)}
                placeholder='Agent name'
                className='h-8 text-sm font-semibold border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40'
              />
              <Input
                value={local.role ?? ''}
                onChange={(e) => update('role', e.target.value)}
                placeholder='Role — e.g. Researcher, Writer, Reviewer'
                className='h-6 text-xs text-muted-foreground border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30'
              />
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className='flex-1'>
          <div className='flex flex-col px-5 py-5 gap-6'>

            {/* ── Model ── */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col gap-1.5'>
                <label className='text-[11px] font-medium text-muted-foreground'>Provider</label>
                <Select value={subProvider} onValueChange={(val) => { setSubProvider(val); update('model', ''); }}>
                  <SelectTrigger className='h-9 text-sm bg-muted/30 border-border/50'>
                    <SelectValue placeholder='Select provider' />
                  </SelectTrigger>
                  <SelectContent>
                    {(providerOptions ?? []).map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className='flex items-center gap-2'>{p.icon && <p.icon size={18} />}{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-[11px] font-medium text-muted-foreground'>Model</label>
                <Select value={local.model ?? ''} onValueChange={(val) => update('model', val)} disabled={!subProvider}>
                  <SelectTrigger className='h-9 text-sm bg-muted/30 border-border/50'>
                    <SelectValue placeholder={subProvider ? 'Select model' : 'Provider first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {((modelsByProvider ?? {})[subProvider] ?? []).map((m) => (
                      <SelectItem key={m} value={m}>
                        <span className='flex items-center gap-2'>{PROVIDER_META[subProvider]?.icon && React.createElement(PROVIDER_META[subProvider].icon, { size: 18 })}{m}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Instructions ── */}
            <div className='flex flex-col gap-2'>
              <label className='text-[11px] font-medium text-muted-foreground'>Instructions</label>
              <textarea
                value={local.system_prompt ?? ''}
                onChange={(e) => update('system_prompt', e.target.value)}
                placeholder={'Describe what this sub-agent should do...\n\ne.g. You are a research agent. Your job is to find relevant information and summarize key findings.'}
                rows={10}
                className='w-full resize-y min-h-[140px] rounded-lg border-0 bg-muted/30 px-3.5 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-shadow'
              />
            </div>

            {/* ── Parameters ── */}
            <div className='flex flex-col gap-4'>
              <RangeSlider
                label='Temperature'
                icon={Thermometer}
                value={local.temperature ?? 0.7}
                min={0} max={2} step={0.01}
                onChange={(v) => update('temperature', v)}
                hint='Controls randomness'
              />
              <RangeSlider
                label='Max Tokens'
                icon={Hash}
                value={local.max_tokens ?? 4096}
                min={256} max={32768} step={256}
                onChange={(v) => update('max_tokens', v)}
                hint='Maximum response length'
              />
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className='px-5 py-4 shrink-0 border-t border-border flex flex-row items-center justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={onClose}>Cancel</Button>
          <Button
            size='sm'
            className='bg-[#D4AF37] hover:bg-[#B8860B] text-white'
            onClick={() => { onSave(local); onClose(); }}
          >
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
