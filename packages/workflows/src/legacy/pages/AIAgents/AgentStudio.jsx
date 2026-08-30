/*
Copyright (C) 2025 DataDack Technologies Pvt. Ltd.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Save,
  Loader2,
  Bot,
  Thermometer,
  SlidersHorizontal,
  Hash,
  CheckCircle2,
  Wrench,
  Code2,
  Pencil,
  Zap,
  Settings2,
  Network,
  Sparkles,
  BookOpen,
  Undo2,
  Redo2,
  Shuffle,
  Clock,
} from 'lucide-react';
import {
  Badge,
  Button,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@datadack/common-ui"

import { agentsApi } from '../../api/agents';
import { automationPath } from '../../../runtime';
import { API } from '../../helpers/api';
import MultiAgentCanvas from '../../components/agents/MultiAgentCanvas';
import GenerateCodeDialog from '../../components/agents/GenerateCodeDialog';

// ── Partials ─────────────────────────────────────────────────────────────────
import { PROVIDER_META, parseCfg, getNextIOName } from './partials/constants';
import { RangeSlider } from './partials/FormControls';
import VersionsPanel from './partials/VersionsPanel';
import AddToolSheet from './partials/AddToolSheet';
import AdvancedSettingsSheet from './partials/AdvancedSettingsSheet';
import MultiAgentConfig from './partials/MultiAgentConfig';
import SubAgentEditorSheet from './partials/SubAgentEditorSheet';
import SwitchVariantSheet from './partials/SwitchVariantSheet';
import ConversationalPlayground from './partials/ConversationalPlayground';
import CustomPlayground from './partials/CustomPlayground';
import SwitchModeDialog from './partials/SwitchModeDialog';

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.get(id),
  });

  // ── Fetch available models grouped by provider ─────────────────────────
  const EMBEDDING_PATTERN = /embed|text-embedding|m3e/i;
  const { data: modelsByProvider = {} } = useQuery({
    queryKey: ['provider-models'],
    queryFn: async () => {
      const res = await API.get('/api/models');
      if (!res.data?.success) return {};
      const raw = res.data.data; // { channelType: [modelName, ...] }
      const result = {};
      for (const [type, models] of Object.entries(raw)) {
        if (!Array.isArray(models) || models.length === 0) continue;
        const filtered = models.filter((m) => !EMBEDDING_PATTERN.test(m));
        if (filtered.length > 0) result[type] = filtered;
      }
      return result;
    },
  });

  // Build provider options (only providers in PROVIDER_META that have models)
  const providerOptions = Object.keys(modelsByProvider)
    .map((type) => {
      const meta = PROVIDER_META[type];
      return meta ? { value: type, label: meta.label, icon: meta.icon } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

  // ── Config state ────────────────────────────────────────────────────────
  const [cfg, setCfg] = useState(null);

  // When personal API key is not active, only show OpenAI (key '1')
  const visibleProviderOptions = cfg?.use_personal_api_key
    ? providerOptions
    : providerOptions.filter((p) => p.value === '1');
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState('conversational');
  const [agentMode, setAgentMode] = useState('single');
  const [subAgents, setSubAgents] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────
  const promptRef = useRef(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [toolCategory, setToolCategory] = useState('All');
  const [subAgentEditorOpen, setSubAgentEditorOpen] = useState(false);
  const [editingSubAgentIndex, setEditingSubAgentIndex] = useState(null);
  const [switchVariantOpen, setSwitchVariantOpen] = useState(false);
  const [switchModeOpen, setSwitchModeOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');

  const [generateCodeOpen, setGenerateCodeOpen] = useState(false);
  const [flowGraph, setFlowGraph] = useState({ nodes: [], edges: [] });

  // Sync subAgents → flowGraph nodes (add missing agent nodes, remove orphaned ones)
  useEffect(() => {
    if (agentMode !== 'multiagent') return;
    setFlowGraph((prev) => {
      const existingAgentNodes = prev.nodes.filter((n) => n.type === 'agentNode' && n.data?._subAgentId);
      const existingIds = new Set(existingAgentNodes.map((n) => n.data._subAgentId));
      const subAgentIds = new Set(subAgents.map((sa) => sa.id));

      // Add nodes for new sub-agents
      const newNodes = subAgents
        .filter((sa) => !existingIds.has(sa.id))
        .map((sa, i) => ({
          id: `sa_${sa.id}`,
          type: 'agentNode',
          position: { x: 250 + (existingAgentNodes.length + i) * 300, y: 150 },
          data: {
            label: sa.name,
            color: '#8b5cf6',
            description: sa.role || 'AI Agent',
            model: sa.model,
            system_prompt: sa.system_prompt,
            temperature: sa.temperature,
            _subAgentId: sa.id,
          },
        }));

      // Remove nodes for deleted sub-agents
      const keptNodes = prev.nodes.filter(
        (n) => !(n.type === 'agentNode' && n.data?._subAgentId && !subAgentIds.has(n.data._subAgentId))
      );

      // Update labels/models on existing nodes
      const updatedNodes = keptNodes.map((n) => {
        if (n.type === 'agentNode' && n.data?._subAgentId) {
          const sa = subAgents.find((s) => s.id === n.data._subAgentId);
          if (sa) {
            return { ...n, data: { ...n.data, label: sa.name, model: sa.model, system_prompt: sa.system_prompt } };
          }
        }
        return n;
      });

      const finalNodes = [...updatedNodes, ...newNodes];
      // Remove edges pointing to deleted nodes
      const nodeIds = new Set(finalNodes.map((n) => n.id));
      const finalEdges = prev.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

      if (newNodes.length === 0 && keptNodes.length === prev.nodes.length) {
        // Only update if labels/models changed
        const changed = updatedNodes.some((n, i) => n !== prev.nodes[i]);
        if (!changed) return prev;
      }

      return { nodes: finalNodes, edges: finalEdges };
    });
  }, [subAgents, agentMode]);

  // Initialise from loaded agent
  useEffect(() => {
    if (agent) {
      const parsed = parseCfg(agent.current_json);
      setCfg(parsed);
      setAgentName(agent.name);
      setAgentType(agent.type ?? 'conversational');
      setAgentMode(agent.agent_mode ?? 'single');
      try {
        const parsed_agents = JSON.parse(agent.agents || '[]');
        const withIds = (Array.isArray(parsed_agents) ? parsed_agents : []).map((sa) => ({
          ...sa,
          id: sa.id || crypto.randomUUID(),
        }));
        setSubAgents(withIds);
      } catch { setSubAgents([]); }
      // Load flow graph for canvas view
      try {
        const parsedGraph = JSON.parse(agent.flow_graph || '{"nodes":[],"edges":[]}');
        setFlowGraph(parsedGraph);
      } catch { setFlowGraph({ nodes: [], edges: [] }); }
      setIsDirty(false);
    }
  }, [agent]);

  // Auto-detect provider when agent model + modelsByProvider are available
  useEffect(() => {
    if (!cfg?.model || Object.keys(modelsByProvider).length === 0) return;
    const match = Object.entries(modelsByProvider).find(([, models]) =>
      models.includes(cfg.model),
    );
    if (match) setSelectedProvider(match[0]);
  }, [cfg?.model, modelsByProvider]);

  const updateCfg = useCallback((key, value) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  // ── Insert state variable at cursor in prompt textarea ──────────────────
  const insertAtCursor = useCallback((varName) => {
    const el = promptRef.current;
    const tag = `{{state.${varName}}}`;
    if (!el) {
      updateCfg('system_prompt', (cfg?.system_prompt || '') + tag);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = cfg?.system_prompt || '';
    const newText = text.slice(0, start) + tag + text.slice(end);
    updateCfg('system_prompt', newText);
    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + tag.length;
    });
  }, [cfg?.system_prompt, updateCfg]);

  // ── Input/Output helpers for custom variant ─────────────────────────────
  const mapStateType = (t) => {
    if (t === 'number') return 'Number';
    if (t === 'boolean') return 'Boolean';
    if (t === 'json' || t === 'array') return 'JSON';
    return 'Text';
  };

  // Derive state-variable entries (read-only, shown at top)
  const stateVarInputs = useMemo(() => {
    try {
      const parsed = JSON.parse(cfg?.custom_state_schema || '[]');
      return (Array.isArray(parsed) ? parsed : [])
        .filter((v) => !v.disabled)
        .map((sv) => ({
          id: `state_${sv.name}`,
          name: sv.name,
          type: mapStateType(sv.type),
          isState: true,
        }));
    } catch { return []; }
  }, [cfg?.custom_state_schema]);

  // User-added custom entries + state vars merged
  const rawInputs = cfg?.inputs ?? [];
  const rawOutputs = cfg?.outputs ?? [];
  const customInputs = [...stateVarInputs, ...rawInputs];
  const customOutputs = [...stateVarInputs, ...rawOutputs];

  const addInput = useCallback(() => {
    setCfg((prev) => {
      const inputs = prev.inputs ?? [];
      const name = getNextIOName('input', inputs);
      return { ...prev, inputs: [...inputs, { id: crypto.randomUUID(), name, type: 'Text' }] };
    });
    setIsDirty(true);
  }, []);

  const removeInput = useCallback((inputId) => {
    setCfg((prev) => ({ ...prev, inputs: (prev.inputs ?? []).filter((i) => i.id !== inputId) }));
    setIsDirty(true);
  }, []);

  const updateInput = useCallback((inputId, key, value) => {
    setCfg((prev) => ({
      ...prev,
      inputs: (prev.inputs ?? []).map((i) => i.id === inputId ? { ...i, [key]: value } : i),
    }));
    setIsDirty(true);
  }, []);

  const addOutput = useCallback(() => {
    setCfg((prev) => {
      const outputs = prev.outputs ?? [];
      const name = getNextIOName('output', outputs);
      return { ...prev, outputs: [...outputs, { id: crypto.randomUUID(), name, type: 'Text' }] };
    });
    setIsDirty(true);
  }, []);

  const removeOutput = useCallback((outputId) => {
    setCfg((prev) => ({ ...prev, outputs: (prev.outputs ?? []).filter((o) => o.id !== outputId) }));
    setIsDirty(true);
  }, []);

  const updateOutput = useCallback((outputId, key, value) => {
    setCfg((prev) => ({
      ...prev,
      outputs: (prev.outputs ?? []).map((o) => o.id === outputId ? { ...o, [key]: value } : o),
    }));
    setIsDirty(true);
  }, []);

  // ── Variant switch handler ──────────────────────────────────────────────
  const handleVariantSwitch = useCallback((newType) => {
    setAgentType(newType);
    setIsDirty(true);
    // Initialize default inputs/outputs when switching to custom
    if (newType === 'custom') {
      setCfg((prev) => {
        const hasInputs = prev.inputs && prev.inputs.length > 0;
        const hasOutputs = prev.outputs && prev.outputs.length > 0;
        return {
          ...prev,
          inputs: hasInputs ? prev.inputs : [
            { id: 'default_input_message', name: 'message', type: 'Text', isDefault: true },
            { id: crypto.randomUUID(), name: 'input_0', type: 'Text' },
          ],
          outputs: hasOutputs ? prev.outputs : [
            { id: 'default_output_response', name: 'response', type: 'JSON', isDefault: true },
            { id: crypto.randomUUID(), name: 'output_0', type: 'Text' },
          ],
        };
      });
    }
  }, []);


  // ── Tool helpers ────────────────────────────────────────────────────────
  const tools = cfg?.tools ?? [];
  const existingToolKeys = tools.map((t) => t.key);

  const addTool = useCallback((entry) => {
    setCfg((prev) => ({
      ...prev,
      tools: [
        ...(prev.tools ?? []),
        { id: crypto.randomUUID(), key: entry.key, name: entry.name, category: entry.category, mode: 'Default', auto_run: false },
      ],
    }));
    setIsDirty(true);
  }, []);

  const removeTool = useCallback((toolId) => {
    setCfg((prev) => ({ ...prev, tools: prev.tools.filter((t) => t.id !== toolId) }));
    setIsDirty(true);
  }, []);

  const toggleAutoRun = useCallback((toolId, val) => {
    setCfg((prev) => ({
      ...prev,
      tools: prev.tools.map((t) => (t.id === toolId ? { ...t, auto_run: val } : t)),
    }));
    setIsDirty(true);
  }, []);

  const filteredTools =
    toolCategory === 'All' ? tools : tools.filter((t) => t.category === toolCategory);

  // ── Save ────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      agentsApi.update(id, {
        name: agentName,
        description: agent?.description ?? '',
        type: agentType,
        agent_mode: agentMode,
        agents: JSON.stringify(subAgents),
        current_json: JSON.stringify(cfg),
        flow_graph: JSON.stringify(flowGraph),
        metadata: agent?.metadata ?? '{}',
        is_public: agent?.is_public ?? false,
      }),
    onSuccess: () => {
      toast.success('Agent saved');
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ['agent', id] });
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Deploy ──────────────────────────────────────────────────────────────
  const deployMutation = useMutation({
    mutationFn: () =>
      agentsApi.create({
        name: agentName,
        description: agent?.description ?? '',
        type: agentType,
        agent_mode: agentMode,
        agents: JSON.stringify(subAgents),
        current_json: JSON.stringify(cfg),
        flow_graph: JSON.stringify(flowGraph),
        metadata: agent?.metadata ?? '{}',
        is_public: agent?.is_public ?? false,
        is_deployed: true,
        version: (agent?.version ?? 1) + 1,
        parent_id: agent?.parent_id || id,
      }),
    onSuccess: (newAgent) => {
      toast.success(`v${newAgent.version} deployed successfully`);
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agent', id] });
      qc.invalidateQueries({ queryKey: ['agent-versions', id] });
      qc.invalidateQueries({ queryKey: ['agent-versions', agent?.parent_id || id] });
      navigate(automationPath(`agents/${newAgent.id}`));
    },
    onError: (e) => toast.error(e.message),
  });


  if (agentLoading || !cfg) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 size={24} className='animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <div className='flex flex-col h-svh bg-background'>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className='flex items-center justify-between px-4 py-2 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm'>
        {/* Left — Breadcrumb */}
        <div className='flex items-center gap-2 min-w-0'>
          <button
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
            onClick={() => navigate(automationPath('agents'))}
          >
            <Bot size={16} className='text-violet-500 shrink-0' />
            <span className='font-medium'>Agents</span>
          </button>
          <span className='text-muted-foreground/40'>/</span>
          <div className='relative group'>
            <input
              value={agentName}
              onChange={(e) => { setAgentName(e.target.value); setIsDirty(true); }}
              className='text-sm font-medium bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1.5 py-0.5 -mx-1.5 min-w-0 truncate text-foreground max-w-[220px] hover:bg-muted/50 transition-colors'
            />
            <Pencil size={10} className='absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors pointer-events-none' />
          </div>
          <span className='text-muted-foreground/40'>/</span>
          <Badge variant='outline' className='text-[11px] px-2 py-0.5 border-border text-muted-foreground shrink-0'>
            Edit
          </Badge>
        </div>

        {/* Right — Actions */}
        <div className='flex items-center gap-1.5 shrink-0'>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='sm' className='h-7 w-7 p-0 text-muted-foreground'>
                  <Undo2 size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom' className='text-xs'>Undo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='sm' className='h-7 w-7 p-0 text-muted-foreground'>
                  <Redo2 size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom' className='text-xs'>Redo</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation='vertical' className='h-4 mx-1' />

          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 text-xs'
            onClick={() => setVersionsOpen(true)}
          >
            <Clock size={12} />
            Version history
          </Button>

          <Button
            size='sm'
            className='h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
            disabled={deployMutation.isPending}
            onClick={() => deployMutation.mutate()}
          >
            {deployMutation.isPending
              ? <Loader2 size={12} className='animate-spin' />
              : <Pencil size={12} />
            }
            Deploy Changes
          </Button>

        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <ResizablePanelGroup orientation='horizontal' className='flex-1 overflow-hidden'>

        {/* ══ LEFT — Agent config ════════════════════════════════════════════════ */}
        <ResizablePanel defaultSize='30%' minSize='30%' maxSize='75%'>
          <div className='flex flex-col h-full bg-background overflow-hidden'>

            {/* ── Top Bar ──────────────────────────────────────── */}
            <div className='flex items-center justify-between px-5 py-2.5 border-b border-border bg-muted/20 shrink-0'>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setSwitchModeOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                    agentMode === 'multiagent'
                      ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                  }`}
                >
                  <Network size={11} />
                  {agentMode === 'multiagent' ? 'Multi-Agent' : 'Single'}
                </button>

                <Separator orientation='vertical' className='h-4' />

                <button
                  onClick={() => setSwitchVariantOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                    agentType === 'conversational'
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                      : 'border-violet-500/30 bg-violet-500/10 text-violet-500 hover:bg-violet-500/20'
                  }`}
                >
                  <Shuffle size={11} />
                  {agentType === 'conversational' ? 'Conversational' : 'Custom'}
                </button>
              </div>

              <div className='flex items-center gap-3'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 gap-1.5 text-[11px] text-muted-foreground'
                  onClick={() => setGenerateCodeOpen(true)}
                >
                  <Code2 size={10} />
                  Export Code
                </Button>
                {isDirty ? (
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className='flex items-center gap-1.5 text-xs text-[#D4AF37] hover:text-[#B8860B] transition-colors'
                  >
                    {saveMutation.isPending
                      ? <Loader2 size={12} className='animate-spin' />
                      : <Save size={12} />
                    }
                    <span className='font-medium'>Unsaved</span>
                  </button>
                ) : (
                  <span className='flex items-center gap-1.5 text-xs text-emerald-500'>
                    <CheckCircle2 size={12} />
                    <span className='font-medium'>Saved</span>
                  </span>
                )}
              </div>
            </div>

            {/* ── Content ── */}
            {agentMode === 'multiagent' ? (
              <ScrollArea className='flex-1'>
                <div className='divide-y divide-border'>
                  {/* Orchestration Instructions */}
                  <section className='px-5 py-5 flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <Sparkles size={14} className='text-violet-500' />
                      <span className='text-sm font-semibold text-foreground'>Agent Instructions</span>
                    </div>
                    <p className='text-xs text-muted-foreground leading-relaxed'>
                      Describe how the orchestrator should coordinate sub-agents, delegate tasks, and combine results.
                    </p>
                    <textarea
                      value={cfg.system_prompt}
                      onChange={(e) => updateCfg('system_prompt', e.target.value)}
                      placeholder={'You are an orchestrator that coordinates multiple specialized agents.\n\nYour responsibilities:\n- Analyze incoming requests and delegate to the appropriate sub-agent\n- Combine and synthesize results from sub-agents\n- Ensure coherent and complete responses'}
                      rows={8}
                      className='w-full resize-y min-h-[100px] rounded-lg border border-input bg-muted/30 px-3.5 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-shadow'
                    />
                  </section>

                  {/* Orchestrator Temperature */}
                  <section className='px-5 py-5 flex flex-col gap-4'>
                    <div className='flex items-center gap-2'>
                      <Thermometer size={13} className='text-muted-foreground' />
                      <span className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
                        Orchestrator Settings
                      </span>
                    </div>
                    <div className='flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4'>
                      <RangeSlider label='Temperature' icon={Thermometer} value={cfg.temperature} min={0} max={2} step={0.01} onChange={(v) => updateCfg('temperature', v)} hint='Controls randomness of orchestration decisions' />
                      <RangeSlider label='Top P' icon={SlidersHorizontal} value={cfg.top_p} min={0} max={1} step={0.01} onChange={(v) => updateCfg('top_p', v)} hint='Nucleus sampling probability mass' />
                    </div>
                  </section>

                  {/* Sub-Agents */}
                  <section className='px-5 py-5'>
                  <MultiAgentConfig
                    subAgents={subAgents}
                    setSubAgents={setSubAgents}
                    setIsDirty={setIsDirty}
                    modelsByProvider={modelsByProvider}
                    onEditSubAgent={(i) => { setEditingSubAgentIndex(i); setSubAgentEditorOpen(true); }}
                  />
                  </section>
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className='flex-1'>
                <div className='divide-y divide-border'>
                  {/* Instructions */}
                  <section className='px-5 py-5 flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <Sparkles size={14} className='text-violet-500' />
                      <span className='text-sm font-semibold text-foreground'>Agent Instructions</span>
                    </div>
                    <p className='text-xs text-muted-foreground leading-relaxed'>
                      {agentType === 'custom'
                        ? 'Describe how your agent should work. Click a variable below to insert it at the cursor.'
                        : 'Describe how your agent should behave. Click a variable below to insert it at the cursor.'}
                    </p>

                    {stateVarInputs.length > 0 && (
                      <div className='flex flex-wrap gap-1.5'>
                        {stateVarInputs.map((sv) => (
                          <button
                            key={sv.id}
                            onClick={() => insertAtCursor(sv.name)}
                            className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 text-[10px] font-mono border border-violet-500/20 hover:bg-violet-500/20 transition-colors cursor-pointer'
                          >
                            {`{{state.${sv.name}}}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea
                      ref={promptRef}
                      value={cfg.system_prompt}
                      onChange={(e) => updateCfg('system_prompt', e.target.value)}
                      placeholder={'You are an intelligent assistant designed to provide helpful, accurate, and relevant information.\n\nYour responsibilities:\n- Answer questions clearly and concisely\n- Assist with tasks within your capabilities\n- Acknowledge when you don\'t know something\n- Maintain a professional and friendly tone\n- Follow user instructions carefully'}
                      rows={12}
                      className='w-full resize-y min-h-[120px] rounded-lg border border-input bg-muted/30 px-3.5 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-shadow'
                    />
                  </section>

                  {/* Model + Sliders */}
                  <section className='px-5 py-5 flex flex-col gap-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Zap size={13} className='text-muted-foreground' />
                        <span className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
                          AI Model
                        </span>
                      </div>
                      {agentMode !== 'multiagent' && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 gap-1.5 text-[11px] text-muted-foreground'
                          onClick={() => setAdvancedOpen(true)}
                        >
                          <Settings2 size={10} />
                          Advanced
                        </Button>
                      )}
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-medium text-muted-foreground'>Provider</label>
                        <Select value={selectedProvider} onValueChange={(val) => { setSelectedProvider(val); updateCfg('model', ''); }}>
                          <SelectTrigger className='h-9 text-sm'>
                            <SelectValue placeholder='Select a provider' />
                          </SelectTrigger>
                          <SelectContent>
                            {visibleProviderOptions.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                <span className='flex items-center gap-2'>{p.icon && <p.icon size={18} />}{p.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-medium text-muted-foreground'>Model</label>
                        <Select value={cfg.model} onValueChange={(val) => updateCfg('model', val)} disabled={!selectedProvider}>
                          <SelectTrigger className='h-9 text-sm'>
                            <SelectValue placeholder={selectedProvider ? 'Select a model' : 'Select a provider first'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(modelsByProvider[selectedProvider] ?? []).map((m) => (
                              <SelectItem key={m} value={m}>
                                <span className='flex items-center gap-2'>{PROVIDER_META[selectedProvider]?.icon && React.createElement(PROVIDER_META[selectedProvider].icon, { size: 18 })}{m}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className='flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4'>
                      <RangeSlider label='Temperature' icon={Thermometer} value={cfg.temperature} min={0} max={2} step={0.01} onChange={(v) => updateCfg('temperature', v)} hint='Controls randomness (0 = deterministic, 2 = very random)' />
                      <RangeSlider label='Top P' icon={SlidersHorizontal} value={cfg.top_p} min={0} max={1} step={0.01} onChange={(v) => updateCfg('top_p', v)} hint='Nucleus sampling probability mass' />
                      <RangeSlider label='Max Tokens' icon={Hash} value={cfg.max_tokens} min={256} max={32768} step={256} onChange={(v) => updateCfg('max_tokens', v)} hint='Maximum response length in tokens' />
                    </div>
                  </section>

                  {/* Knowledge Base */}
                  <section className='px-5 py-5 flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <BookOpen size={13} className='text-muted-foreground' />
                      <span className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
                        Knowledge Base
                      </span>
                    </div>
                    <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 gap-3'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground'>
                        <BookOpen size={18} />
                      </div>
                      <div className='text-center'>
                        <p className='text-sm font-medium text-muted-foreground'>Coming Soon</p>
                        <p className='text-[11px] text-muted-foreground/70 mt-0.5'>
                          Connect knowledge bases to ground your agent&#39;s responses
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Tools */}
                  <section className='px-5 py-5 flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                      <Wrench size={13} className='text-muted-foreground' />
                      <span className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
                        Tools
                      </span>
                    </div>
                    <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 gap-3'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground'>
                        <Wrench size={18} />
                      </div>
                      <div className='text-center'>
                        <p className='text-sm font-medium text-muted-foreground'>Coming Soon</p>
                        <p className='text-[11px] text-muted-foreground/70 mt-0.5'>
                          Configure tools to extend your agent&#39;s capabilities
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ══ RIGHT — Playground / Canvas ═══════════════════════════════════ */}
        <ResizablePanel defaultSize='50%' minSize='25%'>
          {agentMode === 'multiagent' ? (
            <div className='h-full overflow-hidden'>
              <MultiAgentCanvas
                initialNodes={flowGraph.nodes}
                initialEdges={flowGraph.edges}
                onChange={(graph) => {
                  setFlowGraph(graph);
                  setIsDirty(true);
                }}
                onDeleteAgent={(subAgentId) => {
                  setSubAgents((prev) => prev.filter((sa) => sa.id !== subAgentId));
                  setIsDirty(true);
                }}
                modelsByProvider={modelsByProvider}
                providerOptions={providerOptions}
                compact
              />
            </div>
          ) : agentType === 'conversational' ? (
            <ConversationalPlayground agentName={agentName} cfg={cfg} />
          ) : (
            <CustomPlayground cfg={cfg} inputs={customInputs} outputs={customOutputs} />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* ── Panels & Dialogs ──────────────────────────────────────────────── */}
      <VersionsPanel
        agentId={agent?.parent_id || id}
        currentId={id}
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        onSwitch={(newId) => navigate(automationPath(`agents/${newId}`))}
      />
      <AddToolSheet
        open={addToolOpen}
        onClose={() => setAddToolOpen(false)}
        existingKeys={existingToolKeys}
        onAdd={addTool}
      />
      <AdvancedSettingsSheet
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        cfg={cfg}
        updateCfg={updateCfg}
        agentType={agentType}
      />
      <GenerateCodeDialog
        open={generateCodeOpen}
        onClose={() => setGenerateCodeOpen(false)}
        cfg={cfg}
        agentName={agentName}
        agentType={agentType}
        agentMode={agentMode}
        subAgents={subAgents}
        flowGraph={flowGraph}
      />
      <SubAgentEditorSheet
        open={subAgentEditorOpen}
        onClose={() => { setSubAgentEditorOpen(false); setEditingSubAgentIndex(null); }}
        subAgent={editingSubAgentIndex !== null ? subAgents[editingSubAgentIndex] : null}
        onSave={(updated) => {
          setSubAgents((prev) => prev.map((sa, i) => i === editingSubAgentIndex ? updated : sa));
          setIsDirty(true);
        }}
        modelsByProvider={modelsByProvider}
        providerOptions={providerOptions}
      />
      <SwitchVariantSheet
        open={switchVariantOpen}
        onClose={() => setSwitchVariantOpen(false)}
        currentVariant={agentType}
        onSwitch={handleVariantSwitch}
        cfg={cfg}
        onUpdateCfg={updateCfg}
      />
      <SwitchModeDialog
        open={switchModeOpen}
        onClose={() => setSwitchModeOpen(false)}
        agentMode={agentMode}
        setAgentMode={setAgentMode}
        setIsDirty={setIsDirty}
      />
    </div>
  );
}
