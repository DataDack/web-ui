/*
  Workflow Node Config Panel — Right sidebar that renders dynamic parameter
  forms for the selected n8n node. Uses Accordion sections for Parameters,
  Credentials, and Expression Help. All form fields use shadcn/ui components.
*/

import React, { useState, useCallback, useMemo, useRef, useEffect, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, Key, Plus, Trash2, X, HelpCircle, Braces, Type, Database, ChevronRight, Copy, Check, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger as TabsTrig, TabsContent } from '@/components/ui/tabs';
import { N8N_NODE_REGISTRY } from '../../helpers/n8nNodeRegistry';
import NodeConfigHeader from '../../pages/Workflows/partials/NodeConfigHeader';
import NodeConfigCredentials from '../../pages/Workflows/partials/NodeConfigCredentials';
import { credentialsApi } from '../../api/workflowCredentials';
import { accountsApi } from '../../api/accounts';
import { BRAND_ICON_MAP } from './workflowIconMap';
import AppTriggerSetup from '../../pages/Workflows/partials/AppTriggerSetup';
import { CREDENTIAL_TYPE_TO_ACCOUNT_PROVIDER } from '../../pages/Workflows/partials/NodeConfigCredentials';
import { UserContext } from '../../context/User';

// Map credential types to registry keys for icon lookup
const CRED_TYPE_ICON_KEY = {
  openAiApi: 'openAi',
  anthropicApi: 'anthropicClaude',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function shouldShowParam(param, parameters) {
  if (!param.showWhen) return true;
  for (const [key, expected] of Object.entries(param.showWhen)) {
    const actual = getNestedValue(parameters, key) ?? parameters[key];
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else {
      if (actual !== expected) return false;
    }
  }
  return true;
}

// ── Field Components ─────────────────────────────────────────────────────────

function StringField({ param, value, onChange }) {
  return (
    <Input
      type='text'
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={param.placeholder || ''}
      className='h-8 text-xs'
    />
  );
}

function NumberField({ param, value, onChange }) {
  return (
    <Input
      type='number'
      value={value ?? param.default ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
      min={param.min}
      max={param.max}
      step={param.step || 1}
      className='h-8 text-xs'
    />
  );
}

function BooleanField({ value, onChange }) {
  return (
    <Switch
      checked={!!value}
      onCheckedChange={onChange}
      className='data-[state=checked]:bg-primary'
    />
  );
}

function SelectField({ param, value, onChange }) {
  // Options can be plain strings or { value, label, description } objects
  const options = (param.options || []).map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const hasDescriptions = options.some((o) => o.description);

  return (
    <Select value={value || param.default || ''} onValueChange={onChange}>
      <SelectTrigger className={`text-xs [&>span]:line-clamp-none [&>span]:text-left ${hasDescriptions ? 'h-auto py-2' : 'h-8'}`}>
        <SelectValue placeholder='Select...' />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className={hasDescriptions ? 'text-xs py-2' : 'text-xs'}>
            <span className={opt.description ? 'font-medium' : ''}>{opt.label}</span>
            {opt.description && (
              <span className='block text-[10px] text-foreground/50 font-normal mt-0.5'>{opt.description}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DynamicSelectField({ param, value, onChange, credentialId, allParameters, accountProvider }) {
  const queryClient = useQueryClient();
  const [userState] = useContext(UserContext);
  const userId = userState?.user?.id;
  const [connecting, setConnecting] = useState(false);
  const fallbackOptions = (param.fallbackOptions || []).map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // If the schema names a provider-specific resource, hit the generic
  // /resources/:resource endpoint. Otherwise keep the legacy /models path
  // (used by LLM credential pickers). Any `dependsOn` field names listed on
  // the param are read out of the current node parameters and forwarded as
  // query params — so e.g. jiraIssueTypes can filter by the selected project.
  const resource = param.resource;
  const dependsOn = Array.isArray(param.dependsOn) ? param.dependsOn : [];
  const extraParams = useMemo(() => {
    if (!resource) return {};
    const out = {};
    for (const k of dependsOn) {
      const v = allParameters?.[k];
      if (v != null && v !== '') out[k] = String(v);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, JSON.stringify(dependsOn), JSON.stringify(dependsOn.map((k) => allParameters?.[k]))]);

  // dependsOn may be unfulfilled (e.g. issueType depends on projectKey but
  // projectKey hasn't been picked yet). When that's the case, skip the fetch —
  // the backend would 400 anyway, and we can guide the user with a clear
  // placeholder instead of surfacing a scary error.
  const unmetDeps = dependsOn.filter((k) => {
    const v = allParameters?.[k];
    return v == null || v === '';
  });
  const queryEnabled = !!credentialId && unmetDeps.length === 0;

  const { data: fetchedOptions, isLoading, isError, error } = useQuery({
    queryKey: resource
      ? ['credential-resources', credentialId, resource, extraParams]
      : ['credential-models', credentialId],
    queryFn: () => (resource
      ? credentialsApi.listResources(credentialId, resource, extraParams)
      : credentialsApi.listModels(credentialId)),
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const options = fetchedOptions && fetchedOptions.length > 0
    ? fetchedOptions.map((opt) => typeof opt === 'string' ? { value: opt, label: opt } : opt)
    : fallbackOptions;

  const disabled = !credentialId || unmetDeps.length > 0;
  const iconKey = CRED_TYPE_ICON_KEY[param.credentialType];
  const ProviderIcon = iconKey ? BRAND_ICON_MAP[iconKey] : null;

  // Detect the backend's "please reconnect" signal. We match loosely because
  // the error arrives as an axios error whose message may be the HTTP status
  // line; the JSON body lives on response.data. Backend emits
  // "jira account not connected — please reconnect" via jira.ErrReconnectRequired.
  const errMsg = error?.response?.data?.message || error?.message || '';
  const needsReconnect = isError && /reconnect|not connected|not found|no refresh_token/i.test(errMsg);

  // Open the OAuth popup for the matching provider (e.g. jira). When the
  // popup posts `account-connected` back to window, we invalidate the query
  // so this field retries with fresh tokens. We deliberately don't show a
  // toast here — multiple DynamicSelectFields render at once (projectKey,
  // issueType, assignee…), and each would fire its own toast. The AccountSelector
  // is the single source of truth for reconnect success/error toasts.
  useEffect(() => {
    if (!accountProvider) return;
    const handler = (event) => {
      if (event.data?.type === 'account-connected' && event.data?.provider === accountProvider) {
        setConnecting(false);
        queryClient.invalidateQueries({ queryKey: ['credential-resources'] });
        queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['connected-accounts', accountProvider] });
      } else if (event.data?.type === 'account-connect-error') {
        setConnecting(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [accountProvider, queryClient]);

  const handleReconnect = useCallback(() => {
    if (!userId || !accountProvider) return;
    setConnecting(true);
    window.open(accountsApi.connectUrl(accountProvider, userId), '_blank', 'width=600,height=700');
  }, [userId, accountProvider]);

  let placeholder = 'Select...';
  if (!credentialId) placeholder = 'Select credential first...';
  else if (unmetDeps.length > 0) placeholder = `Select ${unmetDeps[0]} first...`;
  else if (isLoading) placeholder = 'Loading options...';
  else if (needsReconnect) placeholder = `Reconnect ${accountProvider || 'account'} to load…`;
  else if (isError) placeholder = options.length > 0 ? 'Pick from defaults...' : 'Failed to load — using fallback';

  return (
    <div className='space-y-1'>
      <Select value={value || param.default || ''} onValueChange={onChange} disabled={disabled && options.length === 0}>
        <SelectTrigger className='h-8 text-xs'>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className='text-xs'>
              <span className='flex items-center gap-1.5'>
                {ProviderIcon && <ProviderIcon size={11} className='shrink-0 opacity-50' />}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!credentialId && (
        <p className='text-[10px] text-muted-foreground'>Select a credential to load options</p>
      )}
      {credentialId && unmetDeps.length > 0 && (
        <p className='text-[10px] text-muted-foreground'>Waiting for {unmetDeps.join(', ')}</p>
      )}
      {needsReconnect && accountProvider && (
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-[10px] gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
            onClick={handleReconnect}
            disabled={connecting || !userId}
          >
            <Link2 size={10} /> {connecting ? 'Connecting…' : `Reconnect ${accountProvider}`}
          </Button>
          <p className='text-[10px] text-amber-500/80'>Your {accountProvider} session has expired.</p>
        </div>
      )}
      {isError && !needsReconnect && credentialId && unmetDeps.length === 0 && (
        <p className='text-[10px] text-amber-500/80'>
          {`Couldn't load from server${options.length > 0 ? ' — using defaults' : ''}.`}
        </p>
      )}
    </div>
  );
}

function CodeField({ param, value, onChange }) {
  return (
    <Textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={param.placeholder || ''}
      rows={5}
      className='text-xs font-mono resize-y'
    />
  );
}

// ExpressionDropTarget — minimal drop surface for inputs inside compact rows
// (KeyValue pairs, conditions, assignments). Unlike ExpressionField this
// doesn't render a Fixed/Expression toggle — it just swallows the drag and
// rewrites the child's value via onChange. The wrapped child should be any
// input that accepts a string value.
function ExpressionDropTarget({ currentValue, onChange, children, className = '' }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    if (!e.dataTransfer.types.includes('application/expression-path')) return;
    e.preventDefault();
    setDragOver(false);
    const path = e.dataTransfer.getData('application/expression-path');
    if (!path) return;
    // If the existing value is already a `={{ ... }}` expression and not
    // empty, append inside the braces (e.g. building a concat). Otherwise
    // replace outright.
    const cur = typeof currentValue === 'string' ? currentValue : '';
    const m = cur.match(/^=\{\{\s*(.*?)\s*\}\}$/);
    const next = m && m[1].trim()
      ? `={{ ${m[1]} + ' ' + ${path} }}`
      : `={{ ${path} }}`;
    onChange(next);
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/expression-path')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
    }
  };

  return (
    <div
      className={`relative rounded transition-colors ${dragOver ? 'ring-2 ring-violet-400 bg-violet-500/10' : ''} ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
    >
      {children}
    </div>
  );
}

function KeyValueField({ value, onChange }) {
  const pairs = Array.isArray(value) ? value : [];

  const addPair = () => onChange([...pairs, { name: '', value: '' }]);
  const removePair = (idx) => onChange(pairs.filter((_, i) => i !== idx));
  const updatePair = (idx, field, val) =>
    onChange(pairs.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));

  return (
    <div className='space-y-1.5'>
      {pairs.map((pair, i) => (
        <div key={i} className='flex gap-1'>
          <ExpressionDropTarget
            className='flex-1'
            currentValue={pair.name}
            onChange={(v) => updatePair(i, 'name', v)}
          >
            <Input
              value={pair.name || ''}
              onChange={(e) => updatePair(i, 'name', e.target.value)}
              placeholder='Key'
              className='h-7 text-xs w-full'
            />
          </ExpressionDropTarget>
          <ExpressionDropTarget
            className='flex-1'
            currentValue={pair.value}
            onChange={(v) => updatePair(i, 'value', v)}
          >
            <Input
              value={pair.value || ''}
              onChange={(e) => updatePair(i, 'value', e.target.value)}
              placeholder='Value'
              className='h-7 text-xs w-full'
            />
          </ExpressionDropTarget>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive'
            onClick={() => removePair(i)}
          >
            <X size={12} />
          </Button>
        </div>
      ))}
      <Button
        variant='outline'
        size='sm'
        onClick={addPair}
        className='h-7 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10'
      >
        <Plus size={10} /> Add
      </Button>
    </div>
  );
}

function ConditionsField({ value, onChange }) {
  const conditions = Array.isArray(value) ? value : [];

  const addCondition = () =>
    onChange([
      ...conditions,
      { id: String(conditions.length), leftValue: '', rightValue: '', operator: { type: 'string', operation: 'equals' } },
    ]);

  const removeCondition = (idx) => onChange(conditions.filter((_, i) => i !== idx));

  const updateCondition = (idx, field, val) =>
    onChange(conditions.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));

  const updateOperator = (idx, operation) =>
    onChange(
      conditions.map((c, i) =>
        i === idx ? { ...c, operator: { ...c.operator, operation } } : c
      )
    );

  return (
    <div className='space-y-2'>
      {conditions.map((cond, i) => (
        <Card key={cond.id || i} className='p-2.5 space-y-1.5'>
          <div className='flex gap-1'>
            <ExpressionDropTarget
              className='flex-1'
              currentValue={cond.leftValue}
              onChange={(v) => updateCondition(i, 'leftValue', v)}
            >
              <Input
                value={cond.leftValue || ''}
                onChange={(e) => updateCondition(i, 'leftValue', e.target.value)}
                placeholder='Value (e.g. {{ $json.status }})'
                className='h-7 text-xs w-full'
              />
            </ExpressionDropTarget>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive'
              onClick={() => removeCondition(i)}
            >
              <Trash2 size={11} />
            </Button>
          </div>
          <Select value={cond.operator?.operation || 'equals'} onValueChange={(v) => updateOperator(i, v)}>
            <SelectTrigger className='h-7 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='equals' className='text-xs'>Equals</SelectItem>
              <SelectItem value='notEquals' className='text-xs'>Not Equals</SelectItem>
              <SelectItem value='contains' className='text-xs'>Contains</SelectItem>
              <SelectItem value='notContains' className='text-xs'>Not Contains</SelectItem>
              <SelectItem value='startsWith' className='text-xs'>Starts With</SelectItem>
              <SelectItem value='endsWith' className='text-xs'>Ends With</SelectItem>
              <SelectItem value='gt' className='text-xs'>Greater Than</SelectItem>
              <SelectItem value='gte' className='text-xs'>Greater Than or Equal</SelectItem>
              <SelectItem value='lt' className='text-xs'>Less Than</SelectItem>
              <SelectItem value='lte' className='text-xs'>Less Than or Equal</SelectItem>
              <SelectItem value='isEmpty' className='text-xs'>Is Empty</SelectItem>
              <SelectItem value='isNotEmpty' className='text-xs'>Is Not Empty</SelectItem>
              <SelectItem value='regex' className='text-xs'>Regex</SelectItem>
              <SelectItem value='exists' className='text-xs'>Exists</SelectItem>
            </SelectContent>
          </Select>
          <ExpressionDropTarget
            currentValue={cond.rightValue}
            onChange={(v) => updateCondition(i, 'rightValue', v)}
          >
            <Input
              value={cond.rightValue || ''}
              onChange={(e) => updateCondition(i, 'rightValue', e.target.value)}
              placeholder='Compare to...'
              className='h-7 text-xs w-full'
            />
          </ExpressionDropTarget>
        </Card>
      ))}
      <Button
        variant='outline'
        size='sm'
        onClick={addCondition}
        className='h-7 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10'
      >
        <Plus size={10} /> Add Condition
      </Button>
    </div>
  );
}

function AssignmentsField({ value, onChange }) {
  const assignments = Array.isArray(value) ? value : [];

  const addAssignment = () =>
    onChange([...assignments, { id: String(assignments.length), name: '', value: '', type: 'string' }]);

  const removeAssignment = (idx) => onChange(assignments.filter((_, i) => i !== idx));

  const updateAssignment = (idx, field, val) =>
    onChange(assignments.map((a, i) => (i === idx ? { ...a, [field]: val } : a)));

  return (
    <div className='space-y-2'>
      {assignments.map((asgn, i) => (
        <Card key={asgn.id || i} className='p-2.5 space-y-1.5'>
          <div className='flex gap-1'>
            <Input
              value={asgn.name || ''}
              onChange={(e) => updateAssignment(i, 'name', e.target.value)}
              placeholder='Field name'
              className='flex-1 h-7 text-xs'
            />
            <Select value={asgn.type || 'string'} onValueChange={(v) => updateAssignment(i, 'type', v)}>
              <SelectTrigger className='w-20 h-7 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='string' className='text-xs'>String</SelectItem>
                <SelectItem value='number' className='text-xs'>Number</SelectItem>
                <SelectItem value='boolean' className='text-xs'>Boolean</SelectItem>
                <SelectItem value='array' className='text-xs'>Array</SelectItem>
                <SelectItem value='object' className='text-xs'>Object</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive'
              onClick={() => removeAssignment(i)}
            >
              <Trash2 size={11} />
            </Button>
          </div>
          <ExpressionDropTarget
            currentValue={asgn.value}
            onChange={(v) => updateAssignment(i, 'value', v)}
          >
            <Input
              value={asgn.value || ''}
              onChange={(e) => updateAssignment(i, 'value', e.target.value)}
              placeholder='Value or expression (e.g. {{ $json.name }})'
              className='h-7 text-xs w-full'
            />
          </ExpressionDropTarget>
        </Card>
      ))}
      <Button
        variant='outline'
        size='sm'
        onClick={addAssignment}
        className='h-7 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10'
      >
        <Plus size={10} /> Add Field
      </Button>
    </div>
  );
}

// ── Expression Field Wrapper ────────────────────────────────────────────────

function ExpressionField({ param, value, onChange, onFocus }) {
  const isExpression = typeof value === 'string' && value.startsWith('={{') && value.endsWith('}}');
  const [mode, setMode] = useState(isExpression ? 'expression' : 'fixed');

  const toggleMode = () => {
    if (mode === 'fixed') {
      setMode('expression');
      onChange('={{ }}');
    } else {
      setMode('fixed');
      const raw = (value || '').replace(/^={{/, '').replace(/}}$/, '').trim();
      onChange(raw);
    }
  };

  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const path = e.dataTransfer.getData('application/expression-path');
    if (path) {
      onChange(`={{ ${path} }}`);
      if (mode !== 'expression') setMode('expression');
    }
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/expression-path')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
    }
  };

  const handleDragLeave = () => setDragOver(false);

  if (mode === 'expression') {
    const exprValue = (value || '={{ }}').replace(/^={{\s?/, '').replace(/\s?}}$/, '');
    return (
      <div className='space-y-1'>
        <div className='flex items-center gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleMode}
                className='flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors'
                title='Switch to fixed value'
              >
                <Braces size={10} />
                <span>Expression</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side='top' className='text-xs'>Click to switch to fixed value</TooltipContent>
          </Tooltip>
        </div>
        <div
          className={`relative rounded-md transition-colors ${dragOver ? 'ring-2 ring-violet-400 bg-violet-500/10' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <span className='absolute left-2 top-1/2 -translate-y-1/2 text-violet-400 text-xs font-mono pointer-events-none select-none'>{'{{ '}</span>
          <Input
            type='text'
            value={exprValue}
            onChange={(e) => onChange(`={{ ${e.target.value} }}`)}
            onFocus={onFocus}
            placeholder='$json.fieldName'
            className='h-8 text-xs font-mono pl-7 pr-7 border-violet-500/50 bg-violet-500/5 focus-visible:ring-violet-500/30'
          />
          <span className='absolute right-2 top-1/2 -translate-y-1/2 text-violet-400 text-xs font-mono pointer-events-none select-none'>{' }}'}</span>
        </div>
      </div>
    );
  }

  // Fixed mode - render the original field with a toggle button
  return (
    <div
      className={`space-y-1 rounded-md transition-colors ${dragOver ? 'ring-2 ring-violet-400 bg-violet-500/10 p-1' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className='flex items-center gap-1'>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleMode}
              className='flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors'
              title='Switch to expression'
            >
              <Type size={10} />
              <span>Fixed</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side='top' className='text-xs'>Click to switch to expression, or drag a key here</TooltipContent>
        </Tooltip>
      </div>
      {param.type === 'code' || param.type === 'json' ? (
        <CodeField param={param} value={value} onChange={onChange} />
      ) : (
        <StringField param={param} value={value} onChange={onChange} />
      )}
    </div>
  );
}

// ── JSON Key Tree (Expression Path Builder) ─────────────────────────────────

function JsonKeyEntry({ keyName, val, basePath, onSelectPath, depth }) {
  const path = `${basePath}.${keyName}`;
  const isObject = val != null && typeof val === 'object' && !Array.isArray(val);
  const isArray = Array.isArray(val);
  const [childExpanded, setChildExpanded] = useState(depth < 1);

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div className='flex items-center group'>
        {(isObject || isArray) ? (
          <button
            onClick={() => setChildExpanded(!childExpanded)}
            className='p-0.5 text-muted-foreground hover:text-foreground'
          >
            <ChevronRight size={10} className={`transition-transform ${childExpanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className='w-[14px] shrink-0' />
        )}
        <button
          onClick={() => onSelectPath(path)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/expression-path', path);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className='flex items-center gap-1.5 px-1 py-0.5 rounded text-left hover:bg-violet-500/10 transition-colors w-full text-[11px] cursor-grab active:cursor-grabbing'
        >
          <span className='text-violet-400 font-medium'>{keyName}</span>
          <span className='text-muted-foreground text-[10px] truncate'>
            {isArray
              ? `[${val.length}]`
              : isObject
                ? '{...}'
                : String(JSON.stringify(val) || '').slice(0, 30)}
          </span>
        </button>
      </div>
      {isObject && childExpanded && (
        <JsonKeyTree data={val} basePath={path} onSelectPath={onSelectPath} depth={depth + 1} />
      )}
      {isArray && childExpanded && val[0] && typeof val[0] === 'object' && (
        <JsonKeyTree data={val[0]} basePath={`${path}[0]`} onSelectPath={onSelectPath} depth={depth + 1} />
      )}
    </div>
  );
}

function JsonKeyTree({ data, basePath = '$json', onSelectPath, depth = 0 }) {
  if (data == null || typeof data !== 'object') return null;

  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div>
      {entries.map(([key, val]) => (
        <JsonKeyEntry
          key={key}
          keyName={key}
          val={val}
          basePath={basePath}
          onSelectPath={onSelectPath}
          depth={depth}
        />
      ))}
    </div>
  );
}

// ── Input Data Viewer ───────────────────────────────────────────────────────

// collectAncestors walks incoming edges BFS and returns the ancestor chain in
// nearest-first order (index 0 is the direct predecessor). We render each
// ancestor as its own collapsible section so the user can drag any upstream
// field — not just the immediately preceding one, which is how n8n works.
function collectAncestors(selectedNode, allNodes, edges) {
  if (!selectedNode || !edges || !allNodes) return [];
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const queue = [{ id: selectedNode.id, depth: 0 }];
  const seen = new Set([selectedNode.id]);
  const ordered = [];
  while (queue.length) {
    const { id, depth } = queue.shift();
    for (const e of edges) {
      if (e.target === id && !seen.has(e.source)) {
        seen.add(e.source);
        const node = byId.get(e.source);
        if (node) ordered.push({ node, depth: depth + 1 });
        queue.push({ id: e.source, depth: depth + 1 });
      }
    }
  }
  return ordered;
}

// Fallback schema shown before the workflow has been executed so users can
// wire expressions without running first. Keyed by registryKey (a rough
// mirror of what the converter emits for that node — see nodes/core.go and
// nodes/ai.go). When lastExecutionData is available we prefer that.
const STATIC_OUTPUT_SCHEMAS = {
  httpRequest:    { body: { field: 'value' }, statusCode: 200, statusMessage: 'OK', ok: true, url: 'https://example.com', headers: { 'content-type': 'application/json' } },
  manualTrigger:  {},
  webhook:        { headers: {}, params: {}, query: {}, body: {} },
  scheduleTrigger:{ now: '2026-01-01T00:00:00Z' },
  set:            { field1: 'value', field2: 123 },
  code:           { result: 'return value from your code' },
  openAi:         { message: 'assistant reply', raw: {} },
  githubTrigger:  { platform: 'github', event_type: 'push', body: { repository: {}, commits: [] } },
  jiraTrigger:    { platform: 'jira', event_type: 'jira:issue_created', body: { issue: {} } },
  googleSheetsTrigger: { platform: 'google_sheets', event_type: 'row_added', row_index: 1, row_values: [] },
  googleDriveTrigger:  { platform: 'google_drive', event_type: 'added', change: {} },
  googleGmailTrigger:  { platform: 'google_gmail', event_type: 'message_added', message: {} },
  slack:          { ok: true, ts: '1234.5678', channel: 'C12345' },
  discord:        { id: '123', channel_id: '456' },
  jira:           { id: '10001', key: 'PROJ-123', self: 'https://...' },
  github:         { id: 1, node_id: '', number: 42, title: '', html_url: '' },
  postgres:       [{ column: 'value' }],
  mySql:          [{ column: 'value' }],
};

// InputDataViewer — renders every ancestor node's output (or fallback schema)
// so the user can drag any JSON leaf into any expression-accepting field. The
// basePath for each ancestor is `$node["Name"].json.*` except for the direct
// predecessor, which uses `$json.*` (matching what n8n's expression parser
// treats as shorthand for "the current input").
function InputDataViewer({ selectedNode, allNodes, edges, lastExecutionData, onSelectPath }) {
  const ancestors = useMemo(
    () => collectAncestors(selectedNode, allNodes, edges),
    [selectedNode, allNodes, edges],
  );

  if (ancestors.length === 0) {
    return (
      <div className='text-xs text-muted-foreground text-center py-3'>
        No input node connected
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <VariablesPanel onSelectPath={onSelectPath} />

      {ancestors.map(({ node }, idx) => {
        const nodeName = node.data?.label || node.id;
        // Direct predecessor uses the $json shorthand; all others need a
        // qualified $node["Name"].json path so the expression parser picks
        // the right scope at runtime.
        const basePath = idx === 0 ? '$json' : `$node["${nodeName}"].json`;
        const data = lastExecutionData?.[node.id]
          ?? STATIC_OUTPUT_SCHEMAS[node.data?.registryKey]
          ?? null;

        return (
          <div key={node.id} className='space-y-1'>
            <div className='flex items-center gap-1.5'>
              <Badge variant='outline' className='text-[10px] font-normal'>
                {nodeName}
              </Badge>
              <span className='text-[10px] text-muted-foreground'>
                {idx === 0 ? 'direct input' : `${idx + 1} steps back`}
              </span>
              {!lastExecutionData?.[node.id] && (
                <span className='text-[9px] text-amber-500/70 italic'>schema preview</span>
              )}
            </div>

            {data == null ? (
              <div className='text-[10px] text-muted-foreground italic px-2'>
                No output schema — run the workflow to populate.
              </div>
            ) : (
              <div className='rounded border bg-muted/30 p-2 max-h-[200px] overflow-y-auto'>
                <JsonKeyTree data={data} basePath={basePath} onSelectPath={onSelectPath} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// VariablesPanel — a fixed set of draggable "helper" tokens n8n-style. These
// map to functions our ExpressionParser already understands at runtime (see
// n8n-js-converter/internal/converter/expression_parser.go): $now, $today,
// $workflow.id, $workflow.name, $execution.id, $env.<VAR>.
function VariablesPanel({ onSelectPath }) {
  const tokens = [
    { label: '$now',            path: '$now',            hint: 'ISO-8601 now' },
    { label: '$today',          path: '$today',          hint: 'YYYY-MM-DD' },
    { label: '$workflow.id',    path: '$workflow.id',    hint: 'current workflow id' },
    { label: '$workflow.name',  path: '$workflow.name',  hint: 'current workflow name' },
    { label: '$execution.id',   path: '$execution.id',   hint: 'Lambda request id' },
  ];
  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-1.5'>
        <Badge variant='outline' className='text-[10px] font-normal'>Variables</Badge>
        <span className='text-[10px] text-muted-foreground'>helpers</span>
      </div>
      <div className='rounded border bg-muted/30 p-2 flex flex-wrap gap-1'>
        {tokens.map((t) => (
          <button
            key={t.path}
            onClick={() => onSelectPath(t.path)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/expression-path', t.path);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            title={t.hint}
            className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors cursor-grab active:cursor-grabbing'
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Dynamic Field Renderer ───────────────────────────────────────────────────

const EXPRESSION_SUPPORTED_TYPES = new Set(['string', 'code', 'json']);

function ParameterField({ param, value, onChange, onExpressionFocus, credentials, allParameters }) {
  // Wrap expression-supported types with ExpressionField
  if (EXPRESSION_SUPPORTED_TYPES.has(param.type)) {
    return (
      <ExpressionField
        param={param}
        value={value}
        onChange={onChange}
        onFocus={() => onExpressionFocus?.(param.key)}
      />
    );
  }

  switch (param.type) {
    case 'number':
      return <NumberField param={param} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanField value={value} onChange={onChange} />;
    case 'select':
      return <SelectField param={param} value={value} onChange={onChange} />;
    case 'dynamicSelect': {
      // Pick the first credential the node has wired that matches any of the
      // param's accepted credential types. A param can declare either a
      // single string `credentialType` (legacy) or an array `credentialTypes`
      // (for nodes like Jira that accept Cloud OR Server).
      const accepted = Array.isArray(param.credentialTypes)
        ? param.credentialTypes
        : (param.credentialType ? [param.credentialType] : []);
      let credId;
      let matchedType;
      for (const t of accepted) {
        if (credentials?.[t]?.id) { credId = credentials[t].id; matchedType = t; break; }
      }
      // If the matched credential type is OAuth-backed (Connected Account),
      // plumb the provider down so the field can offer a "Reconnect" button
      // on auth failure.
      const accountProvider = matchedType ? CREDENTIAL_TYPE_TO_ACCOUNT_PROVIDER[matchedType] : null;
      return (
        <DynamicSelectField
          param={param}
          value={value}
          onChange={onChange}
          credentialId={credId}
          allParameters={allParameters}
          accountProvider={accountProvider}
        />
      );
    }
    case 'keyValue':
      return <KeyValueField value={value} onChange={onChange} />;
    case 'conditions':
      return <ConditionsField value={value} onChange={onChange} />;
    case 'assignments':
      return <AssignmentsField value={value} onChange={onChange} />;
    default:
      return <StringField param={param} value={value} onChange={onChange} />;
  }
}

// ── Main Config Panel ────────────────────────────────────────────────────────

export default function WorkflowNodeConfig({ selectedNode, onUpdate, allNodes, edges, lastExecutionData, deployInfo }) {
  const data = selectedNode?.data;
  const registryKey = data?.registryKey;
  const def = registryKey ? N8N_NODE_REGISTRY[registryKey] : null;

  // Track which expression field is currently focused for path insertion
  const activeExpressionFieldRef = useRef(null);

  const handleExpressionFocus = useCallback((paramKey) => {
    activeExpressionFieldRef.current = paramKey;
  }, []);

  const handleSelectPath = useCallback(
    (path) => {
      const paramKey = activeExpressionFieldRef.current;
      if (!paramKey || !selectedNode) return;
      const newParams = { ...(data.parameters || {}), [paramKey]: `={{ ${path} }}` };
      onUpdate(selectedNode.id, { parameters: newParams });
    },
    [selectedNode, data, onUpdate]
  );

  const handleParamChange = useCallback(
    (paramKey, value) => {
      if (!selectedNode) return;
      const newParams = { ...(data.parameters || {}), [paramKey]: value };
      onUpdate(selectedNode.id, { parameters: newParams });
    },
    [selectedNode, data, onUpdate]
  );

  const handleLabelChange = useCallback(
    (newLabel) => {
      if (!selectedNode) return;
      const isDuplicate = allNodes.some(
        (n) => n.id !== selectedNode.id && n.data?.label === newLabel
      );
      if (isDuplicate) return;
      onUpdate(selectedNode.id, { label: newLabel });
    },
    [selectedNode, allNodes, onUpdate]
  );

  const handleCredentialChange = useCallback(
    (newCredentials) => {
      if (!selectedNode) return;
      onUpdate(selectedNode.id, { credentials: newCredentials });
    },
    [selectedNode, onUpdate]
  );

  const visibleParams = useMemo(() => {
    if (!def) return [];
    return def.parameters.filter((p) => shouldShowParam(p, data?.parameters || {}));
  }, [def, data?.parameters]);

  const hasCredentials = def && def.credentials.length > 0;

  // Empty state
  if (!selectedNode || !data) {
    return (
      <div className='h-full flex flex-col items-center justify-center text-muted-foreground p-6' style={{ backgroundColor: 'var(--workflow-sidebar-bg)' }}>
        <Settings2 size={32} className='mb-3 opacity-30' />
        <p className='text-xs text-center'>Select a node on the canvas to configure its parameters</p>
      </div>
    );
  }

  const defaultOpen = hasCredentials ? ['credentials', 'parameters'] : ['parameters'];

  return (
    <TooltipProvider delayDuration={300}>
      <div className='h-full flex flex-col' style={{ backgroundColor: 'var(--workflow-sidebar-bg)' }}>
        {/* Header */}
        <NodeConfigHeader
          data={data}
          def={def}
          onLabelChange={handleLabelChange}
        />

        {/* Accordion sections */}
        <ScrollArea className='flex-1'>
          <Accordion type='multiple' defaultValue={defaultOpen} className='w-full'>
            {/* Input Data section */}
            <AccordionItem value='input-data' className='border-b'>
              <AccordionTrigger className='px-4 py-2.5 text-xs font-semibold hover:no-underline'>
                <span className='flex items-center gap-1.5'>
                  <Database size={12} className='text-violet-400' />
                  Input Data
                </span>
              </AccordionTrigger>
              <AccordionContent className='px-4 pb-3'>
                <InputDataViewer
                  selectedNode={selectedNode}
                  allNodes={allNodes}
                  edges={edges}
                  lastExecutionData={lastExecutionData}
                  onSelectPath={handleSelectPath}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Credentials section — before parameters so user selects creds first */}
            {hasCredentials && (
              <AccordionItem value='credentials' className='border-b'>
                <AccordionTrigger className='px-4 py-2.5 text-xs font-semibold hover:no-underline'>
                  <span className='flex items-center gap-1.5'>
                    <Key size={12} className='text-primary' />
                    Credentials
                  </span>
                </AccordionTrigger>
                <AccordionContent className='px-4 pb-3'>
                  <NodeConfigCredentials
                    credentialTypes={(() => {
                      if (!def.credentialsByAuthMode) return def.credentials;
                      const mode = data.parameters?.authMode || def.defaults?.authMode;
                      return mode ? (def.credentialsByAuthMode[mode] || def.credentials) : def.credentials;
                    })()}
                    credentials={data.credentials || {}}
                    onChange={handleCredentialChange}
                  />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Parameters section */}
            <AccordionItem value='parameters' className='border-b'>
              <AccordionTrigger className='px-4 py-2.5 text-xs font-semibold hover:no-underline'>
                <span className='flex items-center gap-1.5'>
                  <Settings2 size={12} />
                  Parameters
                  {visibleParams.length > 0 && (
                    <span className='text-[10px] font-normal text-muted-foreground'>
                      ({visibleParams.length})
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className='px-4 pb-3'>
                {/* Webhook URL — shown only for webhook nodes when deployed */}
                {data.registryKey === 'webhook' && deployInfo?.webhook_url && (
                  <div className='mb-3 p-2.5 rounded-lg border bg-muted/50'>
                    <Label className='text-[11px] font-medium mb-1.5 block'>Webhook URL</Label>
                    <div className='flex items-center gap-1.5'>
                      <code className='flex-1 text-[11px] bg-background rounded px-2 py-1.5 border select-all break-all'>
                        {window.location.origin}{deployInfo.webhook_url}
                      </code>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 shrink-0'
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + deployInfo.webhook_url);
                        }}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                )}
                {/* MCP connection config — always shown for MCP trigger */}
                {data.registryKey === 'mcpTrigger' && (() => {
                  const isDeployed = !!deployInfo?.mcp_url;
                  const fullUrl = isDeployed ? window.location.origin + deployInfo.mcp_url : '';
                  const authType = data.parameters?.authentication || 'none';
                  const bearerToken = deployInfo?.mcp_bearer_token || '';
                  const serverName = (data.label || 'datadack-workflow').replace(/\s+/g, '-').toLowerCase();

                  const CopyBtn = ({ text, className = '' }) => {
                    const [copied, setCopied] = React.useState(false);
                    return (
                      <Button
                        variant='ghost'
                        size='icon'
                        className={`h-6 w-6 shrink-0 ${className}`}
                        onClick={() => {
                          navigator.clipboard.writeText(text);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                      >
                        {copied ? <Check size={11} className='text-green-500' /> : <Copy size={11} />}
                      </Button>
                    );
                  };

                  const ConfigSnippet = ({ code, helpText, filePath }) => (
                    <div className='space-y-1.5'>
                      {filePath && (
                        <p className='text-[10px] text-muted-foreground'>
                          Add to <code className='bg-muted px-1 rounded'>{filePath}</code>
                        </p>
                      )}
                      <div className='relative'>
                        <pre className='text-[10px] bg-background rounded px-2 py-1.5 border overflow-x-auto whitespace-pre'>{code}</pre>
                        <CopyBtn text={code} className='absolute top-1 right-1' />
                      </div>
                      {helpText && <p className='text-[10px] text-muted-foreground'>{helpText}</p>}
                    </div>
                  );

                  if (!isDeployed) {
                    return (
                      <div className='mb-3 p-2.5 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 space-y-2'>
                        <Label className='text-[11px] font-medium block'>MCP Connection</Label>
                        <p className='text-[11px] text-muted-foreground'>
                          Deploy this workflow to get your MCP endpoint URL and connection configs for Claude Desktop, Claude Code, Cursor, Windsurf, and other MCP clients.
                        </p>
                        {authType === 'bearer' && (
                          <p className='text-[10px] text-muted-foreground'>
                            A bearer token will be auto-generated on deploy.
                          </p>
                        )}
                      </div>
                    );
                  }

                  const headerArgs = authType === 'bearer' && bearerToken
                    ? ['--header', `Authorization: Bearer ${bearerToken}`]
                    : [];
                  const mcpRemoteArgs = ['mcp-remote', fullUrl, ...headerArgs];

                  const claudeDesktopConfig = JSON.stringify({
                    mcpServers: {
                      [serverName]: { command: 'npx', args: mcpRemoteArgs },
                    },
                  }, null, 2);

                  const cursorConfig = JSON.stringify({
                    mcpServers: {
                      [serverName]: { command: 'npx', args: mcpRemoteArgs },
                    },
                  }, null, 2);

                  const windsurfConfig = JSON.stringify({
                    mcpServers: {
                      [serverName]: { command: 'npx', args: mcpRemoteArgs },
                    },
                  }, null, 2);

                  const claudeCodeCmd = `claude mcp add ${serverName} -- npx ${mcpRemoteArgs.slice(0).map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;

                  const curlHeaders = authType === 'bearer' && bearerToken
                    ? `-H "Authorization: Bearer ${bearerToken}" \\\n  `
                    : '';
                  const curlExample = `curl -X POST ${fullUrl} \\\n  ${curlHeaders}-H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

                  return (
                    <div className='mb-3 p-2.5 rounded-lg border bg-muted/50 space-y-2.5'>
                      <div>
                        <Label className='text-[11px] font-medium mb-1.5 block'>MCP Endpoint</Label>
                        <div className='flex items-center gap-1.5'>
                          <code className='flex-1 text-[11px] bg-background rounded px-2 py-1.5 border select-all break-all'>
                            {fullUrl}
                          </code>
                          <CopyBtn text={fullUrl} />
                        </div>
                      </div>

                      {authType === 'bearer' && bearerToken && (
                        <div>
                          <Label className='text-[11px] font-medium mb-1.5 block'>Bearer Token</Label>
                          <div className='flex items-center gap-1.5'>
                            <code className='flex-1 text-[11px] bg-background rounded px-2 py-1.5 border select-all break-all font-mono'>
                              {bearerToken}
                            </code>
                            <CopyBtn text={bearerToken} />
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className='text-[11px] font-medium mb-1.5 block'>Connect with</Label>
                        <Tabs defaultValue='claude-desktop' className='w-full'>
                          <TabsList className='w-full h-7 p-0.5'>
                            <TabsTrig value='claude-desktop' className='text-[10px] px-2 py-0.5 h-6'>Claude Desktop</TabsTrig>
                            <TabsTrig value='claude-code' className='text-[10px] px-2 py-0.5 h-6'>Claude Code</TabsTrig>
                            <TabsTrig value='cursor' className='text-[10px] px-2 py-0.5 h-6'>Cursor</TabsTrig>
                            <TabsTrig value='windsurf' className='text-[10px] px-2 py-0.5 h-6'>Windsurf</TabsTrig>
                            <TabsTrig value='http' className='text-[10px] px-2 py-0.5 h-6'>HTTP / cURL</TabsTrig>
                          </TabsList>

                          <TabsContent value='claude-desktop'>
                            <ConfigSnippet
                              code={claudeDesktopConfig}
                              filePath='claude_desktop_config.json'
                              helpText='Open Claude Desktop > Settings > Developer > Edit Config, paste and restart.'
                            />
                          </TabsContent>

                          <TabsContent value='claude-code'>
                            <ConfigSnippet
                              code={claudeCodeCmd}
                              helpText='Run this command in your terminal to add the MCP server to Claude Code.'
                            />
                          </TabsContent>

                          <TabsContent value='cursor'>
                            <ConfigSnippet
                              code={cursorConfig}
                              filePath='.cursor/mcp.json'
                              helpText='Add to your project root or global Cursor MCP config, then restart Cursor.'
                            />
                          </TabsContent>

                          <TabsContent value='windsurf'>
                            <ConfigSnippet
                              code={windsurfConfig}
                              filePath='~/.codeium/windsurf/mcp_config.json'
                              helpText='Add to your Windsurf MCP config and restart the editor.'
                            />
                          </TabsContent>

                          <TabsContent value='http'>
                            <ConfigSnippet
                              code={curlExample}
                              helpText='Use this to call the MCP endpoint directly from any HTTP client. Supports JSON-RPC methods: initialize, tools/list, tools/call.'
                            />
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  );
                })()}
                {/* App Triggers — platform-specific OAuth + webhook setup */}
                {['githubTrigger', 'slackTrigger', 'telegramTrigger', 'discordTrigger', 'whatsappTrigger', 'instagramTrigger', 'threadsTrigger', 'googleDriveTrigger', 'googleSheetsTrigger', 'googleGmailTrigger', 'googleCalendarTrigger', 'microsoftOutlookTrigger', 'microsoftOneDriveTrigger', 'microsoftCalendarTrigger', 'microsoftExcelTrigger', 'jiraTrigger'].includes(data.registryKey) && deployInfo?.workflow_id && (
                  <div className='mb-3'>
                    <AppTriggerSetup
                      workflowId={deployInfo.workflow_id}
                      nodeData={data}
                      onUpdateParams={(updates) => {
                        const newParams = { ...(data.parameters || {}), ...updates };
                        onUpdate(selectedNode.id, { parameters: newParams });
                      }}
                    />
                  </div>
                )}
                {visibleParams.length === 0 && !['githubTrigger', 'slackTrigger', 'telegramTrigger', 'discordTrigger', 'whatsappTrigger', 'instagramTrigger', 'threadsTrigger', 'googleDriveTrigger', 'googleSheetsTrigger', 'googleGmailTrigger', 'googleCalendarTrigger', 'microsoftOutlookTrigger', 'microsoftOneDriveTrigger', 'microsoftCalendarTrigger', 'microsoftExcelTrigger', 'jiraTrigger'].includes(data.registryKey) ? (
                  <div className='text-xs text-muted-foreground text-center py-3'>
                    This node has no configurable parameters
                  </div>
                ) : visibleParams.length > 0 ? (
                  <div className='space-y-3'>
                    {visibleParams.map((param) => {
                      const value = getNestedValue(data.parameters || {}, param.key) ?? data.parameters?.[param.key];
                      return (
                        <div key={param.key} className='space-y-1.5'>
                          <Label className='text-[11px] font-medium flex items-center gap-1'>
                            {param.label}
                            {param.required && <span className='text-destructive'>*</span>}
                            {param.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle size={10} className='text-muted-foreground cursor-help' />
                                </TooltipTrigger>
                                <TooltipContent side='right' className='max-w-[200px] text-xs'>
                                  {param.description}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </Label>
                          <ParameterField
                            param={param}
                            value={value}
                            onChange={(val) => handleParamChange(param.key, val)}
                            onExpressionFocus={handleExpressionFocus}
                            credentials={data.credentials}
                            allParameters={data.parameters || {}}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </AccordionContent>
            </AccordionItem>

            {/* Expression help section */}
            <AccordionItem value='help' className='border-b'>
              <AccordionTrigger className='px-4 py-2.5 text-xs font-semibold hover:no-underline'>
                <span className='flex items-center gap-1.5'>
                  <HelpCircle size={12} />
                  Expression Help
                </span>
              </AccordionTrigger>
              <AccordionContent className='px-4 pb-3'>
                <Card className='p-3 text-[11px] text-muted-foreground space-y-1.5'>
                  <p className='font-medium text-foreground'>Use n8n expressions in text fields:</p>
                  <code className='block text-[10px] font-mono bg-muted/50 px-2 py-1 rounded'>
                    {'{{ $json.fieldName }}'}
                  </code>
                  <code className='block text-[10px] font-mono bg-muted/50 px-2 py-1 rounded'>
                    {"{{ $('Node Name').item.json.field }}"}
                  </code>
                  <code className='block text-[10px] font-mono bg-muted/50 px-2 py-1 rounded'>
                    {'{{ $input.first().json.key }}'}
                  </code>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
