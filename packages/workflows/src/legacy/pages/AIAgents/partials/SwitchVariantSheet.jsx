import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  Plus,
  Trash2,
  Shuffle,
  MessageSquare,
  Cpu,
  Variable,
  Copy,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"

const DEFAULT_VARS = [
  { name: 'conversation_id', type: 'string', defaultValue: '', system: true },
  { name: 'prompt_tokens', type: 'number', defaultValue: '0', system: true },
  { name: 'completion_tokens', type: 'number', defaultValue: '0', system: true },
  { name: 'total_tokens', type: 'number', defaultValue: '0', system: true },
  { name: 'messages', type: 'array', defaultValue: '[]', system: true },
];

export default function SwitchVariantSheet({ open, onClose, currentVariant, onSwitch, cfg, onUpdateCfg }) {
  const isSystem = (sv) => !!sv.system;
  const isLocked = (sv) => sv.system && currentVariant === 'conversational';

  const [stateVars, setStateVars] = useState(() => {
    try {
      const parsed = JSON.parse(cfg?.custom_state_schema || '[]');
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VARS;
    } catch { return DEFAULT_VARS; }
  });

  // Sync from cfg when sheet opens
  useEffect(() => {
    if (open) {
      try {
        const parsed = JSON.parse(cfg?.custom_state_schema || '[]');
        setStateVars(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VARS);
      } catch { setStateVars(DEFAULT_VARS); }
    }
  }, [open, cfg?.custom_state_schema]);

  const addStateVar = () => {
    setStateVars((prev) => [...prev, { name: `var_${prev.length}`, type: 'string', defaultValue: '' }]);
  };

  const removeStateVar = (idx) => {
    setStateVars((prev) => {
      const sv = prev[idx];
      if (sv?.system) return prev; // System vars can never be deleted
      return prev.filter((_, i) => i !== idx);
    });
  };

  const toggleStateVar = (idx) => {
    setStateVars((prev) => prev.map((v, i) =>
      i === idx ? { ...v, disabled: !v.disabled } : v,
    ));
  };

  const updateStateVar = (idx, field, val) => {
    setStateVars((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v)));
  };

  const copyRef = (varName) => {
    navigator.clipboard?.writeText(`{{state.${varName}}}`);
    toast.success(`Copied {{state.${varName}}} to clipboard`, { autoClose: 1500 });
  };

  const handleSwitch = (variant) => {
    onSwitch(variant);
    if (variant === 'conversational') {
      // Restore any missing system defaults and keep user-added vars
      const systemNames = new Set(DEFAULT_VARS.map((v) => v.name));
      const userVars = stateVars.filter((v) => !v.system && !systemNames.has(v.name));
      setStateVars([...DEFAULT_VARS, ...userVars]);
    }
  };

  const handleSave = () => {
    onUpdateCfg('custom_state_enabled', true);
    onUpdateCfg('custom_state_schema', JSON.stringify(stateVars));
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side='right' className='w-[520px] sm:max-w-[520px] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col'>
        <SheetHeader className='px-6 py-4 border-b border-border'>
          <SheetTitle className='text-sm flex items-center gap-2'>
            <Shuffle size={14} className='text-violet-500' />
            Switch Agent Variant
          </SheetTitle>
          <p className='text-xs text-muted-foreground mt-1'>
            Choose agent variant and configure state variables for prompt chaining.
          </p>
        </SheetHeader>

        <div className='px-6 py-5 flex flex-col gap-5 flex-1 overflow-y-auto'>
          {/* ── Variant Selection ── */}
          <div className='flex flex-col gap-3'>
            <span className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>Agent Variant</span>
            <div className='grid grid-cols-1 gap-3'>
              <button
                onClick={() => handleSwitch('conversational')}
                className={`rounded-lg border-2 p-3.5 text-left transition-all ${currentVariant === 'conversational'
                  ? 'border-violet-500 bg-violet-500/5'
                  : 'border-border hover:border-violet-500/40 hover:bg-violet-500/5'
                  }`}
              >
                <div className='flex items-center gap-2 mb-1.5'>
                  <MessageSquare size={14} className='text-violet-500' />
                  <span className='text-xs font-semibold'>Conversational</span>
                </div>
                {currentVariant === 'conversational' && (
                  <Badge variant='outline' className='text-[9px] border-violet-500/40 text-violet-500 bg-violet-500/10 mb-1.5'>
                    Active
                  </Badge>
                )}
                <p className='text-[11px] text-muted-foreground leading-relaxed'>
                  Chat interface with single message input and streaming response.
                </p>
              </button>

              <button
                onClick={() => handleSwitch('custom')}
                className={`rounded-lg border-2 p-3.5 text-left transition-all ${currentVariant === 'custom'
                  ? 'border-violet-500 bg-violet-500/5'
                  : 'border-border hover:border-violet-500/40 hover:bg-violet-500/5'
                  }`}
              >
                <div className='flex items-center gap-2 mb-1.5'>
                  <Cpu size={14} className='text-violet-500' />
                  <span className='text-xs font-semibold'>Custom</span>
                </div>
                {currentVariant === 'custom' && (
                  <Badge variant='outline' className='text-[9px] border-violet-500/40 text-violet-500 bg-violet-500/10 mb-1.5'>
                    Active
                  </Badge>
                )}
                <p className='text-[11px] text-muted-foreground leading-relaxed'>
                  Multiple inputs/outputs for pipeline and workflow integration.
                </p>
              </button>
            </div>
          </div>

          {/* ── State Variables ── */}
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
              <Variable size={13} className='text-muted-foreground' />
              <span className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
                State Variables
              </span>
            </div>

                <div className='rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5'>
                  <p className='text-[11px] text-violet-400 leading-relaxed'>
                    State variables persist across turns and can be referenced in your prompt using the syntax:
                  </p>
                  <code className='inline-block mt-1.5 px-2 py-1 rounded bg-violet-500/10 text-[11px] font-mono text-violet-300 border border-violet-500/20'>
                    {'{{state.variable_name}}'}
                  </code>
                  <p className='text-[10px] text-muted-foreground mt-1.5'>
                    Use them to track conversation context, counters, user preferences, or any data the agent should remember.
                  </p>
                </div>

                {/* State variable table */}
                <div className='rounded-lg border border-border overflow-hidden'>
                  {/* Header */}
                  <div className='grid grid-cols-[1fr_80px_1fr_60px] gap-2 px-3 py-2 bg-muted/30 border-b border-border'>
                    <span className='text-[10px] font-semibold text-muted-foreground'>Name</span>
                    <span className='text-[10px] font-semibold text-muted-foreground'>Type</span>
                    <span className='text-[10px] font-semibold text-muted-foreground'>Default</span>
                    <span className='text-[10px] font-semibold text-muted-foreground text-center'>Actions</span>
                  </div>

                  {stateVars.length === 0 ? (
                    <div className='px-3 py-6 text-center'>
                      <Variable size={20} className='mx-auto text-muted-foreground/30 mb-2' />
                      <p className='text-[11px] text-muted-foreground/60'>No state variables defined</p>
                    </div>
                  ) : (
                    stateVars.map((sv, i) => {
                      const locked = isLocked(sv);
                      return (
                        <div key={i} className={`grid grid-cols-[1fr_80px_1fr_60px] gap-2 px-3 py-1.5 border-b border-border last:border-b-0 items-center ${locked ? 'bg-muted/20' : ''} ${sv.disabled ? 'opacity-40' : ''}`}>
                          <input
                            value={sv.name}
                            onChange={(e) => updateStateVar(i, 'name', e.target.value.replace(/\s/g, '_'))}
                            disabled={locked || sv.system}
                            className={`rounded border border-input bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${(locked || sv.system) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            placeholder='var_name'
                          />
                          <Select
                            value={sv.type}
                            onValueChange={(val) => updateStateVar(i, 'type', val)}
                            disabled={locked}
                          >
                            <SelectTrigger className={`h-7 text-[11px] ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='string'>String</SelectItem>
                              <SelectItem value='number'>Number</SelectItem>
                              <SelectItem value='boolean'>Boolean</SelectItem>
                              <SelectItem value='json'>JSON</SelectItem>
                              <SelectItem value='array'>Array</SelectItem>
                            </SelectContent>
                          </Select>
                          {sv.name === 'conversation_id' ? (
                            <Select
                              value={sv.defaultValue === 'auto_generated' ? 'auto_generated' : 'manual'}
                              onValueChange={(val) => updateStateVar(i, 'defaultValue', val === 'manual' ? '' : val)}
                              disabled={locked}
                            >
                              <SelectTrigger className='h-7 text-[11px]'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='manual'>Manual</SelectItem>
                                <SelectItem value='auto_generated'>Auto-generated</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <input
                              value={sv.defaultValue}
                              onChange={(e) => updateStateVar(i, 'defaultValue', e.target.value)}
                              disabled={locked}
                              className={`rounded border border-input bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                              placeholder={sv.type === 'number' ? '0' : sv.type === 'boolean' ? 'false' : ''}
                            />
                          )}
                          <div className='flex items-center justify-center gap-1'>
                            <button
                              onClick={() => copyRef(sv.name)}
                              className='h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-violet-500 hover:bg-violet-500/10 transition-colors'
                              title={`Copy {{state.${sv.name}}}`}
                            >
                              <Copy size={11} />
                            </button>
                            {isSystem(sv) ? (
                              currentVariant === 'custom' ? (
                                <button
                                  onClick={() => toggleStateVar(i)}
                                  className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                                    sv.disabled
                                      ? 'text-muted-foreground/40 hover:text-emerald-500 hover:bg-emerald-500/10'
                                      : 'text-emerald-500 hover:text-muted-foreground hover:bg-muted/40'
                                  }`}
                                  title={sv.disabled ? 'Enable variable' : 'Disable variable'}
                                >
                                  {sv.disabled ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                                </button>
                              ) : (
                                <span className='h-6 w-6 flex items-center justify-center text-muted-foreground/30' title='System variable'>
                                  <Info size={11} />
                                </span>
                              )
                            ) : (
                              <button
                                onClick={() => removeStateVar(i)}
                                className='h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors'
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 gap-1.5 text-xs self-start'
                  onClick={addStateVar}
                >
                  <Plus size={12} />
                  Add Variable
                </Button>

                {/* Quick reference for existing variables */}
                {stateVars.length > 0 && (
                  <div className='rounded-lg border border-border bg-muted/20 px-3 py-2.5'>
                    <span className='text-[10px] font-semibold text-muted-foreground block mb-1.5'>Quick Reference — paste into your prompt:</span>
                    <div className='flex flex-wrap gap-1.5'>
                      {stateVars.map((sv) => (
                        <button
                          key={sv.name}
                          onClick={() => copyRef(sv.name)}
                          className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 text-[10px] font-mono border border-violet-500/20 hover:bg-violet-500/20 transition-colors cursor-pointer'
                        >
                          {`{{state.${sv.name}}}`}
                          <Copy size={9} className='text-violet-400/60' />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
          </div>
        </div>

        <SheetFooter className='px-6 py-4 border-t border-border bg-muted/20 flex-row justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={onClose}>Cancel</Button>
          <Button size='sm' className='bg-violet-600 hover:bg-violet-700 text-white' onClick={handleSave}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
