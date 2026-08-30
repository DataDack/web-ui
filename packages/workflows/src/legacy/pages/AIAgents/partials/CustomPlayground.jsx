import React, { useState, useCallback } from 'react';
import { Play, Braces, FileJson } from 'lucide-react';
import { Badge, Button, ScrollArea } from "@datadack/common-ui"

export default function CustomPlayground({ cfg, inputs, outputs }) {
  const [testInputValues, setTestInputValues] = useState({});
  const [testOutputValues, setTestOutputValues] = useState({});
  const [hasRun, setHasRun] = useState(false);

  const updateTestInput = (name, value) =>
    setTestInputValues((prev) => ({ ...prev, [name]: value }));

  const handleRun = useCallback(() => {
    setHasRun(true);
    // Populate outputs with a preview placeholder
    const placeholders = {};
    for (const out of outputs) {
      placeholders[out.name] = 'Execution coming soon. Deploy your agent to test via the API.';
    }
    setTestOutputValues(placeholders);
  }, [outputs]);

  return (
    <div className='flex h-full flex-col overflow-hidden bg-background'>
      {/* Header */}
      <div className='shrink-0 flex items-center justify-between px-5 py-3 border-b border-border'>
        <div className='flex items-center gap-2'>
          <div className='flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-400'>
            <Play size={12} />
          </div>
          <span className='text-sm font-semibold text-foreground'>Test Panel</span>
          <Badge variant='outline' className='text-[9px] px-1.5 h-4 border-amber-500/30 text-amber-500 bg-amber-500/5'>
            Preview
          </Badge>
        </div>
        {cfg?.model && (
          <Badge variant='outline' className='text-[10px] border-muted-foreground/20 text-muted-foreground'>
            {cfg.model}
          </Badge>
        )}
      </div>

      {/* Column Headers */}
      <div className='flex shrink-0 border-b border-border'>
        <div className='flex-1 px-5 py-2.5 border-r border-border'>
          <span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>Inputs</span>
        </div>
        <div className='flex-1 px-5 py-2.5'>
          <span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>Outputs</span>
        </div>
      </div>

      {/* Content */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Inputs Column */}
        <ScrollArea className='flex-1 border-r border-border'>
          <div className='p-4 flex flex-col gap-3'>
            {inputs.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <Braces size={20} className='text-muted-foreground/40 mb-2' />
                <p className='text-xs text-muted-foreground'>No inputs defined</p>
              </div>
            ) : (
              inputs.map((inp) => (
                <div key={inp.id} className='rounded-lg border border-border overflow-hidden'>
                  <div className='flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border'>
                    <span className='text-sm font-medium text-foreground'>{inp.name}</span>
                    <Badge variant='outline' className='text-[10px] px-1.5 h-5 border-violet-500/30 text-violet-500 bg-violet-500/5'>
                      {inp.type}
                    </Badge>
                  </div>
                  <textarea
                    value={testInputValues[inp.name] ?? ''}
                    onChange={(e) => updateTestInput(inp.name, e.target.value)}
                    placeholder='Enter input...'
                    rows={4}
                    className='w-full resize-none bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none'
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Outputs Column */}
        <ScrollArea className='flex-1'>
          <div className='p-4 flex flex-col gap-3'>
            {outputs.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <FileJson size={20} className='text-muted-foreground/40 mb-2' />
                <p className='text-xs text-muted-foreground'>No outputs defined</p>
              </div>
            ) : (
              outputs.map((out) => (
                <div key={out.id} className='rounded-lg border border-border overflow-hidden'>
                  <div className='flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border'>
                    <span className='text-sm font-medium text-foreground'>{out.name}</span>
                    <Badge variant='outline' className='text-[10px] px-1.5 h-5 border-violet-500/30 text-violet-500 bg-violet-500/5'>
                      {out.type}
                    </Badge>
                  </div>
                  <div className='px-3 py-2.5 min-h-[80px]'>
                    {testOutputValues[out.name] ? (
                      <pre className='text-sm font-mono whitespace-pre-wrap break-words text-foreground/70 leading-relaxed'>
                        {testOutputValues[out.name]}
                      </pre>
                    ) : (
                      <span className='text-xs text-muted-foreground/50 italic'>
                        {hasRun ? 'No output' : 'Output will appear here after running'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Run Button */}
      <div className='shrink-0 flex justify-center py-4 border-t border-border bg-card/40'>
        <Button
          size='sm'
          className='h-9 gap-2 px-6 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg'
          onClick={handleRun}
        >
          <Play size={14} />
          Run
        </Button>
      </div>
    </div>
  );
}
