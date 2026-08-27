import React, { useState } from 'react';
import { Wrench, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TOOL_CATALOG, TOOL_CATEGORIES } from './constants';

export default function AddToolSheet({ open, onClose, existingKeys, onAdd }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = TOOL_CATALOG.filter((t) => {
    const matchCat = category === 'All' || t.category === category;
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side='right'
        className='w-[380px] sm:max-w-[380px] flex flex-col p-0 bg-background border-border'
      >
        <SheetHeader className='px-4 py-3 shrink-0 border-b border-border'>
          <SheetTitle className='text-sm flex items-center gap-2'>
            <Wrench size={14} className='text-[#D4AF37]' />
            Add Tool
          </SheetTitle>
        </SheetHeader>

        <div className='px-4 py-3 flex flex-col gap-3 shrink-0 border-b border-border'>
          <div className='relative'>
            <Search size={13} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search tools…'
              className='w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40'
            />
          </div>
          <div className='flex flex-wrap gap-1'>
            {TOOL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${category === cat
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]'
                  : 'border-border text-muted-foreground hover:border-[#D4AF37]/30 hover:text-foreground'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className='flex-1'>
          <div className='flex flex-col gap-1.5 p-3'>
            {filtered.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-8'>No tools match your search</p>
            ) : (
              filtered.map((tool) => {
                const Icon = tool.icon;
                const already = existingKeys.includes(tool.key);
                return (
                  <button
                    key={tool.key}
                    disabled={already}
                    onClick={() => { onAdd(tool); onClose(); }}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${already
                      ? 'opacity-40 cursor-not-allowed border-border'
                      : 'border-border hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 cursor-pointer'
                      }`}
                  >
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground'>
                      <Icon size={14} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>{tool.name}</span>
                        {already && (
                          <Badge variant='outline' className='text-[9px] px-1 h-4'>Added</Badge>
                        )}
                      </div>
                      <p className='text-[11px] text-muted-foreground truncate mt-0.5'>
                        {tool.description}
                      </p>
                    </div>
                    <Badge variant='outline' className='text-[10px] shrink-0 px-1.5'>
                      {tool.category}
                    </Badge>
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
