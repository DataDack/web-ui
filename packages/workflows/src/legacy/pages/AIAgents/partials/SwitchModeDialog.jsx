import React from 'react';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"

export default function SwitchModeDialog({ open, onClose, agentMode, setAgentMode, setIsDirty }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className='sm:max-w-[480px] p-0 gap-0 rounded-2xl bg-background border-border overflow-hidden'>
        <DialogHeader className='px-6 pt-5 pb-1'>
          <DialogTitle className='text-sm font-semibold'>Agent Mode</DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Choose how your agent processes requests
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-3 p-5'>
          {/* ── Single Agent Card ── */}
          <button
            onClick={() => {
              if (agentMode !== 'single') { setAgentMode('single'); setIsDirty(true); }
            }}
            className={`group relative flex flex-col items-center text-center rounded-2xl p-5 pt-6 transition-all duration-200 cursor-pointer overflow-hidden ${agentMode === 'single'
              ? 'bg-emerald-500/10 ring-2 ring-emerald-500/60 shadow-[0_0_24px_-4px_rgba(16,185,129,0.25)]'
              : 'bg-muted/40 ring-1 ring-border hover:ring-emerald-500/30 hover:bg-emerald-500/5'
            }`}
          >
            {/* Background glow */}
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300 ${agentMode === 'single' ? 'bg-emerald-500/20 opacity-100' : 'bg-emerald-500/10 opacity-0 group-hover:opacity-60'}`} />

            {/* SVG illustration */}
            <div className='relative mb-3'>
              <svg width='64' height='64' viewBox='0 0 64 64' fill='none'>
                {/* Outer ring */}
                <circle cx='32' cy='32' r='28' stroke={agentMode === 'single' ? 'rgba(16,185,129,0.3)' : 'rgba(161,161,170,0.2)'} strokeWidth='1.5' strokeDasharray='4 3' className='transition-all duration-300' />
                {/* Inner glow circle */}
                <circle cx='32' cy='32' r='20' fill={agentMode === 'single' ? 'rgba(16,185,129,0.12)' : 'rgba(161,161,170,0.06)'} className='transition-all duration-300' />
                {/* Core circle */}
                <circle cx='32' cy='32' r='12' fill={agentMode === 'single' ? 'rgba(16,185,129,0.25)' : 'rgba(161,161,170,0.12)'} className='transition-all duration-300' />
                {/* Center bot icon */}
                <rect x='26' y='26' width='12' height='10' rx='3' fill={agentMode === 'single' ? '#10b981' : '#71717a'} className='transition-all duration-300' />
                <circle cx='30' cy='31' r='1.2' fill='white' />
                <circle cx='34' cy='31' r='1.2' fill='white' />
                <rect x='29' y='34' width='6' height='1' rx='0.5' fill='white' opacity='0.7' />
                {/* Antenna */}
                <line x1='32' y1='26' x2='32' y2='22' stroke={agentMode === 'single' ? '#10b981' : '#71717a'} strokeWidth='1.5' strokeLinecap='round' className='transition-all duration-300' />
                <circle cx='32' cy='21' r='1.5' fill={agentMode === 'single' ? '#10b981' : '#71717a'} className='transition-all duration-300' />
                {/* Pulse rings (active only) */}
                {agentMode === 'single' && (
                  <>
                    <circle cx='32' cy='32' r='20' stroke='rgba(16,185,129,0.15)' strokeWidth='1' className='animate-ping' style={{ animationDuration: '3s' }} />
                  </>
                )}
              </svg>
            </div>

            <span className={`relative text-sm font-semibold mb-1 transition-colors ${agentMode === 'single' ? 'text-emerald-400' : 'text-foreground/70 group-hover:text-foreground'}`}>
              Single Agent
            </span>
            <p className='relative text-[11px] text-muted-foreground leading-relaxed max-w-[140px]'>
              One model handles everything. Simple and fast.
            </p>

            {/* Active checkmark */}
            {agentMode === 'single' && (
              <div className='absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30'>
                <Check size={11} className='text-white' strokeWidth={3} />
              </div>
            )}
          </button>

          {/* ── Multi-Agent Card ── */}
          <button
            onClick={() => {
              if (agentMode !== 'multiagent') { setAgentMode('multiagent'); setIsDirty(true); }
            }}
            className={`group relative flex flex-col items-center text-center rounded-2xl p-5 pt-6 transition-all duration-200 cursor-pointer overflow-hidden ${agentMode === 'multiagent'
              ? 'bg-[#D4AF37]/10 ring-2 ring-[#D4AF37]/60 shadow-[0_0_24px_-4px_rgba(249,115,22,0.25)]'
              : 'bg-muted/40 ring-1 ring-border hover:ring-[#D4AF37]/30 hover:bg-[#D4AF37]/5'
            }`}
          >
            {/* Background glow */}
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300 ${agentMode === 'multiagent' ? 'bg-[#D4AF37]/20 opacity-100' : 'bg-[#D4AF37]/10 opacity-0 group-hover:opacity-60'}`} />

            {/* SVG illustration — network of nodes */}
            <div className='relative mb-3'>
              <svg width='64' height='64' viewBox='0 0 64 64' fill='none'>
                {/* Connection lines */}
                <line x1='32' y1='22' x2='18' y2='40' stroke={agentMode === 'multiagent' ? 'rgba(249,115,22,0.4)' : 'rgba(161,161,170,0.2)'} strokeWidth='1.5' strokeLinecap='round' className='transition-all duration-300' />
                <line x1='32' y1='22' x2='46' y2='40' stroke={agentMode === 'multiagent' ? 'rgba(249,115,22,0.4)' : 'rgba(161,161,170,0.2)'} strokeWidth='1.5' strokeLinecap='round' className='transition-all duration-300' />
                <line x1='32' y1='22' x2='32' y2='44' stroke={agentMode === 'multiagent' ? 'rgba(249,115,22,0.3)' : 'rgba(161,161,170,0.15)'} strokeWidth='1' strokeLinecap='round' strokeDasharray='3 2' className='transition-all duration-300' />
                {/* Orchestrator node (top) */}
                <circle cx='32' cy='20' r='8' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.2)' : 'rgba(161,161,170,0.08)'} className='transition-all duration-300' />
                <circle cx='32' cy='20' r='5' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.35)' : 'rgba(161,161,170,0.15)'} className='transition-all duration-300' />
                <circle cx='32' cy='20' r='2' fill={agentMode === 'multiagent' ? '#D4AF37' : '#71717a'} className='transition-all duration-300' />
                {/* Left sub-agent */}
                <circle cx='18' cy='42' r='6' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.15)' : 'rgba(161,161,170,0.06)'} className='transition-all duration-300' />
                <circle cx='18' cy='42' r='3.5' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.3)' : 'rgba(161,161,170,0.12)'} className='transition-all duration-300' />
                <circle cx='18' cy='42' r='1.5' fill={agentMode === 'multiagent' ? '#D4AF37' : '#71717a'} className='transition-all duration-300' />
                {/* Right sub-agent */}
                <circle cx='46' cy='42' r='6' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.15)' : 'rgba(161,161,170,0.06)'} className='transition-all duration-300' />
                <circle cx='46' cy='42' r='3.5' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.3)' : 'rgba(161,161,170,0.12)'} className='transition-all duration-300' />
                <circle cx='46' cy='42' r='1.5' fill={agentMode === 'multiagent' ? '#D4AF37' : '#71717a'} className='transition-all duration-300' />
                {/* Center sub-agent (smaller, behind) */}
                <circle cx='32' cy='46' r='5' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.12)' : 'rgba(161,161,170,0.05)'} className='transition-all duration-300' />
                <circle cx='32' cy='46' r='3' fill={agentMode === 'multiagent' ? 'rgba(249,115,22,0.25)' : 'rgba(161,161,170,0.1)'} className='transition-all duration-300' />
                <circle cx='32' cy='46' r='1.2' fill={agentMode === 'multiagent' ? '#D4AF37' : '#71717a'} className='transition-all duration-300' />
                {/* Pulse (active only) */}
                {agentMode === 'multiagent' && (
                  <circle cx='32' cy='20' r='8' stroke='rgba(249,115,22,0.2)' strokeWidth='1' className='animate-ping' style={{ animationDuration: '3s' }} />
                )}
              </svg>
            </div>

            <span className={`relative text-sm font-semibold mb-1 transition-colors ${agentMode === 'multiagent' ? 'text-[#D4AF37]' : 'text-foreground/70 group-hover:text-foreground'}`}>
              Multi-Agent
            </span>
            <p className='relative text-[11px] text-muted-foreground leading-relaxed max-w-[140px]'>
              Orchestrate sub-agents with visual canvas.
            </p>

            {/* Active checkmark */}
            {agentMode === 'multiagent' && (
              <div className='absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/30'>
                <Check size={11} className='text-white' strokeWidth={3} />
              </div>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
