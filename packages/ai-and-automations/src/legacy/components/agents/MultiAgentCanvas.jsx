/*
Copyright (C) 2025 DataDack Technologies Pvt. Ltd.
Multi-Agent Visual Canvas — React Flow based node editor for agent orchestration.
VectorShift-style rich inline agent nodes with provider/model selection,
instructions, tools, and I/O configuration.
*/

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
  Panel,
  getBezierPath,
  BaseEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Bot,
  MessageSquare,
  ArrowRightFromLine,
  ArrowLeftToLine,
  Search,
  Wrench,
  BookOpen,
  GitFork,
  StickyNote,
  Plus,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Zap,
  Globe,
  Code2,
  FileText,
  Database,
  LayoutGrid,
  Pencil,
  Copy,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Lock,
  Unlock,
  RefreshCw,
  Check,
} from 'lucide-react';

// ── Node type definitions (palette items) ────────────────────────────────────

const NODE_PALETTE = [
  {
    category: 'Start',
    items: [
      { type: 'inputNode', label: 'Input', icon: ArrowLeftToLine, description: 'User input entry point', color: '#3b82f6' },
      { type: 'outputNode', label: 'Output', icon: ArrowRightFromLine, description: 'Pipeline output', color: '#10b981' },
    ],
  },
  {
    category: 'AI',
    items: [
      { type: 'agentNode', label: 'Agent', icon: Bot, description: 'AI Agent with model & prompt', color: '#8b5cf6' },
    ],
  },
  {
    category: 'Tools',
    items: [
      { type: 'toolNode', label: 'Web Search', icon: Globe, description: 'Search the web', color: '#06b6d4' },
      { type: 'toolNode', label: 'Code Exec', icon: Code2, description: 'Execute code', color: '#64748b' },
      { type: 'toolNode', label: 'File Read', icon: FileText, description: 'Read files', color: '#78716c' },
      { type: 'toolNode', label: 'DB Query', icon: Database, description: 'Query database', color: '#d946ef' },
    ],
  },
  {
    category: 'Knowledge',
    items: [
      { type: 'knowledgeNode', label: 'Knowledge Base', icon: BookOpen, description: 'RAG retrieval', color: '#D4AF37' },
    ],
  },
  {
    category: 'Logic',
    items: [
      { type: 'conditionNode', label: 'Condition', icon: GitFork, description: 'Branching logic', color: '#ec4899' },
    ],
  },
  {
    category: 'General',
    items: [
      { type: 'noteNode', label: 'Note', icon: StickyNote, description: 'Add a comment', color: '#a3a3a3' },
    ],
  },
];

// ── Shared handle styles ─────────────────────────────────────────────────────

const handleStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: '2px solid var(--border)',
  background: 'var(--background)',
};

// ── Inline select for nodes (prevents drag) ──────────────────────────────────

