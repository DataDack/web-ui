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

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Globe, Lock, GitBranch, Bot, Thermometer, Hash, SlidersHorizontal } from 'lucide-react';
import { toast } from 'react-toastify';
import { automationPath } from '../../../runtime';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
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
  Switch,
  Textarea,
} from "@datadack/common-ui"

const TYPES = [
  { value: 'conversational', label: 'Conversational' },
  { value: 'custom', label: 'Custom' },
];

// Default single-agent config skeleton
const DEFAULT_SINGLE_AGENT = {
  model: 'gpt-4o',
  system_prompt: '',
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1,
};

/** Parse the agents JSON string and return the first item (single-agent config). */
function parseSingleAgent(agentsJson) {
  try {
    const arr = JSON.parse(agentsJson);
    if (Array.isArray(arr) && arr.length > 0) return { ...DEFAULT_SINGLE_AGENT, ...arr[0] };
  } catch (_) {}
  return { ...DEFAULT_SINGLE_AGENT };
}

/** Serialise a single-agent config object back to the `agents` JSON string. */
function serializeSingleAgent(cfg) {
  return JSON.stringify([cfg]);
}

// ── Single Agent Configuration UI ───────────────────────────────────────────
function SingleAgentConfig({ agentsJson, onChange, disabled, readOnly }) {
  const [cfg, setCfg] = useState(() => parseSingleAgent(agentsJson));

  const update = useCallback((key, value) => {
    setCfg((prev) => {
      const next = { ...prev, [key]: value };
      onChange(serializeSingleAgent(next));
      return next;
    });
  }, [onChange]);

  const numInput = (key, { min, max, step = 0.1, label, hint }) => (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between'>
        <Label className='flex items-center gap-1'>{label}</Label>
        <span className='text-xs font-mono tabular-nums text-muted-foreground'>{cfg[key]}</span>
      </div>
      {readOnly ? (
        <Input value={cfg[key]} disabled readOnly />
      ) : (
        <input
          type='range'
          min={min}
          max={max}
          step={step}
          value={cfg[key]}
          onChange={(e) => update(key, parseFloat(e.target.value))}
          disabled={disabled}
          className='w-full accent-[#D4AF37] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
        />
      )}
      {hint && <span className='text-[11px] text-muted-foreground'>{hint}</span>}
    </div>
  );

  return (
    <div className='flex flex-col gap-4 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4'>
      {/* Section heading */}
      <div className='flex items-center gap-2'>
        <Bot size={14} className='text-[#D4AF37]' />
        <span className='text-xs font-semibold uppercase tracking-wide text-[#D4AF37]'>
          Single Agent Configuration
        </span>
      </div>

      {/* Model */}
      <div className='flex flex-col gap-1.5'>
        <Label>Model</Label>
        <Input
          value={cfg.model}
          onChange={(e) => update('model', e.target.value)}
          placeholder='e.g. gpt-4o, claude-sonnet-4-6'
          disabled={disabled || readOnly}
        />
      </div>

      {/* System Prompt */}
      <div className='flex flex-col gap-1.5'>
        <Label>System Prompt</Label>
        <Textarea
          value={cfg.system_prompt}
          onChange={(e) => update('system_prompt', e.target.value)}
          placeholder='You are a helpful assistant…'
          rows={4}
          disabled={disabled || readOnly}
          className='resize-none'
        />
      </div>

      {/* Temperature + Top P sliders */}
      <div className='grid grid-cols-2 gap-4'>
        {numInput('temperature', {
          min: 0, max: 2, step: 0.01,
          label: <><Thermometer size={11} /> Temperature</>,
          hint: 'Controls randomness (0 = deterministic, 2 = very random)',
        })}
        {numInput('top_p', {
          min: 0, max: 1, step: 0.01,
          label: <><SlidersHorizontal size={11} /> Top P</>,
          hint: 'Nucleus sampling probability mass',
        })}
      </div>

      {/* Max Tokens */}
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between'>
          <Label className='flex items-center gap-1'>
            <Hash size={11} /> Max Tokens
          </Label>
          <span className='text-xs font-mono tabular-nums text-muted-foreground'>{cfg.max_tokens}</span>
        </div>
        {readOnly ? (
          <Input value={cfg.max_tokens} disabled readOnly />
        ) : (
          <input
            type='range'
            min={256}
            max={32768}
            step={256}
            value={cfg.max_tokens}
            onChange={(e) => update('max_tokens', parseInt(e.target.value, 10))}
            disabled={disabled}
            className='w-full accent-[#D4AF37] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          />
        )}
        <span className='text-[11px] text-muted-foreground'>
          Maximum number of tokens in the response
        </span>
      </div>
    </div>
  );
}

