import React, { useMemo, useState } from 'react';
import { Copy, Check, Download, Code2, FileJson2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { highlight } from 'sugar-high';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import { generateAgentPython } from '@/helpers/generateAgentPython';
import { generateAgentN8n } from '@/helpers/generateAgentN8n';

const TAB_PYTHON = 'python';
const TAB_N8N = 'n8n';

export default function GenerateCodeDialog({ open, onClose, cfg, agentName, agentType, agentMode, subAgents, flowGraph }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_PYTHON);

  const pythonCode = useMemo(() => {
    if (!open) return '';
    return generateAgentPython({ cfg, agentName, agentType, agentMode, subAgents, flowGraph });
  }, [open, cfg, agentName, agentType, agentMode, subAgents, flowGraph]);

  const n8nJson = useMemo(() => {
    if (!open) return '';
    const workflow = generateAgentN8n({ cfg, agentName, agentType, agentMode, subAgents, flowGraph });
    return JSON.stringify(workflow, null, 2);
  }, [open, cfg, agentName, agentType, agentMode, subAgents, flowGraph]);

  const displayCode = activeTab === TAB_PYTHON ? pythonCode : n8nJson;

  const highlightedHtml = useMemo(() => {
    if (!displayCode) return '';
    return highlight(displayCode);
  }, [displayCode]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const slug = (agentName || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (activeTab === TAB_PYTHON) {
      const blob = new Blob([displayCode], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}_agent.py`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([displayCode], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}_workflow.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success('Downloaded');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className='sm:max-w-[720px] max-h-[85vh] p-0 gap-0 bg-[#0d1117] border-border overflow-hidden flex flex-col'>
        <style>{`
          .sh-code {
            --sh-class: #ffa657;
            --sh-identifier: #c9d1d9;
            --sh-sign: #79c0ff;
            --sh-property: #d2a8ff;
            --sh-entity: #7ee787;
            --sh-jsxliterals: #c9d1d9;
            --sh-string: #a5d6ff;
            --sh-keyword: #ff7b72;
            --sh-comment: #8b949e;
            --sh-space: inherit;
          }
          .sh-code .sh__line { display: block; }
          .sh-code .sh__token--comment { font-style: italic; }
        `}</style>

        <DialogHeader className='px-5 py-3 border-b border-[#21262d] shrink-0 bg-[#161b22]'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1'>
              {/* Tab switcher */}
              <button
                onClick={() => setActiveTab(TAB_PYTHON)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === TAB_PYTHON
                    ? 'bg-[#21262d] text-[#c9d1d9]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              >
                <Code2 size={12} />
                Python
              </button>
              <button
                onClick={() => setActiveTab(TAB_N8N)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === TAB_N8N
                    ? 'bg-[#21262d] text-[#c9d1d9]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              >
                <FileJson2 size={12} />
                n8n Workflow
              </button>
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-xs gap-1.5 border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
                onClick={handleCopy}
              >
                {copied ? <Check size={12} className='text-emerald-400' /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-xs gap-1.5 border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
                onClick={handleDownload}
              >
                <Download size={12} />
                {activeTab === TAB_PYTHON ? '.py' : '.json'}
              </Button>
            </div>
          </div>
          <DialogTitle className='sr-only'>
            {activeTab === TAB_PYTHON ? 'Generated Python' : 'n8n Workflow JSON'}
          </DialogTitle>
          <DialogDescription className='text-xs text-[#8b949e] mt-1'>
            {activeTab === TAB_PYTHON ? (
              <>Ready to run with <code className='text-[#D4AF37]/80 bg-[#21262d] px-1 py-0.5 rounded'>pip install openai</code></>
            ) : (
              <>Import this JSON into <code className='text-[#D4AF37]/80 bg-[#21262d] px-1 py-0.5 rounded'>n8n</code> via Workflow {'>'} Import from File</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto'>
          <pre className='sh-code px-5 py-4 text-[13px] font-mono leading-[1.6] text-[#c9d1d9] whitespace-pre overflow-x-auto'>
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
