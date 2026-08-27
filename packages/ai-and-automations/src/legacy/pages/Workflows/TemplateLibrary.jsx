import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { LayoutTemplate, Search, Download, Zap, ArrowLeft, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { templatesApi } from '../../api/workflows';
import { automationPath } from '../../../runtime';

const PAGE_SIZE = 24;

function TemplateCard({ template, onUse, onDownload, onPreview, busy }) {
  return (
    <Card className='flex flex-col overflow-hidden transition-shadow hover:shadow-md'>
      <div className='relative h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center border-b border-border'>
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className='absolute inset-0 h-full w-full object-cover'
          />
        ) : (
          <LayoutTemplate className='text-primary/40' size={40} />
        )}
        {template.category && (
          <Badge variant='secondary' className='absolute top-2 right-2 capitalize'>
            {template.category}
          </Badge>
        )}
      </div>

      <CardHeader className='pb-2 pt-4'>
        <CardTitle className='text-base leading-snug line-clamp-2'>{template.name}</CardTitle>
        {template.author && (
          <p className='text-xs text-muted-foreground'>by {template.author}</p>
        )}
      </CardHeader>

      <CardContent className='flex-1 pb-3'>
        {template.description && (
          <p className='text-sm text-muted-foreground line-clamp-2'>{template.description}</p>
        )}
        {template.tags?.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-1'>
            {template.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant='outline' className='text-[10px] font-normal'>
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className='gap-2 pt-0'>
        <Button
          className='flex-1'
          onClick={() => onUse(template)}
          disabled={busy === template.slug}
        >
          {busy === template.slug ? (
            <Loader2 size={14} className='animate-spin' />
          ) : (
            <Zap size={14} />
          )}
          Use Now
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={() => onPreview(template)}
          title='Preview template'
        >
          <Eye size={14} />
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={() => onDownload(template)}
          title='Download template JSON'
        >
          <Download size={14} />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workflow-templates', page, search],
    queryFn: () => templatesApi.list({ page, pageSize: PAGE_SIZE, keyword: search }),
    keepPreviousData: true,
  });

  const handleUse = useCallback(async (template) => {
    setBusy(template.slug);
    try {
      const result = await templatesApi.use(template.slug);
      const newId = result?.workflow_id;
      if (!newId) throw new Error('Template returned no workflow id');
      toast.success(`Workflow created from "${template.name}"`);
      navigate(automationPath(`workflows/${newId}`));
    } catch (err) {
      toast.error(`Failed to use template: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }, [navigate]);

  const handlePreview = useCallback((template) => {
    window.open(automationPath(`templates/${template.slug}`), '_blank', 'noopener');
  }, []);

  const handleDownload = useCallback(async (template) => {
    try {
      const blob = await templatesApi.download(template.slug);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.slug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
    }
  }, []);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-3'>
        <Button variant='ghost' size='icon' onClick={() => navigate(automationPath('workflows'))}>
          <ArrowLeft size={16} />
        </Button>
        <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20'>
          <LayoutTemplate size={18} className='text-primary' />
        </div>
        <div>
          <h1 className='text-lg font-semibold leading-tight'>Workflow Templates</h1>
          <p className='text-xs text-muted-foreground'>
            Start from a curated template instead of a blank canvas
          </p>
        </div>
      </div>

      <div className='flex items-center justify-between gap-3'>
        <div className='relative flex-1 max-w-sm'>
          <Search
            size={15}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none'
          />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder='Search templates…'
            className='pl-9'
          />
        </div>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center py-20'>
          <Loader2 size={20} className='animate-spin text-muted-foreground' />
        </div>
      ) : isError ? (
        <div className='flex flex-col items-center justify-center py-20 text-sm text-muted-foreground'>
          Failed to load templates
        </div>
      ) : items.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground'>
          <LayoutTemplate size={28} className='opacity-40' />
          <span className='text-sm'>No templates found</span>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {items.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onUse={handleUse}
              onDownload={handleDownload}
              onPreview={handlePreview}
              busy={busy}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <span>{total} templates total</span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className='px-2'>Page {page} of {totalPages}</span>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