const MODES = [
  { value: 'single', label: 'Single Agent' },
  { value: 'multiagent', label: 'Multi-Agent' },
];


function VersionBadge({ version }) {
  return (
    <span className='inline-flex items-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-0.5 text-[11px] font-semibold text-[#D4AF37]'>
      v{version}
    </span>
  );
}

export default function StudioFormModal({
  entityLabel,
  queryKey,
  initial,
  api,
  onClose,
  readOnly: initialReadOnly = false,
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isEdit = !!initial;
  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
  const [isNewVersion, setIsNewVersion] = useState(false);

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    type: initial?.type ?? 'conversational',
    agent_mode: initial?.agent_mode ?? 'single',
    agents: initial?.agents ?? '[]',
    metadata: initial?.metadata ?? '{}',
    version: initial?.version ?? 1,
    is_public: initial?.is_public ?? false,
    parent_id: null,
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = (key) => () => setForm((f) => ({ ...f, [key]: !f[key] }));

  // Callback for SingleAgentConfig to update the `agents` JSON string
  const handleSingleAgentChange = useCallback((json) => {
    setForm((f) => ({ ...f, agents: json }));
  }, []);

  const handleCreateNewVersion = () => {
    setForm({
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      type: initial?.type ?? 'conversational',
      agent_mode: initial?.agent_mode ?? 'single',
      agents: initial?.agents ?? '[]',
      metadata: initial?.metadata ?? '{}',
      version: (initial?.version ?? 1) + 1,
      is_public: initial?.is_public ?? false,
      parent_id: initial?.id ?? null,
    });
    setIsNewVersion(true);
    setIsReadOnly(false);
  };

  const mutation = useMutation({
    mutationFn: () =>
      isEdit && !isNewVersion ? api.update(initial.id, form) : api.create(form),
    onSuccess: (data) => {
      toast.success(`${entityLabel} ${isEdit && !isNewVersion ? 'updated' : 'created'}`);
      qc.invalidateQueries({ queryKey: [queryKey] });
      onClose();
      // Navigate into the newly created agent
      if (!isEdit || isNewVersion) {
        const newId = data?.id;
        if (newId) {
          navigate(automationPath(entityLabel === 'Workflow' ? `workflows/${newId}` : `agents/${newId}`));
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    mutation.mutate();
  };

  const disabled = mutation.isPending;

  // ── Shared form fields ────────────────────────────────────────────────────
  const formFields = (
    <div className='flex flex-col gap-5'>
      {/* Linked-to banner (new version only) */}
      {isNewVersion && form.parent_id && (
        <div className='flex items-center gap-2 rounded-md border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-3 py-2 text-xs text-[#D4AF37]'>
          <GitBranch size={12} />
          <span className='font-medium'>Branched from:</span>
          <span className='font-mono opacity-80'>{form.parent_id}</span>
        </div>
      )}

      {/* Name */}
      <div className='flex flex-col gap-2'>
        <Label>Name *</Label>
        <Input
          value={form.name}
          onChange={set('name')}
          placeholder={`My ${entityLabel}`}
          disabled={disabled}
        />
      </div>

      {/* Description */}
      <div className='flex flex-col gap-2'>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={set('description')}
          placeholder='What does this do?'
          rows={3}
          disabled={disabled}
          className='resize-none'
        />
      </div>

      {/* Type + Mode (Agents only) */}
      {entityLabel !== 'Workflow' && (
        <div className='grid grid-cols-2 gap-3'>
          <div className='flex flex-col gap-2'>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder='Select type' />
              </SelectTrigger>
              <SelectContent position='item-aligned'>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-2'>
            <Label>Agent Mode</Label>
            <Select value={form.agent_mode} onValueChange={(mode) => {
              setForm((f) => ({
                ...f,
                agent_mode: mode,
                agents: mode === 'single' ? serializeSingleAgent(parseSingleAgent(f.agents)) : '[]',
              }));
            }} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder='Select mode' />
              </SelectTrigger>
              <SelectContent position='item-aligned'>
                {MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Public Access */}
      <div className='flex items-center justify-between rounded-md border border-input px-3 py-3'>
        <div className='flex items-center gap-2.5'>
          {form.is_public
            ? <Globe size={14} className='text-green-500 shrink-0' />
            : <Lock size={14} className='text-muted-foreground shrink-0' />}
          <div className='flex flex-col gap-0.5'>
            <span className='text-sm font-medium text-foreground'>
              {form.is_public ? 'Public' : 'Private'}
            </span>
            <span className='text-xs text-muted-foreground'>
              {form.is_public
                ? 'Anyone with the link can use this agent'
                : 'Only accessible to authorised users'}
            </span>
          </div>
        </div>
        <Switch
          checked={form.is_public}
          onCheckedChange={(checked) => setForm((f) => ({ ...f, is_public: checked }))}
          disabled={disabled}
          className='data-[state=checked]:bg-green-500'
        />
      </div>
    </div>
  );

  // ── VIEW mode — Dialog ────────────────────────────────────────────────────
  if (isReadOnly) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent>
          <DialogHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <DialogTitle>View {entityLabel}</DialogTitle>
                <VersionBadge version={form.version} />
              </div>
              <button
                onClick={handleCreateNewVersion}
                className='flex items-center gap-1.5 rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors mr-6'
              >
                <Pencil size={11} />
                Create New Version
              </button>
            </div>
          </DialogHeader>

          <div className='flex flex-col gap-4'>
            {/* Read-only fields */}
            <div className='flex flex-col gap-2'>
              <Label>Name</Label>
              <Input value={form.name} disabled readOnly />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>Description</Label>
              <Textarea value={form.description} rows={2} disabled readOnly className='resize-none' />
            </div>
            {entityLabel !== 'Workflow' && (
              <div className='grid grid-cols-2 gap-3'>
                <div className='flex flex-col gap-2'>
                  <Label>Type</Label>
                  <Input value={TYPES.find((t) => t.value === form.type)?.label ?? form.type} disabled readOnly />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label>Agent Mode</Label>
                  <Input value={MODES.find((m) => m.value === form.agent_mode)?.label ?? form.agent_mode} disabled readOnly />
                </div>
              </div>
            )}

            {/* Single Agent read-only panel */}
            {entityLabel !== 'Workflow' && form.agent_mode === 'single' && (
              <SingleAgentConfig
                agentsJson={form.agents}
                onChange={() => {}}
                disabled={true}
                readOnly={true}
              />
            )}

            {/* Public access (read-only indicator) */}
            <div className='flex items-center justify-between rounded-md border border-input px-3 py-3'>
              <div className='flex items-center gap-2.5'>
                {form.is_public
                  ? <Globe size={14} className='text-green-500 shrink-0' />
                  : <Lock size={14} className='text-muted-foreground shrink-0' />}
                <div className='flex flex-col gap-0.5'>
                  <span className='text-sm font-medium text-foreground'>
                    {form.is_public ? 'Public' : 'Private'}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {form.is_public ? 'Anyone with the link can use this agent' : 'Only accessible to authorised users'}
                  </span>
                </div>
              </div>
              <Switch checked={form.is_public} disabled className='data-[state=checked]:bg-green-500' />
            </div>

            <div className='flex justify-end pt-1'>
              <button
                type='button'
                onClick={onClose}
                className='rounded-md px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent'
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── EDIT / NEW VERSION mode — Sheet ───────────────────────────────────────
  const sheetTitle = isNewVersion
    ? `New Version — ${initial?.name}`
    : isEdit
      ? `Edit ${entityLabel}`
      : `New ${entityLabel}`;

  return (
    <Sheet open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}>
      <SheetContent side='right'>
        <SheetHeader>
          <div className='flex items-center gap-2'>
            <SheetTitle>{sheetTitle}</SheetTitle>
            {(isEdit || isNewVersion) && <VersionBadge version={form.version} />}
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex-1 overflow-y-auto py-4'>
            {formFields}
          </div>

          <SheetFooter className='flex flex-row items-center justify-end gap-2'>
            <button
              type='button'
              onClick={onClose}
              disabled={mutation.isPending}
              className='rounded-md px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={mutation.isPending}
              className='flex items-center gap-1.5 rounded-md bg-[#D4AF37] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#B8860B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
            >
              {mutation.isPending && <Loader2 size={13} className='animate-spin' />}
              {isNewVersion ? 'Create New Version' : isEdit ? 'Save Changes' : `Create ${entityLabel}`}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
