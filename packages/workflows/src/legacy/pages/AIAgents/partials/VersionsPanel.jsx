import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Loader2, CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle } from "@datadack/common-ui"
import { agentsApi } from '../../../api/agents';

export default function VersionsPanel({ agentId, currentId, open, onClose, onSwitch }) {
  const { data: versions, isLoading } = useQuery({
    queryKey: ['agent-versions', agentId],
    queryFn: () => agentsApi.versions(agentId),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side='right'
        className='w-[280px] sm:max-w-[280px] flex flex-col p-0 bg-background border-border'
      >
        <SheetHeader className='px-4 py-3 shrink-0 border-b border-border'>
          <SheetTitle className='text-sm flex items-center gap-2'>
            <GitBranch size={14} className='text-[#D4AF37]' />
            Version History
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className='flex-1'>
          <div className='flex flex-col gap-2 p-3'>
            {isLoading ? (
              <div className='flex justify-center py-10'>
                <Loader2 size={18} className='animate-spin text-muted-foreground' />
              </div>
            ) : !versions?.length ? (
              <p className='text-xs text-muted-foreground text-center py-10'>No versions found</p>
            ) : (
              versions.map((v) => {
                const isCurrent = v.id === currentId;
                return (
                  <button
                    key={v.id}
                    onClick={() => { onSwitch(v.id); onClose(); }}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${isCurrent
                      ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10'
                      : 'border-border hover:bg-muted/30'
                      }`}
                  >
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-xs font-semibold flex items-center gap-1.5'>
                        {isCurrent && <CheckCircle2 size={11} className='text-[#D4AF37]' />}
                        v{v.version}
                        {isCurrent && (
                          <span className='text-[10px] text-[#D4AF37] font-normal'>current</span>
                        )}
                      </span>
                      {!isCurrent && (
                        <ChevronRight size={13} className='text-muted-foreground' />
                      )}
                    </div>
                    <p className='text-[11px] text-muted-foreground line-clamp-1'>{v.name}</p>
                    <div className='flex items-center gap-1 mt-1 text-[10px] text-muted-foreground'>
                      <Clock size={9} />
                      {new Date(v.created_at * 1000).toLocaleDateString()}
                      {v.parent_id && (
                        <span className='opacity-60 font-mono ml-1'>branched</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
