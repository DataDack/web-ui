/*
  StudioToolbar — Topbar for the workflow studio.
  Glassmorphism background, gold accent branding, inline title/desc editing.
*/

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Loader2,
  Download,
  Rocket,
  CloudUpload,
  Play,
  ScrollText,
  GitCommitVertical,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ── Version helpers ────────────────────────────────────────────────────────

function parseVersion(raw) {
  if (!raw) return [1, 0, 0];
  const str = String(raw);
  // Try semver "1.2.3"
  const m = str.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  // Fallback: treat integer as 0.int.0
  const n = parseInt(str, 10);
  if (!isNaN(n)) return [0, n, 0];
  return [0, 1, 0];
}

function bumpVersion([major, minor, patch], type) {
  switch (type) {
    case 'major': return [major + 1, 0, 0];
    case 'minor': return [major, minor + 1, 0];
    case 'patch': return [major, minor, patch + 1];
    default: return [major, minor, patch + 1];
  }
}

function formatVersion(v) {
  return `${v[0]}.${v[1]}.${v[2]}`;
}

// ── Deploy Popover ─────────────────────────────────────────────────────────

function DeployPopover({ children, deploying, currentVersion, onDeploy }) {
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState('patch');
  const [desc, setDesc] = useState('');

  const current = parseVersion(currentVersion);
  const next = bumpVersion(current, bump);

  const handleDeploy = () => {
    const versionStr = formatVersion(next);
    onDeploy({ description: desc, version: versionStr, bump });
    setDesc('');
    // Don't close — popover stays open to show deploy progress
  };

  // Close popover when deploy finishes (deploying goes from true → false while open)
  const prevDeploying = useRef(deploying);
  useEffect(() => {
    if (prevDeploying.current && !deploying && open) {
      setOpen(false);
    }
    prevDeploying.current = deploying;
  }, [deploying, open]);

  return (
    <Popover open={open} onOpenChange={(v) => { if (!deploying) setOpen(v); }}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent align='end' sideOffset={8} className='w-[360px] p-5 space-y-5'>

        {/* Header */}
        <div className='space-y-1'>
          <h4 className='text-sm font-semibold text-foreground'>Deploy Workflow</h4>
          <p className='text-xs text-muted-foreground leading-relaxed'>
            Publish a new version to Lambda. Choose a version bump type and optionally describe what changed.
          </p>
        </div>

        {/* Version bump */}
        <div className='space-y-2.5'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>Version bump</span>
            <span className='font-mono text-xs text-muted-foreground tabular-nums'>
              {formatVersion(current)} &rarr; <span className='text-foreground font-medium'>{formatVersion(next)}</span>
            </span>
          </div>
          <div className='flex gap-1.5'>
            {[
              { value: 'patch', label: 'Patch' },
              { value: 'minor', label: 'Minor' },
              { value: 'major', label: 'Major' },
            ].map((opt) => (
              <Button
                key={opt.value}
                type='button'
                variant={bump === opt.value ? 'default' : 'outline'}
                size='sm'
                className='flex-1 text-xs h-8'
                onClick={() => setBump(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className='space-y-1.5'>
          <span className='text-xs font-medium text-muted-foreground'>Release notes</span>
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !deploying) handleDeploy(); }}
            placeholder='e.g. Fixed webhook timeout issue'
            autoFocus
            className='h-9 text-sm'
          />
        </div>

        {/* Deploy button */}
        <Button
          type='button'
          onClick={handleDeploy}
          disabled={deploying}
          className='w-full h-9'
        >
          {deploying ? <Loader2 size={14} className='animate-spin' /> : <Rocket size={14} />}
          {deploying ? 'Deploying...' : `Deploy v${formatVersion(next)}`}
        </Button>

      </PopoverContent>
    </Popover>
  );
}

// ── Compute Settings Popover ───────────────────────────────────────────────

const WCU_OPTIONS = [
  { value: 1, label: '1x', memory: '128 MB', vcpu: '~0.08' },
  { value: 2, label: '2x', memory: '256 MB', vcpu: '~0.17' },
  { value: 4, label: '4x', memory: '512 MB', vcpu: '~0.33' },
  { value: 8, label: '8x', memory: '1024 MB', vcpu: '~0.67' },
];

function ComputeSettingsPopover({ children, wcu, onWcuChange, timeout, onTimeoutChange }) {
  const selected = WCU_OPTIONS.find((o) => o.value === wcu) || WCU_OPTIONS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent align='end' sideOffset={8} className='w-[320px] p-5 space-y-5'>

        {/* Header */}
        <div className='space-y-1'>
          <h4 className='text-sm font-semibold text-foreground'>Compute Settings</h4>
          <p className='text-xs text-muted-foreground leading-relaxed'>
            Configure the compute resources for this workflow.
          </p>
        </div>

        {/* WCU selector */}
        <div className='space-y-2.5'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>Compute Size (WCU)</span>
            <span className='font-mono text-[10px] text-muted-foreground tabular-nums'>
              {selected.memory} &middot; {selected.vcpu} vCPU
            </span>
          </div>
          <div className='flex gap-1.5'>
            {WCU_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type='button'
                variant={wcu === opt.value ? 'default' : 'outline'}
                size='sm'
                className='flex-1 text-xs h-8 flex-col gap-0 py-1'
                onClick={() => onWcuChange(opt.value)}
              >
                <span className='font-semibold'>{opt.label}</span>
                <span className='text-[9px] opacity-60 font-normal'>{opt.memory}</span>
              </Button>
            ))}
          </div>
          <p className='text-[10px] text-muted-foreground'>
            1 WCU = 128 MB memory with proportional CPU
          </p>
        </div>

        {/* Timeout */}
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-muted-foreground'>Timeout</span>
            <span className='font-mono text-[10px] text-muted-foreground tabular-nums'>
              max 900s (15 min)
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Input
              type='number'
              min={1}
              max={900}
              value={timeout}
              onChange={(e) => {
                const v = Math.min(900, Math.max(1, parseInt(e.target.value, 10) || 1));
                onTimeoutChange(v);
              }}
              className='h-9 text-sm font-mono w-full'
            />
            <span className='text-xs text-muted-foreground shrink-0'>seconds</span>
          </div>
        </div>

      </PopoverContent>
    </Popover>
  );
}