function NodeSelect({ value, onChange, options, placeholder, disabled, className = '' }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full rounded border border-border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {placeholder && <option value=''>{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function NodeInput({ value, onChange, placeholder, className = '', ...props }) {
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded border border-border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-500/50 ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      {...props}
    />
  );
}

function NodeTextarea({ value, onChange, placeholder, rows = 4, className = '' }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onHandleDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = ref.current?.offsetHeight || 80;

    const onMove = (ev) => {
      if (!dragging.current) return;
      const diff = ev.clientY - startY.current;
      setHeight(Math.max(60, startH.current + diff));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className='relative'>
      <textarea
        ref={ref}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={height ? { height } : undefined}
        className={`w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-[11px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500/50 min-h-[60px] ${className}`}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
      {/* Drag handle */}
      <div
        className='absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-violet-500/10 rounded-b transition-colors'
        onPointerDown={onHandleDown}
      >
        <div className='w-8 h-[3px] rounded-full bg-border' />
      </div>
    </div>
  );
}

// ── Rich Agent Node (VectorShift-style) ──────────────────────────────────────

function AgentNode({ data, selected, id }) {
  const [activeTab, setActiveTab] = useState('inputs');
  const [collapsed, setCollapsed] = useState(false);
  const allProviderOptions = data._providerOptions || [];
  const modelsByProvider = data._modelsByProvider || {};

  // Only show OpenAI unless personal API key is enabled
  const usePersonalKey = !!data.usePersonalApiKey;
  const providerOptions = usePersonalKey
    ? allProviderOptions
    : allProviderOptions.filter((p) => p.value === '1' || p.value === 1);

  const selectedProvider = data.provider || '';
  const modelOptions = selectedProvider && modelsByProvider[selectedProvider]
    ? modelsByProvider[selectedProvider].map((m) => ({ value: m, label: m }))
    : [];

  const update = (key, val) => {
    data._onUpdate?.(id, { ...data, [key]: val });
  };

  const inputs = data.inputs || [{ name: 'input_0', type: 'Text', value: '' }];
  const outputs = data.outputs || [];
  const tools = data.tools || [];

  const addInput = () => {
    update('inputs', [...inputs, { name: `input_${inputs.length}`, type: 'Text', value: '' }]);
  };

  const removeInput = (idx) => {
    update('inputs', inputs.filter((_, i) => i !== idx));
  };

  const updateInput = (idx, field, val) => {
    const next = inputs.map((inp, i) => (i === idx ? { ...inp, [field]: val } : inp));
    update('inputs', next);
  };

  const addTool = () => {
    update('tools', [...tools, { name: `tool_${tools.length}`, type: 'custom' }]);
  };

  const removeTool = (idx) => {
    update('tools', tools.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={`rounded-xl border bg-card shadow-lg min-w-[300px] max-w-[340px] transition-all ${
        selected
          ? 'ring-2 ring-violet-500 border-violet-500/50 shadow-xl shadow-violet-500/10'
          : 'border-border hover:shadow-xl'
      }`}
    >
      {/* ── Header ── */}
      <div className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b border-border bg-violet-500/5'>
        <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-500'>
          <Bot size={13} />
        </div>
        <span className='text-xs font-semibold text-foreground flex-1 truncate'>
          {data.label || 'Agent'}
        </span>

        {/* Toolbar icons */}
        <div className='flex items-center gap-0.5'>
          <button
            className='h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'
            onClick={() => setCollapsed((v) => !v)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
          <button
            className='h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => navigator.clipboard?.writeText(id)}
          >
            <Copy size={11} />
          </button>
          <button
            className='h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors'
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => data._onDelete?.(id)}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* ── Name bar ── */}
      <div className='px-3 py-1.5 border-b border-border bg-violet-500/[0.03]'>
        <NodeInput
          value={data.label}
          onChange={(v) => update('label', v)}
          placeholder='Agent name'
          className='text-center text-[11px] font-medium bg-transparent border-dashed'
        />
      </div>

      {!collapsed && (
        <div className='flex flex-col'>
          {/* ── Use Existing Agent toggle ── */}
          <div className='px-3 py-2 border-b border-border'>
            <label className='flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer'>
              <input
                type='checkbox'
                checked={!!data.useExisting}
                onChange={(e) => update('useExisting', e.target.checked)}
                className='rounded border-border accent-violet-500'
                onPointerDown={(e) => e.stopPropagation()}
              />
              Use Existing Agent
              <div className='flex-1' />
              {['New', 'Select', 'Boolean'].map((t) => (
                <span key={t} className='text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground cursor-pointer hover:bg-muted'>
                  {t}
                </span>
              ))}
            </label>
          </div>

          {/* ── Inputs & Outputs tabs ── */}
          <div className='border-b border-border'>
            <div className='flex items-center px-3 py-1.5'>
              <span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>Inputs and Outputs</span>
            </div>
            <div className='flex border-b border-border'>
              <button
                className={`flex-1 text-[10px] py-1 font-medium transition-colors ${
                  activeTab === 'inputs'
                    ? 'text-violet-500 border-b-2 border-violet-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('inputs')}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Inputs
              </button>
              <button
                className={`flex-1 text-[10px] py-1 font-medium transition-colors ${
                  activeTab === 'outputs'
                    ? 'text-violet-500 border-b-2 border-violet-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('outputs')}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Outputs
              </button>
            </div>

            {activeTab === 'inputs' && (
              <div className='px-3 py-2'>
                {/* Header row */}
                <div className='grid grid-cols-[1fr_60px_1fr] gap-1.5 mb-1'>
                  <span className='text-[9px] font-medium text-muted-foreground'>Name</span>
                  <span className='text-[9px] font-medium text-muted-foreground'>Type</span>
                  <span className='text-[9px] font-medium text-muted-foreground'>Value</span>
                </div>
                {inputs.map((inp, i) => (
                  <div key={i} className='grid grid-cols-[1fr_60px_1fr_16px] gap-1.5 mb-1 items-center'>
                    <NodeInput
                      value={inp.name}
                      onChange={(v) => updateInput(i, 'name', v)}
                      className='text-[10px] py-0.5'
                    />
                    <NodeSelect
                      value={inp.type}
                      onChange={(v) => updateInput(i, 'type', v)}
                      options={[
                        { value: 'Text', label: 'Text' },
                        { value: 'Number', label: 'Num' },
                        { value: 'Boolean', label: 'Bool' },
                        { value: 'JSON', label: 'JSON' },
                        { value: 'Image', label: 'Img' },
                        { value: 'File', label: 'File' },
                      ]}
                      className='text-[10px] py-0.5 px-1'
                    />
                    <NodeInput
                      value={inp.value}
                      onChange={(v) => updateInput(i, 'value', v)}
                      className='text-[10px] py-0.5'
                    />
                    <button
                      className='h-4 w-4 flex items-center justify-center rounded text-muted-foreground/50 hover:text-red-400 transition-colors'
                      onClick={() => removeInput(i)}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
                <button
                  className='text-[10px] text-violet-500 hover:text-violet-400 mt-1'
                  onClick={addInput}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  + Add Input
                </button>
              </div>
            )}

            {activeTab === 'outputs' && (
              <div className='px-3 py-2'>
                <div className='grid grid-cols-[1fr_60px_1fr] gap-1.5 mb-1'>
                  <span className='text-[9px] font-medium text-muted-foreground'>Name</span>
                  <span className='text-[9px] font-medium text-muted-foreground'>Type</span>
                  <span className='text-[9px] font-medium text-muted-foreground'>Value</span>
                </div>
                {outputs.map((out, i) => (
                  <div key={i} className='grid grid-cols-[1fr_60px_1fr_16px] gap-1.5 mb-1 items-center'>
                    <NodeInput
                      value={out.name}
                      onChange={(v) => {
                        const next = outputs.map((o, j) => (j === i ? { ...o, name: v } : o));
                        update('outputs', next);
                      }}
                      className='text-[10px] py-0.5'
                    />
                    <NodeSelect
                      value={out.type}
                      onChange={(v) => {
                        const next = outputs.map((o, j) => (j === i ? { ...o, type: v } : o));
                        update('outputs', next);
                      }}
                      options={[
                        { value: 'Text', label: 'Text' },
                        { value: 'Number', label: 'Num' },
                        { value: 'Boolean', label: 'Bool' },
                        { value: 'JSON', label: 'JSON' },
                      ]}
                      className='text-[10px] py-0.5 px-1'
                    />
                    <div className='text-[10px] text-muted-foreground/50 px-1'>—</div>
                    <button
                      className='h-4 w-4 flex items-center justify-center rounded text-muted-foreground/50 hover:text-red-400 transition-colors'
                      onClick={() => update('outputs', outputs.filter((_, j) => j !== i))}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
                <button
                  className='text-[10px] text-violet-500 hover:text-violet-400 mt-1'
                  onClick={() => update('outputs', [...outputs, { name: `output_${outputs.length}`, type: 'Text' }])}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  + Add Output
                </button>
              </div>
            )}
          </div>

          {/* ── Personal API Key toggle ── */}
          <div className='px-3 py-2 border-b border-border'>
            <label className='flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer'>
              <input
                type='checkbox'
                checked={usePersonalKey}
                onChange={(e) => {
                  update('usePersonalApiKey', e.target.checked);
                  if (!e.target.checked) {
                    update('personalApiKey', '');
                  }
                }}
                className='rounded border-border accent-violet-500'
                onPointerDown={(e) => e.stopPropagation()}
              />
              Use Personal API Key
            </label>
            {usePersonalKey && (
              <NodeInput
                type='password'
                value={data.personalApiKey || ''}
                onChange={(v) => update('personalApiKey', v)}
                placeholder='sk-...'
                className='mt-1.5 text-[10px] font-mono'
              />
            )}
          </div>

          {/* ── Provider ── */}
          <div className='px-3 py-2 border-b border-border'>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-[10px] font-medium text-muted-foreground'>Provider</span>
              <span className='text-[9px] text-muted-foreground/60'>Dropdown</span>
            </div>
            <NodeSelect
              value={selectedProvider}
              onChange={(v) => {
                update('provider', v);
                update('model', '');
              }}
              options={providerOptions.map((p) => ({ value: p.value, label: p.label }))}
              placeholder='Select provider...'
            />
          </div>

          {/* ── Model ── */}
          <div className='px-3 py-2 border-b border-border'>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-[10px] font-medium text-muted-foreground'>Model</span>
              <span className='text-[9px] text-muted-foreground/60'>Dropdown</span>
            </div>
            <NodeSelect
              value={data.model || ''}
              onChange={(v) => update('model', v)}
              options={modelOptions}
              placeholder={selectedProvider ? 'Select model...' : 'Select provider first'}
              disabled={!selectedProvider}
            />
          </div>

          {/* ── Instructions ── */}
          <div className='px-3 py-2 border-b border-border'>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-[10px] font-medium text-muted-foreground'>Instructions *</span>
              <div className='flex items-center gap-1'>
                <button className='text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground hover:bg-muted'
                  onPointerDown={(e) => e.stopPropagation()}>
                  Text
                </button>
              </div>
            </div>

            {/* Hint box */}
            <div className='rounded border border-violet-500/20 bg-violet-500/5 px-2 py-1.5 mb-2'>
              <p className='text-[9px] text-violet-400 leading-relaxed'>
                You can use the following <strong>Agent Inputs</strong> in your input area.
                {inputs.length > 0 && (
                  <span className='inline-flex items-center gap-1 ml-1'>
                    {inputs.slice(0, 2).map((inp) => (
                      <span key={inp.name} className='inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-500/15 text-violet-400 text-[8px] font-mono'>
                        {inp.name}
                      </span>
                    ))}
                  </span>
                )}
              </p>
              <p className='text-[8px] text-muted-foreground/70 mt-0.5'>
                Alternatively, you can add Agent Inputs or tools by typing &quot;&#123;&#123;&quot;
              </p>
            </div>

            <NodeTextarea
              value={data.systemPrompt || ''}
              onChange={(v) => update('systemPrompt', v)}
              placeholder='You are an intelligent assistant designed to provide helpful, accurate, and relevant information...'
              rows={5}
            />
          </div>

          {/* ── Tools ── */}
          <div className='px-3 py-2'>
            <div className='flex items-center justify-between mb-1.5'>
              <span className='text-[10px] font-medium text-muted-foreground'>Tools</span>
              <button
                className='text-[10px] text-violet-500 hover:text-violet-400 font-medium'
                onClick={addTool}
                onPointerDown={(e) => e.stopPropagation()}
              >
                + Add Tool
              </button>
            </div>

            {tools.length === 0 ? (
              <p className='text-[10px] text-muted-foreground/50 italic'>No tools configured</p>
            ) : (
              <div className='flex flex-col gap-1'>
                {tools.map((tool, i) => (
                  <div key={i} className='flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2 py-1'>
                    <Wrench size={10} className='text-muted-foreground shrink-0' />
                    <span className='text-[10px] text-foreground flex-1 truncate'>{tool.name}</span>
                    <button
                      className='h-4 w-4 flex items-center justify-center rounded text-muted-foreground/50 hover:text-red-400 transition-colors'
                      onClick={() => removeTool(i)}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Validation errors ── */}
          {inputs.some((inp) => !inp.value && !inp.value?.trim?.()) && (
            <div className='px-3 py-1.5 border-t border-red-500/20 bg-red-500/5'>
              {inputs.filter((inp) => !inp.value?.trim?.()).map((inp) => (
                <p key={inp.name} className='text-[10px] text-red-400 flex items-center gap-1'>
                  <span className='inline-block h-1.5 w-1.5 rounded-full bg-red-400' />
                  {inp.name} field is required
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Handles ── */}
      <Handle
        type='target'
        position={Position.Left}
        style={{ ...handleStyle, background: '#8b5cf6', borderColor: '#8b5cf6' }}
        className='!-left-[6px]'
      />
      <Handle
        type='source'
        position={Position.Right}
        style={{ ...handleStyle, background: '#8b5cf6', borderColor: '#8b5cf6' }}
        className='!-right-[6px]'
      />
    </div>
  );
}

// ── Knowledge Base Agent Node ────────────────────────────────────────────────

function KnowledgeAgentNode({ data, selected, id }) {
  const update = (key, val) => {
    data._onUpdate?.(id, { ...data, [key]: val });
  };

  return (
    <div
      className={`rounded-xl border bg-card shadow-lg min-w-[300px] max-w-[340px] transition-all ${
        selected
          ? 'ring-2 ring-[#D4AF37] border-[#D4AF37]/50 shadow-xl shadow-[#D4AF37]/10'
          : 'border-border hover:shadow-xl'
      }`}
    >
      <div className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b border-border bg-[#D4AF37]/5'>
        <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#D4AF37]/15 text-[#D4AF37]'>
          <BookOpen size={13} />
        </div>
        <span className='text-xs font-semibold text-foreground flex-1 truncate'>
          Knowledge Base Agent
        </span>
        <p className='text-[9px] text-muted-foreground'>Query a knowledge base using an agentic approach with tools.</p>
      </div>

      <div className='px-3 py-1.5 border-b border-border bg-[#D4AF37]/[0.03]'>
        <NodeInput
          value={data.label}
          onChange={(v) => update('label', v)}
          placeholder='knowledge_base_agent_0'
          className='text-center text-[11px] font-medium bg-transparent border-dashed'
        />
      </div>

      <div className='px-3 py-2 border-b border-border'>
        <div className='flex items-center justify-between mb-1'>
          <span className='text-[10px] font-medium text-muted-foreground'>Query *</span>
          <div className='flex items-center gap-1'>
            {['Text'].map((t) => (
              <span key={t} className='text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground'>{t}</span>
            ))}
          </div>
        </div>
        <NodeInput
          value={data.query || ''}
          onChange={(v) => update('query', v)}
          placeholder='Enter query...'
        />
      </div>

      <div className='px-3 py-2 border-b border-border'>
        <div className='flex items-center justify-between mb-1'>
          <span className='text-[10px] font-medium text-muted-foreground'>Knowledge Base *</span>
          <div className='flex items-center gap-1'>
            {['Select', 'Variable', 'Knowledge Base'].map((t) => (
              <span key={t} className='text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground cursor-pointer hover:bg-muted'>{t}</span>
            ))}
          </div>
        </div>
        <NodeSelect
          value={data.knowledgeBase || ''}
          onChange={(v) => update('knowledgeBase', v)}
          options={[]}
          placeholder='Search...'
        />
        <button
          className='text-[10px] text-[#D4AF37] hover:text-[#D4AF37] mt-1.5'
          onPointerDown={(e) => e.stopPropagation()}
        >
          + New Knowledge Base
        </button>
      </div>

      {/* Validation */}
      <div className='px-3 py-1.5 bg-red-500/5'>
        {!data.query?.trim() && (
          <p className='text-[10px] text-red-400 flex items-center gap-1'>
            <span className='inline-block h-1.5 w-1.5 rounded-full bg-red-400' />
            Query field is required
          </p>
        )}
        {!data.knowledgeBase && (
          <p className='text-[10px] text-red-400 flex items-center gap-1'>
            <span className='inline-block h-1.5 w-1.5 rounded-full bg-red-400' />
            Knowledge Base field is required
          </p>
        )}
      </div>

      <Handle
        type='target'
        position={Position.Left}
        style={{ ...handleStyle, background: '#D4AF37', borderColor: '#D4AF37' }}
        className='!-left-[6px]'
      />
      <Handle
        type='source'
        position={Position.Right}
        style={{ ...handleStyle, background: '#D4AF37', borderColor: '#D4AF37' }}
        className='!-right-[6px]'
      />
    </div>
  );
}

// ── Simpler nodes (Input, Output, LLM, Tool, Condition, Note) ────────────────

function NodeShell({ children, data, selected, color, handles = { input: true, output: true } }) {
  return (
    <div
      className={`rounded-xl border bg-card shadow-md transition-shadow min-w-[220px] max-w-[280px] ${
        selected
          ? 'ring-2 ring-violet-500 border-violet-500/50 shadow-lg shadow-violet-500/10'
          : 'border-border hover:shadow-lg'
      }`}
    >
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b border-border'
        style={{ background: `${color}12` }}
      >
        <div
          className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md'
          style={{ background: `${color}20`, color }}
        >
          {data.icon && <data.icon size={13} />}
        </div>
        <span className='text-xs font-semibold text-foreground truncate flex-1'>
          {data.label}
        </span>
        {data.badge && (
          <span
            className='text-[9px] font-medium px-1.5 py-0.5 rounded-full'
            style={{ background: `${color}15`, color }}
          >
            {data.badge}
          </span>
        )}
      </div>
      <div className='px-3 py-2.5 text-xs'>{children}</div>
      {handles.input && (
        <Handle type='target' position={Position.Left} style={handleStyle} className='!-left-[6px]' />
      )}
      {handles.output && (
        <Handle type='source' position={Position.Right} style={handleStyle} className='!-right-[6px]' />
      )}
    </div>
  );
}

function InputNode({ data, selected }) {
  return (
    <NodeShell data={data} selected={selected} color='#3b82f6' handles={{ input: false, output: true }}>
      <div className='flex flex-col gap-1.5'>
        <span className='text-muted-foreground text-[11px]'>Type</span>
        <div className='rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground'>
          {data.inputType || 'Text'}
        </div>
      </div>
    </NodeShell>
  );
}

function OutputNode({ data, selected }) {
  return (
    <NodeShell data={data} selected={selected} color='#10b981' handles={{ input: true, output: false }}>
      <div className='flex flex-col gap-1.5'>
        <span className='text-muted-foreground text-[11px]'>Type</span>
        <div className='rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground'>
          {data.outputType || 'Text'}
        </div>
      </div>
    </NodeShell>
  );
}

function LLMNode({ data, selected, id }) {
  const allProviderOptions = data._providerOptions || [];
  const modelsByProvider = data._modelsByProvider || {};
  const usePersonalKey = !!data.usePersonalApiKey;
  const providerOptions = usePersonalKey
    ? allProviderOptions
    : allProviderOptions.filter((p) => p.value === '1' || p.value === 1);
  const selectedProvider = data.provider || '';
  const modelOptions = selectedProvider && modelsByProvider[selectedProvider]
    ? modelsByProvider[selectedProvider].map((m) => ({ value: m, label: m }))
    : [];

  const update = (key, val) => {
    data._onUpdate?.(id, { ...data, [key]: val });
  };

  return (
    <div
      className={`rounded-xl border bg-card shadow-lg min-w-[280px] max-w-[320px] transition-all ${
        selected
          ? 'ring-2 ring-amber-500 border-amber-500/50 shadow-xl shadow-amber-500/10'
          : 'border-border hover:shadow-xl'
      }`}
    >
      <div className='flex items-center gap-2 px-3 py-2 rounded-t-xl border-b border-border bg-amber-500/5'>
        <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-500'>
          <Zap size={13} />
        </div>
        <span className='text-xs font-semibold text-foreground flex-1 truncate'>
          {data.label || 'LLM Call'}
        </span>
      </div>

      <div className='px-3 py-2 border-b border-border'>
        <span className='text-[10px] font-medium text-muted-foreground mb-1 block'>Provider</span>
        <NodeSelect
          value={selectedProvider}
          onChange={(v) => { update('provider', v); update('model', ''); }}
          options={providerOptions.map((p) => ({ value: p.value, label: p.label }))}
          placeholder='Select provider...'
        />
      </div>

      <div className='px-3 py-2 border-b border-border'>
        <span className='text-[10px] font-medium text-muted-foreground mb-1 block'>Model</span>
        <NodeSelect
          value={data.model || ''}
          onChange={(v) => update('model', v)}
          options={modelOptions}
          placeholder={selectedProvider ? 'Select model...' : 'Select provider first'}
          disabled={!selectedProvider}
        />
      </div>

      <div className='px-3 py-2'>
        <span className='text-[10px] font-medium text-muted-foreground mb-1 block'>Prompt</span>
        <NodeTextarea
          value={data.prompt || ''}
          onChange={(v) => update('prompt', v)}
          placeholder='Enter prompt...'
          rows={3}
        />
      </div>

      <Handle type='target' position={Position.Left} style={{ ...handleStyle, background: '#D4AF37', borderColor: '#D4AF37' }} className='!-left-[6px]' />
      <Handle type='source' position={Position.Right} style={{ ...handleStyle, background: '#D4AF37', borderColor: '#D4AF37' }} className='!-right-[6px]' />
    </div>
  );
}

function ToolNode({ data, selected }) {
  const colors = { 'Web Search': '#06b6d4', 'Code Exec': '#64748b', 'File Read': '#78716c', 'DB Query': '#d946ef' };
  const color = colors[data.label] || '#64748b';
  return (
    <NodeShell data={data} selected={selected} color={color}>
      <div className='flex flex-col gap-1.5'>
        {data.config ? (
          <p className='text-[10px] text-muted-foreground line-clamp-2'>{JSON.stringify(data.config)}</p>
        ) : (
          <p className='text-[10px] text-muted-foreground/50 italic'>Click to configure</p>
        )}
      </div>
    </NodeShell>
  );
}

function KnowledgeNode({ data, selected }) {
  return (
    <NodeShell data={data} selected={selected} color='#D4AF37'>
      <div className='flex flex-col gap-1.5'>
        <span className='text-muted-foreground text-[11px]'>Source</span>
        <div className='rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground'>
          {data.source || 'Not configured'}
        </div>
      </div>
    </NodeShell>
  );
}

function ConditionNode({ data, selected }) {
  return (
    <NodeShell data={data} selected={selected} color='#ec4899'>
      <div className='flex flex-col gap-1.5'>
        {data.condition ? (
          <code className='text-[10px] font-mono bg-muted/50 px-1.5 py-1 rounded text-foreground'>{data.condition}</code>
        ) : (
          <p className='text-[10px] text-muted-foreground/50 italic'>Click to set condition</p>
        )}
      </div>
      <Handle type='source' position={Position.Right} id='true' style={{ ...handleStyle, top: '35%', borderColor: '#10b981' }} className='!-right-[6px]' />
      <Handle type='source' position={Position.Right} id='false' style={{ ...handleStyle, top: '65%', borderColor: '#ef4444' }} className='!-right-[6px]' />
    </NodeShell>
  );
}

function NoteNode({ data, selected }) {
  return (
    <div
      className={`rounded-lg border-2 border-dashed min-w-[180px] max-w-[260px] p-3 ${
        selected ? 'border-yellow-500/60 bg-yellow-500/5' : 'border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40'
      }`}
    >
      <div className='flex items-center gap-1.5 mb-1.5'>
        <StickyNote size={12} className='text-yellow-600' />
        <span className='text-[11px] font-semibold text-yellow-700 dark:text-yellow-400'>Note</span>
      </div>
      <p className='text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap'>
        {data.text || 'Double-click to edit...'}
      </p>
    </div>
  );
}

// ── Custom animated edge ─────────────────────────────────────────────────────

function AnimatedEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd }) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ ...style, strokeWidth: 2, stroke: '#8b5cf6' }}
      markerEnd={markerEnd}
    />
  );
}

// ── Node types registry ──────────────────────────────────────────────────────

const nodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
  agentNode: AgentNode,
  llmNode: LLMNode,
  toolNode: ToolNode,
  knowledgeNode: KnowledgeNode,
  knowledgeAgentNode: KnowledgeAgentNode,
  conditionNode: ConditionNode,
  noteNode: NoteNode,
};

const edgeTypes = { animated: AnimatedEdge };

const defaultEdgeOptions = {
  type: 'animated',
  animated: true,
  style: { stroke: '#8b5cf6', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6', width: 16, height: 16 },
};

// ── Palette Sidebar ──────────────────────────────────────────────────────────

function NodePalette({ searchQuery, setSearchQuery, activeCategory, setActiveCategory }) {
  const onDragStart = (event, item) => {
    const nodeData = JSON.stringify({ type: item.type, label: item.label, color: item.color });
    event.dataTransfer.setData('application/reactflow', nodeData);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = NODE_PALETTE.map((c) => c.category);
  const activeCat = activeCategory || null;

  const allItems = NODE_PALETTE.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: cat.category }))
  );

  const filtered = searchQuery
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeCat
    ? allItems.filter((item) => item.category === activeCat)
    : null;

  return (
    <div className='flex flex-col h-full'>
      {/* Search */}
      <div className='px-3 py-2.5 border-b border-border'>
        <div className='relative'>
          <Search size={13} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search Nodes'
            className='w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40'
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className='flex flex-wrap gap-1 px-2 py-2 border-b border-border'>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
              activeCat === cat
                ? 'bg-violet-500/15 text-violet-500'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
            onClick={() => setActiveCategory(activeCat === cat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Node list */}
      <div className='flex-1 overflow-y-auto'>
        {filtered ? (
          <div className='p-2 flex flex-col gap-1'>
            {filtered.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-8'>No nodes found</p>
            ) : (
              filtered.map((item, i) => (
                <PaletteItem key={`${item.type}-${i}`} item={item} onDragStart={onDragStart} />
              ))
            )}
          </div>
        ) : (
          NODE_PALETTE.map((cat) => (
            <div key={cat.category}>
              <div className='px-3 py-1.5 bg-muted/30'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
                  {cat.category}
                </span>
              </div>
              <div className='p-2 grid grid-cols-2 gap-1.5'>
                {cat.items.map((item, i) => (
                  <PaletteItem key={`${item.type}-${i}`} item={item} onDragStart={onDragStart} compact />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PaletteItem({ item, onDragStart, compact }) {
  const Icon = item.icon;

  if (compact) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item)}
        className='flex flex-col items-center gap-1.5 rounded-lg border border-border/60 px-2 py-2.5 cursor-grab active:cursor-grabbing hover:bg-muted/40 hover:border-violet-500/30 transition-colors select-none text-center'
      >
        <div
          className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'
          style={{ background: `${item.color}12`, color: item.color }}
        >
          <Icon size={16} />
        </div>
        <span className='text-[10px] font-medium text-foreground leading-tight'>{item.label}</span>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      className='flex items-center gap-2.5 rounded-lg border border-border/60 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:bg-muted/40 hover:border-violet-500/30 transition-colors select-none'
    >
      <div
        className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md'
        style={{ background: `${item.color}15`, color: item.color }}
      >
        <Icon size={14} />
      </div>
      <div className='flex-1 min-w-0'>
        <span className='text-xs font-medium text-foreground block'>{item.label}</span>
        <span className='text-[10px] text-muted-foreground truncate block'>{item.description}</span>
      </div>
    </div>
  );
}

// ── Node config panel (right side when node selected) ────────────────────────

function NodeConfigPanel({ node, onUpdate, onDelete, onClose }) {
  if (!node) return null;
  const { data, type } = node;

  const update = (key, value) => {
    onUpdate(node.id, { ...data, [key]: value });
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center justify-between px-3 py-2.5 border-b border-border'>
        <div className='flex items-center gap-2'>
          <Settings2 size={13} className='text-muted-foreground' />
          <span className='text-xs font-semibold'>{data.label} Settings</span>
        </div>
        <div className='flex items-center gap-1'>
          <button onClick={() => onDelete(node.id)} className='h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors'>
            <Trash2 size={12} />
          </button>
          <button onClick={onClose} className='h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'>
            <X size={12} />
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-3 flex flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <label className='text-[11px] font-medium text-muted-foreground'>Name</label>
          <input value={data.label || ''} onChange={(e) => update('label', e.target.value)} className='rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40' />
        </div>

        {type === 'inputNode' && (
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium text-muted-foreground'>Input Type</label>
            <select value={data.inputType || 'Text'} onChange={(e) => update('inputType', e.target.value)} className='rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40'>
              {['Text', 'Number', 'Boolean', 'JSON', 'Image', 'Audio', 'File'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {type === 'outputNode' && (
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium text-muted-foreground'>Output Type</label>
            <select value={data.outputType || 'Text'} onChange={(e) => update('outputType', e.target.value)} className='rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40'>
              {['Text', 'Number', 'Boolean', 'JSON', 'Image', 'Audio', 'File'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {type === 'conditionNode' && (
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium text-muted-foreground'>Condition</label>
            <textarea value={data.condition || ''} onChange={(e) => update('condition', e.target.value)} placeholder='e.g. output.includes("error")' rows={3} className='w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/40' />
          </div>
        )}

        {type === 'noteNode' && (
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium text-muted-foreground'>Note Text</label>
            <textarea value={data.text || ''} onChange={(e) => update('text', e.target.value)} placeholder='Add a note...' rows={4} className='w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/40' />
          </div>
        )}

        {type === 'knowledgeNode' && (
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium text-muted-foreground'>Source</label>
            <input value={data.source || ''} onChange={(e) => update('source', e.target.value)} placeholder='Knowledge base name or URL' className='rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40' />
          </div>
        )}

        {type === 'toolNode' && (
          <div className='flex flex-col gap-1'>
            <label className='text-[11px] font-medium text-muted-foreground'>Description</label>
            <p className='text-[11px] text-muted-foreground'>{data.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Canvas ──────────────────────────────────────────────────────────────

let nodeIdCounter = 0;
function getNodeId() {
  return `node_${++nodeIdCounter}_${Date.now()}`;
}

function MultiAgentCanvasInner({ initialNodes, initialEdges, onChange, onDeleteAgent, onNodeSelect, modelsByProvider, providerOptions, compact }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPalette, setShowPalette] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const externalSyncRef = useRef(false);

  // Sync external initialNodes changes (e.g. subAgent added on left panel)
  useEffect(() => {
    const incoming = initialNodes || [];
    const incomingIds = new Set(incoming.map((n) => n.id));

    externalSyncRef.current = true;
    setNodes((currentNodes) => {
      const currentIds = new Set(currentNodes.map((n) => n.id));

      const added = incoming.filter((n) => !currentIds.has(n.id));
      const removedIds = new Set([...currentIds].filter((id) => !incomingIds.has(id)));

      if (added.length === 0 && removedIds.size === 0) {
        let hasUpdates = false;
        const updatedNodes = currentNodes.map((n) => {
          const match = incoming.find((inc) => inc.id === n.id);
          if (match && (match.data?.label !== n.data?.label || match.data?.model !== n.data?.model)) {
            hasUpdates = true;
            return { ...n, data: { ...n.data, ...match.data } };
          }
          return n;
        });
        return hasUpdates ? updatedNodes : currentNodes;
      }

      if (removedIds.size > 0) {
        setEdges((eds) => eds.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)));
      }

      const kept = currentNodes.filter((n) => !removedIds.has(n.id));
      return [...kept, ...added];
    });
  }, [initialNodes]);

  // Inject provider data and callbacks into all node data
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        _providerOptions: providerOptions || [],
        _modelsByProvider: modelsByProvider || {},
        _onUpdate: (nodeId, newData) => {
          setNodes((nds) => nds.map((nd) => (nd.id === nodeId ? { ...nd, data: newData } : nd)));
        },
        _onDelete: (nodeId) => {
          const deletedNode = nodes.find((nd) => nd.id === nodeId);
          setNodes((nds) => nds.filter((nd) => nd.id !== nodeId));
          setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
          setSelectedNode(null);
          setShowConfig(false);
          if (deletedNode?.data?._subAgentId && onDeleteAgent) {
            onDeleteAgent(deletedNode.data._subAgentId);
          }
        },
      },
    }));
  }, [nodes, providerOptions, modelsByProvider, setNodes, setEdges, onDeleteAgent]);

  // Sync changes back to parent (skip if we just received external sync)
  useEffect(() => {
    if (externalSyncRef.current) {
      externalSyncRef.current = false;
      return;
    }
    onChange?.({ nodes, edges });
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const { type, label, color } = JSON.parse(raw);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const paletteItem = NODE_PALETTE.flatMap((c) => c.items).find(
        (item) => item.type === type && item.label === label
      );

      const newNode = {
        id: getNodeId(),
        type,
        position,
        data: {
          label,
          icon: paletteItem?.icon,
          color,
          description: paletteItem?.description,
          // Agent defaults
          ...(type === 'agentNode' && {
            inputs: [{ name: 'input_0', type: 'Text', value: '' }],
            outputs: [],
            tools: [],
            systemPrompt: '',
            provider: '',
            model: '',
            temperature: 0.7,
          }),
        },
        selected: false,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((_event, node) => {
    setSelectedNode(node);
    // Only show config panel for simple nodes (agent/llm nodes are self-configuring)
    if (!['agentNode', 'llmNode'].includes(node.type)) {
      setShowConfig(true);
    }
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowConfig(false);
  }, []);

  const onNodeDataUpdate = useCallback(
    (nodeId, newData) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n)));
    },
    [setNodes]
  );

  const onNodeDelete = useCallback(
    (nodeId) => {
      const deletedNode = nodes.find((n) => n.id === nodeId);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
      setShowConfig(false);
      if (deletedNode?.data?._subAgentId && onDeleteAgent) {
        onDeleteAgent(deletedNode.data._subAgentId);
      }
    },
    [setNodes, setEdges, nodes, onDeleteAgent]
  );

  const nodeColor = (node) => {
    const colors = {
      inputNode: '#3b82f6', outputNode: '#10b981', agentNode: '#8b5cf6',
      llmNode: '#D4AF37', toolNode: '#06b6d4', knowledgeNode: '#D4AF37',
      knowledgeAgentNode: '#D4AF37', conditionNode: '#ec4899', noteNode: '#a3a3a3',
    };
    return colors[node.type] || '#64748b';
  };

  const allPaletteItems = useMemo(() => NODE_PALETTE.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: cat.category }))
  ), []);

  const onPaletteDragStart = useCallback((event, item) => {
    const nodeData = JSON.stringify({ type: item.type, label: item.label, color: item.color });
    event.dataTransfer.setData('application/reactflow', nodeData);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  return (
    <div className={`flex ${compact ? 'flex-col' : ''} h-full w-full`} ref={reactFlowWrapper}>
      {/* Palette — horizontal strip (compact) or vertical sidebar */}
      {compact ? (
        <div className='shrink-0 border-b border-border bg-card/50 px-3 py-2 flex items-center gap-1.5 overflow-x-auto'>
          {allPaletteItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.type}-${i}`}
                draggable
                onDragStart={(e) => onPaletteDragStart(e, item)}
                className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 bg-muted/30 text-xs font-medium text-foreground/80 cursor-grab hover:bg-muted/60 hover:border-border transition-colors shrink-0 select-none'
                title={item.description}
              >
                <Icon size={12} style={{ color: item.color }} />
                {item.label}
              </div>
            );
          })}
        </div>
      ) : showPalette ? (
        <div className='w-[240px] shrink-0 border-r border-border bg-card/50 flex flex-col overflow-hidden'>
          <div className='flex items-center justify-between px-3 py-2 border-b border-border'>
            <span className='text-xs font-semibold text-foreground'>Nodes</span>
            <button
              onClick={() => setShowPalette(false)}
              className='h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground'
            >
              <X size={11} />
            </button>
          </div>
          <NodePalette
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        </div>
      ) : null}

      {/* Canvas */}
      <div className='flex-1 relative'>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          minZoom={0.15}
          maxZoom={2.5}
          deleteKeyCode={['Backspace', 'Delete']}
          className='bg-background'
          proOptions={{ hideAttribution: true }}
        >
          <Background variant='dots' gap={20} size={1} color='color-mix(in oklab, var(--muted-foreground) 15%, transparent)' />
          <Controls
            showInteractive={false}
            className='!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted'
          />
          <MiniMap
            nodeColor={nodeColor}
            maskColor='color-mix(in oklab, var(--background) 85%, transparent)'
            className='!bg-card !border-border !shadow-lg'
            pannable
            zoomable
          />

          {!compact && !showPalette && (
            <Panel position='top-left'>
              <button
                onClick={() => setShowPalette(true)}
                className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted shadow-sm transition-colors'
              >
                <Plus size={12} />
                Add Nodes
              </button>
            </Panel>
          )}

          <Panel position='top-right'>
            <div className='flex items-center gap-2'>
              <span className='flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
                {nodes.length} nodes · {edges.length} connections
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right config panel (for simple nodes only) */}
      {showConfig && selectedNode && !['agentNode', 'llmNode'].includes(selectedNode.type) && (
        <div className='w-[260px] shrink-0 border-l border-border bg-card/50 flex flex-col overflow-hidden'>
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={onNodeDataUpdate}
            onDelete={onNodeDelete}
            onClose={() => { setShowConfig(false); setSelectedNode(null); }}
          />
        </div>
      )}
    </div>
  );
}

// ── Exported wrapper with ReactFlowProvider ──────────────────────────────────

export default function MultiAgentCanvas({ initialNodes, initialEdges, onChange, onDeleteAgent, onNodeSelect, modelsByProvider, providerOptions, compact }) {
  return (
    <ReactFlowProvider>
      <MultiAgentCanvasInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onChange={onChange}
        onDeleteAgent={onDeleteAgent}
        onNodeSelect={onNodeSelect}
        modelsByProvider={modelsByProvider}
        providerOptions={providerOptions}
        compact={compact}
      />
    </ReactFlowProvider>
  );
}

export { NODE_PALETTE };
