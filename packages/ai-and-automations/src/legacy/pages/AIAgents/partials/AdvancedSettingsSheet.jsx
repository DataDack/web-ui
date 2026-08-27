import React from 'react';
import {
  Settings2,
  Thermometer,
  SlidersHorizontal,
  Hash,
  Code2,
  FileJson,
  Braces,
  Variable,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Toggle, InfoTooltip } from './FormControls';

export default function AdvancedSettingsSheet({ open, onClose, cfg, updateCfg, agentType }) {
  const paramSource = cfg.param_source ?? { temperature: 'static', top_p: 'static', max_tokens: 'static' };
  const setParamSource = (key, source) => {
    updateCfg('param_source', { ...paramSource, [key]: source });
  };

  const PARAM_ITEMS = [
    { key: 'temperature', label: 'Temperature', staticVal: cfg.temperature, icon: Thermometer },
    { key: 'top_p', label: 'Top P', staticVal: cfg.top_p, icon: SlidersHorizontal },
    { key: 'max_tokens', label: 'Max Tokens', staticVal: cfg.max_tokens, icon: Hash },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side='right'
        className='w-[520px] sm:max-w-[520px] flex flex-col p-0 bg-background border-border'
      >
        <SheetHeader className='px-4 py-3 shrink-0 border-b border-border'>
          <SheetTitle className='text-sm font-semibold flex items-center gap-2'>
            <Settings2 size={14} className='text-violet-500' />
            Advanced Settings
          </SheetTitle>
          <p className='text-xs text-muted-foreground'>
            {agentType === 'conversational' ? 'Conversational' : 'Custom'} agent pipeline configuration
          </p>
        </SheetHeader>

        <Tabs defaultValue='config' className='flex flex-col flex-1 overflow-hidden'>
          <div className='px-4 pt-3 shrink-0'>
            <TabsList className='w-full'>
              <TabsTrigger value='config' className='flex-1 text-xs gap-1.5'>
                <Settings2 size={12} />
                Config
              </TabsTrigger>
              <TabsTrigger value='pipeline' className='flex-1 text-xs gap-1.5'>
                <Braces size={12} />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value='params' className='flex-1 text-xs gap-1.5'>
                <Variable size={12} />
                Parameters
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab: Pipeline ─────────────────────────────────────────── */}
          <TabsContent value='pipeline' className='flex-1 overflow-y-auto mt-0'>
            <div className='px-4 py-3 flex flex-col gap-4'>
              <p className='text-[11px] text-muted-foreground leading-relaxed'>
                Messages are sent to the model as an array. The pipeline below shows the order.
              </p>

              {/* Pipeline visualization */}
              <div className='rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 flex flex-col gap-0'>
                {[
                  { step: 1, label: 'System Prompt', desc: 'role: "system" — Your main agent instructions', color: 'violet', badge: 'Active', badgeActive: true },
                  { step: 2, label: 'Pre-Instructions', desc: 'role: "system" — Injected after system prompt, before history', color: 'orange', badge: cfg.pre_instructions?.trim() ? 'Active' : 'Empty', badgeActive: !!cfg.pre_instructions?.trim() },
                  { step: 3, label: 'State Messages', desc: 'state.messages[] — Programmatic messages from state', color: 'blue', badge: 'Array', badgeActive: true, badgeColor: 'blue' },
                  { step: 4, label: 'Conversation History + Current Message', desc: 'User/assistant turns including the current user input', color: 'violet', badge: 'Active', badgeActive: true },
                  { step: 5, label: 'Post-Instructions', desc: 'role: "system" — Injected after user message (output shaping)', color: 'orange', badge: cfg.post_instructions?.trim() ? 'Active' : 'Empty', badgeActive: !!cfg.post_instructions?.trim(), last: true },
                ].map((s) => (
                  <div key={s.step} className='flex items-start gap-2.5'>
                    <div className='flex flex-col items-center'>
                      <div className={`h-5 w-5 rounded-full bg-${s.color}-500/20 flex items-center justify-center text-${s.color}-400 text-[9px] font-bold`}>{s.step}</div>
                      {!s.last && <div className='w-px h-full bg-violet-500/20 min-h-[12px]' />}
                    </div>
                    <div className={`flex-1 ${s.last ? '' : 'pb-2.5'}`}>
                      <span className={`text-[11px] font-semibold text-${s.color}-400`}>{s.label}</span>
                      <p className='text-[10px] text-muted-foreground'>{s.desc}</p>
                    </div>
                    <Badge variant='outline' className={`text-[9px] shrink-0 ${s.badgeActive
                      ? `border-${s.badgeColor ?? 'emerald'}-500/30 bg-${s.badgeColor ?? 'emerald'}-500/10 text-${s.badgeColor ?? 'emerald'}-400`
                      : 'border-border text-muted-foreground/50'
                    }`}>
                      {s.badge}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Pre-instructions editor */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium flex items-center gap-1.5'>
                  <Code2 size={11} className='text-[#D4AF37]' />
                  Pre-Instructions
                  <span className='text-[10px] text-muted-foreground font-normal'>— runs before conversation history</span>
                </label>
                <textarea
                  value={cfg.pre_instructions ?? ''}
                  onChange={(e) => updateCfg('pre_instructions', e.target.value)}
                  placeholder={'// Custom instruction injected after system prompt\n// e.g. "Always respond in JSON format"\n// e.g. "Context from previous pipeline: {{state.context}}"'}
                  rows={4}
                  className='w-full resize-y rounded-lg border border-input bg-muted/20 px-3 py-2.5 text-xs font-mono leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-shadow'
                />
              </div>

              {/* Post-instructions editor */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium flex items-center gap-1.5'>
                  <Code2 size={11} className='text-[#D4AF37]' />
                  Post-Instructions
                  <span className='text-[10px] text-muted-foreground font-normal'>— runs after user message (output shaping)</span>
                </label>
                <textarea
                  value={cfg.post_instructions ?? ''}
                  onChange={(e) => updateCfg('post_instructions', e.target.value)}
                  placeholder={'// Custom instruction injected after the user message\n// e.g. "Format your response as markdown"\n// e.g. "Include confidence score 0-100"'}
                  rows={4}
                  className='w-full resize-y rounded-lg border border-input bg-muted/20 px-3 py-2.5 text-xs font-mono leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-shadow'
                />
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Parameters ───────────────────────────────────────── */}
          <TabsContent value='params' className='flex-1 overflow-y-auto mt-0'>
            <div className='px-4 py-3 flex flex-col gap-4'>
              <p className='text-[11px] text-muted-foreground leading-relaxed'>
                Each parameter can use a static value (hardcoded) or read dynamically from state variables.
              </p>

              <div className='rounded-lg border border-border overflow-hidden'>
                <div className='grid grid-cols-[1fr_80px_1fr] gap-2 px-3 py-2 bg-muted/30 border-b border-border'>
                  <span className='text-[10px] font-semibold text-muted-foreground'>Parameter</span>
                  <span className='text-[10px] font-semibold text-muted-foreground text-center'>Source</span>
                  <span className='text-[10px] font-semibold text-muted-foreground'>Value</span>
                </div>

                {PARAM_ITEMS.map((p) => {
                  const Icon = p.icon;
                  const isState = paramSource[p.key] === 'state';
                  return (
                    <div key={p.key} className='grid grid-cols-[1fr_80px_1fr] gap-2 px-3 py-2 border-b border-border last:border-b-0 items-center'>
                      <div className='flex items-center gap-1.5'>
                        <Icon size={11} className='text-muted-foreground' />
                        <span className='text-[11px] font-medium'>{p.label}</span>
                      </div>
                      <div className='flex justify-center'>
                        <button
                          onClick={() => setParamSource(p.key, isState ? 'static' : 'state')}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                            isState
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-muted/50 text-muted-foreground border border-border hover:border-violet-500/30'
                          }`}
                        >
                          {isState ? 'STATE' : 'STATIC'}
                        </button>
                      </div>
                      <div className='text-[11px] font-mono truncate'>
                        {isState ? (
                          <span className='text-blue-400'>{`{{state.${p.key}}}`}</span>
                        ) : (
                          <span className='text-muted-foreground'>{String(p.staticVal)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className='rounded-md border border-border bg-muted/10 px-3 py-2'>
                <p className='text-[10px] text-muted-foreground leading-relaxed'>
                  <strong>Static</strong> — uses the value set in the config above (hardcoded).{' '}
                  <strong>State</strong> — reads the value from state variables at runtime, allowing dynamic control.
                </p>
              </div>

              {/* ── JSON Output (Custom type only) ──────────────── */}
              {agentType === 'custom' && (
                <div className='flex flex-col gap-2'>
                  <span className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>
                    Output Format
                  </span>
                  <div className='rounded-md border border-border bg-muted/10 divide-y divide-border'>
                    <div className='flex items-center justify-between px-3 py-2'>
                      <div className='flex items-center gap-1.5'>
                        <FileJson size={12} className='text-[#D4AF37]' />
                        <span className='text-xs font-medium'>JSON Output</span>
                        <span className='text-[11px] text-muted-foreground'>Force valid JSON</span>
                      </div>
                      <Toggle
                        checked={cfg.json_output ?? false}
                        onChange={(val) => updateCfg('json_output', val)}
                      />
                    </div>
                    {cfg.json_output && (
                      <div className='px-3 py-2'>
                        <label className='text-[11px] font-medium text-muted-foreground mb-1 block'>
                          JSON Schema (Optional)
                        </label>
                        <textarea
                          value={cfg.json_schema ?? ''}
                          onChange={(e) => updateCfg('json_schema', e.target.value)}
                          placeholder='{\n  "type": "object",\n  "properties": { ... }\n}'
                          rows={4}
                          className='w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40'
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Config ────────────────────────────────────────── */}
          <TabsContent value='config' className='flex-1 overflow-y-auto mt-0'>
            <div className='px-4 py-3 flex flex-col gap-4'>
              {/* Basic Config */}
              <div className='flex flex-col gap-2'>
                <span className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>
                  Basic Config
                </span>

                <div className='rounded-md border border-border bg-muted/10 divide-y divide-border'>
                  <div className='flex items-center justify-between px-3 py-2'>
                    <div>
                      <span className='text-xs font-medium'>Stream Response</span>
                      <span className='text-[11px] text-muted-foreground ml-2'>Stream tokens as generated</span>
                    </div>
                    <Toggle
                      checked={cfg.stream_response ?? true}
                      onChange={(val) => updateCfg('stream_response', val)}
                    />
                  </div>

                  <div className='flex flex-col'>
                    <div className='flex items-center justify-between px-3 py-2'>
                      <div>
                        <span className='text-xs font-medium'>Use Personal API Key</span>
                        <span className='text-[11px] text-muted-foreground ml-2'>Use your own provider key</span>
                      </div>
                      <Toggle
                        checked={cfg.use_personal_api_key ?? false}
                        onChange={(val) => updateCfg('use_personal_api_key', val)}
                      />
                    </div>
                    {cfg.use_personal_api_key && (
                      <div className='px-3 pb-2.5'>
                        <Input
                          type='password'
                          value={cfg.personal_api_key ?? ''}
                          onChange={(e) => updateCfg('personal_api_key', e.target.value)}
                          placeholder='sk-... or your provider API key'
                          className='h-8 text-xs font-mono'
                        />
                        <p className='text-[10px] text-muted-foreground mt-1.5'>
                          Your key is stored with the agent config and used instead of the system key.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className='flex items-center justify-between px-3 py-2'>
                    <div>
                      <span className='text-xs font-medium'>Show Sources</span>
                      <span className='text-[11px] text-muted-foreground ml-2'>Citation sources in responses</span>
                    </div>
                    <Toggle
                      checked={cfg.show_sources ?? true}
                      onChange={(val) => updateCfg('show_sources', val)}
                    />
                  </div>
                </div>
              </div>

              {/* Provider Overrides */}
              <div className='flex flex-col gap-2'>
                <span className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>
                  Provider Overrides
                </span>
                <div className='rounded-md border border-border bg-muted/10 p-3 flex flex-col gap-2.5'>
                  <div className='flex flex-col gap-1'>
                    <label className='text-xs font-medium'>
                      Base URL <span className='text-muted-foreground font-normal'>(Optional)</span>
                    </label>
                    <Input
                      value={cfg.base_url ?? ''}
                      onChange={(e) => updateCfg('base_url', e.target.value)}
                      placeholder='Enter your Base URL here.'
                      className='h-8 text-xs'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-2.5'>
                    <div className='flex flex-col gap-1'>
                      <label className='text-xs font-medium flex items-center gap-1'>
                        Endpoint
                        <InfoTooltip text='Custom API endpoint path for your model provider' />
                      </label>
                      <Input
                        value={cfg.endpoint ?? ''}
                        onChange={(e) => updateCfg('endpoint', e.target.value)}
                        placeholder='Enter Endpoint'
                        className='h-8 text-xs'
                      />
                    </div>
                    <div className='flex flex-col gap-1'>
                      <label className='text-xs font-medium flex items-center gap-1'>
                        Deployment ID
                        <InfoTooltip text='Azure OpenAI deployment ID or equivalent' />
                      </label>
                      <Input
                        value={cfg.deployment_id ?? ''}
                        onChange={(e) => updateCfg('deployment_id', e.target.value)}
                        placeholder='Enter Deployment ID'
                        className='h-8 text-xs'
                      />
                    </div>
                  </div>

                  <div className='flex flex-col gap-1'>
                    <label className='text-xs font-medium flex items-center gap-1'>
                      Fine-Tuned Model ID
                      <InfoTooltip text='ID of a fine-tuned model to use instead of the base model' />
                    </label>
                    <Input
                      value={cfg.fine_tuned_model_id ?? ''}
                      onChange={(e) => updateCfg('fine_tuned_model_id', e.target.value)}
                      placeholder='Enter fine-tuned model ID'
                      className='h-8 text-xs'
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