// ── Main Toolbar ───────────────────────────────────────────────────────────

export default function StudioToolbar({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  wcu = 1,
  onWcuChange,
  timeout = 900,
  onTimeoutChange,
  dirty,
  saving,
  onSave,
  onExport,
  onBack,
  deployStatus,
  deploying,
  deployInfo,
  onDeploy,
  onRedeploy,
  onOpenTestPanel,
  onOpenLogsPanel,
  onOpenVersionsPanel,
  hasManualTrigger = true,
}) {
  const descRef = useRef(null);

  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = '0px';
      descRef.current.style.height = Math.min(descRef.current.scrollHeight, 60) + 'px';
    }
  }, [description]);

  const isDeployed = deployStatus === 'deployed';
  const isFailed = deployStatus === 'failed';
  const latestVersion = deployInfo?.latest_version_tag || null;
  const defaultVersion = deployInfo?.default_version_tag || latestVersion;

  return (
    <TooltipProvider delayDuration={300}>
      <div className='shrink-0'>
        {/* Main bar */}
        <div className='h-14 flex items-center gap-3 px-4 backdrop-blur-xl border-b border-border' style={{ backgroundColor: 'var(--workflow-panel-bg)' }}>

          {/* ── Left: Back + Brand + Title ── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' onClick={onBack}>
                <ArrowLeft size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='text-xs'>
              Back to workflows
            </TooltipContent>
          </Tooltip>

          {/* Separator */}
          <div className='h-7 w-px bg-border shrink-0' />

          {/* Brand mark + App name */}
          <div className='flex items-center gap-2 shrink-0'>
            <div className='w-8 h-8 rounded-xl bg-muted flex items-center justify-center'>
              <img src='/logo.png' alt='Logo' className='w-5 h-5' />
            </div>
            <div className='flex flex-col'>
              <span className="text-[13px] font-bold tracking-tight font-['Syne',sans-serif] text-foreground/80 leading-tight">
                Data<span className='text-[#D4AF37]'>Dack</span>
              </span>
              <span className='text-[10px] text-muted-foreground leading-tight dark:text-muted-foreground/80'>Workflow</span>
            </div>
          </div>

          {/* Separator */}
          <div className='h-7 w-px bg-border shrink-0' />

          {/* Title + Description */}
          <div className='flex flex-col justify-center min-w-0 max-w-[420px] overflow-hidden'>
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="text-[13px] font-semibold tracking-tight font-['Syne',sans-serif] bg-transparent text-foreground outline-none w-full px-1.5 py-0 h-5 rounded hover:bg-muted focus:bg-muted transition-all duration-200 placeholder:text-muted-foreground/40 border-none ring-0 focus:ring-0"
              placeholder='Workflow name...'
              spellCheck={false}
            />
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className='text-[10px] text-muted-foreground bg-transparent outline-none w-full px-1.5 py-0 h-4 min-h-[14px] max-h-[14px] rounded hover:bg-muted focus:bg-muted focus:text-foreground transition-all duration-200 placeholder:text-muted-foreground/30 resize-none overflow-hidden leading-[14px] border-none ring-0 focus:ring-0'
              placeholder='Add a description...'
              rows={1}
              spellCheck={false}
            />
          </div>

          {/* ── Center: flex spacer ── */}
          <div className='flex-1' />

          {/* ── Right: Status + Actions ── */}

          {/* Unsaved indicator */}
          {dirty && (
            <div className='flex items-center gap-1.5 shrink-0 mr-1'>
              <div className='w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse' />
              <span className='text-[11px] text-amber-400/80 font-medium'>Unsaved</span>
            </div>
          )}

          {/* Secondary actions */}
          <ComputeSettingsPopover
            wcu={wcu}
            onWcuChange={onWcuChange}
            timeout={timeout}
            onTimeoutChange={onTimeoutChange}
          >
            <Button variant='outline' size='sm'>
              <Settings2 size={13} />
              {wcu}x WCU
            </Button>
          </ComputeSettingsPopover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='sm' onClick={onExport}>
                <Download size={13} />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='text-xs'>
              Download workflow JSON
            </TooltipContent>
          </Tooltip>

          {/* Separator */}
          <div className='h-7 w-px bg-border shrink-0' />

          {/* Deploy / Deployed actions */}
          {!isDeployed ? (
            <DeployPopover
              deploying={deploying}
              currentVersion={latestVersion}
              onDeploy={onDeploy}
            >
              <Button type='button' variant='outline' disabled={deploying}>
                {deploying ? <Loader2 size={14} className='animate-spin' /> : <Rocket size={14} />}
                {deploying ? 'Deploying...' : isFailed ? 'Retry Deploy' : 'Deploy'}
              </Button>
            </DeployPopover>
          ) : (
            <>
              {/* Status badge */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='flex items-center gap-1.5 shrink-0 cursor-default rounded-md bg-emerald-500/10 px-2.5 py-1'>
                    <div className='w-1.5 h-1.5 rounded-full bg-emerald-400' />
                    <span className='text-[11px] text-emerald-500 font-medium'>
                      {defaultVersion || 'Live'}
                    </span>
                    {latestVersion && latestVersion !== defaultVersion && (
                      <span className='text-[10px] text-muted-foreground/60 font-medium ml-1'>
                        (latest {latestVersion})
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='text-xs max-w-[300px]'>
                  {`Live ${defaultVersion}, Latest ${latestVersion}`}
                </TooltipContent>
              </Tooltip>

              <div className='h-7 w-px bg-border shrink-0' />

              {/* Run & inspect group */}
              <div className='flex items-center gap-1'>
                {hasManualTrigger && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant='ghost' size='sm' onClick={() => onOpenTestPanel?.()}>
                        <Play size={13} />
                        Test
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side='bottom' className='text-xs'>Test workflow</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' onClick={() => onOpenLogsPanel?.()}>
                      <ScrollText size={13} />
                      Logs
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='text-xs'>Execution logs</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' onClick={() => onOpenVersionsPanel?.()}>
                      <GitCommitVertical size={13} />
                      Versions
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='text-xs'>Version history</TooltipContent>
                </Tooltip>

                <DeployPopover
                  deploying={deploying}
                  currentVersion={latestVersion}
                  onDeploy={onRedeploy}
                >
                  <Button type='button' variant='ghost' size='sm' disabled={deploying}>
                    {deploying ? <Loader2 size={13} className='animate-spin' /> : <CloudUpload size={13} />}
                    Deploy changes
                  </Button>
                </DeployPopover>
              </div>
            </>
          )}

          {/* Separator before Save */}
          <div className='h-7 w-px bg-border shrink-0' />

          {/* Save — hero button */}
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 size={14} className='animate-spin' /> : <Save size={14} />}
            Save
          </Button>
        </div>

        {/* Bottom accent line */}
        <div className='h-px bg-border' />
      </div>
    </TooltipProvider>
  );
}
