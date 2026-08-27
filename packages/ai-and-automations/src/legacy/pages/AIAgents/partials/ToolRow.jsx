import React from 'react';
import {
  Wrench,
  Pencil,
  Trash2,
  Zap,
  MoreHorizontal,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TOOL_CATALOG } from './constants';

export default function ToolRow({ tool, onEdit, onRemove, onToggleAutoRun }) {
  const catalogEntry = TOOL_CATALOG.find((t) => t.key === tool.key);
  const Icon = catalogEntry?.icon ?? Wrench;

  return (
    <div className='flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/20 transition-colors'>
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground'>
        <Icon size={14} />
      </div>

      <span className='flex-1 text-sm font-medium truncate'>{tool.name}</span>

      <div className='flex items-center gap-1 shrink-0'>
        <Badge
          variant='outline'
          className='text-[10px] px-1.5 h-5 text-blue-400 border-blue-400/30 bg-blue-400/5 cursor-default'
        >
          {tool.mode ?? 'Default'}
        </Badge>

        <Button
          variant='ghost'
          size='sm'
          className='h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground'
          onClick={() => onEdit(tool)}
        >
          <Pencil size={10} />
          Edit
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className={`h-6 gap-1 px-1.5 text-[11px] ${tool.auto_run ? 'text-[#D4AF37]' : 'text-muted-foreground'
                }`}
            >
              <Zap size={10} />
              {tool.auto_run ? 'Auto Run' : 'Manual'}
              <ChevronDown size={9} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='min-w-[120px]'>
            <DropdownMenuItem
              className='text-xs gap-2'
              onClick={() => onToggleAutoRun(tool.id, false)}
            >
              Manual
              {!tool.auto_run && <CheckCircle2 size={11} className='ml-auto text-[#D4AF37]' />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-xs gap-2'
              onClick={() => onToggleAutoRun(tool.id, true)}
            >
              Auto Run
              {tool.auto_run && <CheckCircle2 size={11} className='ml-auto text-[#D4AF37]' />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0 text-muted-foreground'
            >
              <MoreHorizontal size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='min-w-[160px]'>
            <DropdownMenuItem className='text-xs gap-2' onClick={() => onEdit(tool)}>
              <Pencil size={11} /> Edit configuration
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-xs gap-2 text-red-400 focus:text-red-400'
              onClick={() => onRemove(tool.id)}
            >
              <Trash2 size={11} /> Remove tool
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
