import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeft, Download, LayoutTemplate, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import WorkflowCanvas from '../../components/workflows/WorkflowCanvas';
import { templatesApi } from '../../api/workflows';

export default function TemplatePreview() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const { data: template, isLoading, isError } = useQuery({
    queryKey: ['workflow-template', slug],
    queryFn: () => templatesApi.get(slug),
    enabled: !!slug,
  });

  const { nodes, edges } = useMemo(() => {
    if (!template?.canvas_data) return { nodes: [], edges: [] };
    try {
      const parsed = JSON.parse(template.canvas_data);
      return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
    } catch {
      return { nodes: [], edges: [] };
    }
  }, [template]);

  const handleUse = useCallback(async () => {
    if (!template) return;
    setBusy(true);
    try {
      const result = await templatesApi.use(slug);
      const newId = result?.workflow_id;
      if (!newId) throw new Error('Template returned no workflow id');
      toast.success(`Workflow created from "${template.name}"`);
      navigate(`/workflows/${newId}`);
    } catch (err) {
      toast.error(`Failed to use template: ${err.message}`);
      setBusy(false);
    }
  }, [template, slug, navigate]);

  const handleDownload = useCallback(async () => {
    if (!template) return;
    try {
      const blob = await templatesApi.download(slug);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
    }
  }, [template, slug]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else window.close();
  }, []);

  if (isLoading) {
    return (
      <div className='flex h-screen w-screen items-center justify-center bg-background'>
        <Loader2 size={20} className='animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className='flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background'>
        <p className='text-sm text-muted-foreground'>Failed to load template</p>
        <Button variant='outline' size='sm' onClick={handleBack}>
          <ArrowLeft size={14} className='mr-1.5' /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className='flex h-screen w-screen flex-col bg-background'>
      <header className='flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3'>
        <Button variant='ghost' size='icon' className='h-8 w-8' onClick={handleBack} title='Back'>
          <ArrowLeft size={16} />
        </Button>
        <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/20'>
          <LayoutTemplate size={15} className='text-primary' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <h1 className='truncate text-sm font-semibold leading-tight'>{template.name}</h1>
            {template.category && (
              <Badge variant='secondary' className='capitalize'>{template.category}</Badge>
            )}
          </div>
          {template.author && (
            <p className='truncate text-[11px] text-muted-foreground leading-tight'>by {template.author}</p>
          )}
        </div>
        <Button variant='outline' size='sm' onClick={handleDownload} className='h-8'>
          <Download size={14} className='mr-1.5' />
          Download
        </Button>
        <Button size='sm' onClick={handleUse} disabled={busy} className='h-8'>
          {busy ? <Loader2 size={14} className='mr-1.5 animate-spin' /> : <Zap size={14} className='mr-1.5' />}
          Use Now
        </Button>
      </header>

      <div className='flex-1 min-h-0'>
        {nodes.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-2 text-muted-foreground'>
            <LayoutTemplate size={28} className='opacity-40' />
            <span className='text-sm'>This template has no preview graph</span>
          </div>
        ) : (
          <WorkflowCanvas readOnly initialNodes={nodes} initialEdges={edges} />
        )}
      </div>
    </div>
  );
}
