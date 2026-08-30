import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, GitCommitVertical, Clock, Check } from 'lucide-react';
import {
  Badge,
  Button,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { workflowsApi } from '../../../api/workflows';
import { toast } from 'react-toastify';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}


export default function VersionHistoryPanel({ workflowId, deployInfo, open, onClose }) {
  const qc = useQueryClient();
  const { data: versions, isLoading } = useQuery({
    queryKey: ['workflow-versions', workflowId],
    queryFn: () => workflowsApi.listVersions(workflowId),
    enabled: !!workflowId && open,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (version) => workflowsApi.setDefaultVersion(workflowId, version),
    onSuccess: () => {
      toast.success('Live version updated');
      qc.invalidateQueries({ queryKey: ['workflow-versions', workflowId] });
      qc.invalidateQueries({ queryKey: ['workflow-deploy-status', workflowId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const list = versions || [];
  const currentDefault = deployInfo?.default_version;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side='right' className='w-[400px] sm:max-w-[400px] p-0 flex flex-col gap-0'>
        <SheetHeader className='px-5 py-4 border-b space-y-0'>
          <SheetTitle className='text-sm'>Version History</SheetTitle>
          <SheetDescription className='text-xs'>
            {list.length} {list.length === 1 ? 'deployment' : 'deployments'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className='flex-1'>
          {isLoading ? (
            <div className='flex items-center justify-center py-20'>
              <Loader2 size={20} className='animate-spin text-muted-foreground' />
            </div>
          ) : list.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-muted-foreground gap-2'>
              <GitCommitVertical size={28} strokeWidth={1.2} className='opacity-30' />
              <span className='text-sm'>No deployments yet</span>
            </div>
          ) : (
            <div className='relative'>
              {/* Timeline line */}
              <div className='absolute left-7 top-0 bottom-0 w-px bg-border' />

              {list.map((v, i) => {
                const isLatest = i === 0;
                const isDefault = v.version === currentDefault;

                return (
                  <div key={v.id} className='relative flex gap-3 px-5 py-4 hover:bg-muted/30 transition-colors'>
                    {/* Timeline dot */}
                    <div className='relative z-10 mt-0.5 shrink-0 flex items-center justify-center w-5 h-5'>
                      <div
                        className={`w-2.5 h-2.5 rounded-full border-2 ${
                          isDefault
                            ? 'bg-emerald-500 border-emerald-500/30'
                            : isLatest
                              ? 'bg-[#D4AF37] border-[#D4AF37]/30'
                              : 'bg-muted-foreground/20 border-border'
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-semibold font-mono text-foreground'>
                          {v.version_tag || `v${v.version}`}
                        </span>
                        {isDefault && (
                          <Badge className='text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10'>
                            Live
                          </Badge>
                        )}
                        {isLatest && (
                          <Badge className='text-[9px] h-4 px-1.5 bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 hover:bg-[#D4AF37]/10'>
                            Latest
                          </Badge>
                        )}
                      </div>

                      {v.description && (
                        <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                          {v.description}
                        </p>
                      )}

                      <div className='flex items-center gap-3 mt-1.5'>
                        <span className='flex items-center gap-1 text-[11px] text-muted-foreground/60'>
                          <Clock size={10} />
                          {v.deployed_at ? timeAgo(v.deployed_at) : timeAgo(v.created_at)}
                        </span>
                        {v.deployed_at > 0 && (
                          <span className='text-[11px] text-muted-foreground/60'>
                            {new Date(v.deployed_at * 1000).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Set as Live button */}
                      {!isDefault && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2 h-7 text-[11px] px-2.5'
                          disabled={setDefaultMutation.isPending}
                          onClick={() => setDefaultMutation.mutate(v.version)}
                        >
                          <Check size={10} />
                          Set as Live
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
