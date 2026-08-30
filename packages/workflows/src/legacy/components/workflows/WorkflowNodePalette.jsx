/*
  Workflow Node Palette — Two-level navigation sidebar.
  Level 1: Category list (click to drill in).
  Level 2: Node items for a category (slide-in panel, back to go up).
  Search bypasses the two-level nav and shows flat filtered results.
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronRight, Search, ArrowLeft, X, PanelLeftClose, Pin, PinOff } from 'lucide-react';
import { Badge, Button, Input, ScrollArea, TooltipProvider } from "@datadack/common-ui"
import { Kbd } from "@/components/ui/kbd"
import { CATEGORY_ICONS } from './workflowIconMap';
import { getNodePalette } from '../../helpers/n8nNodeRegistry';
import { getTransport } from '../../../runtime';
import PaletteNodeItem from '../../pages/Workflows/partials/PaletteNodeItem';

// ── Category descriptions ───────────────────────────────────────────────────

const CATEGORY_DESCRIPTIONS = {
  Triggers: 'Start your workflow',
  Actions: 'HTTP requests & code',
  Logic: 'Conditions, loops & routing',
  Data: 'Transform & manipulate data',
  AI: 'LLMs & language models',
  Integrations: 'Email, sheets & storage',
  CRM: 'Customer relationship tools',
  Communication: 'Messaging & chat platforms',
  Marketing: 'Email marketing & ads',
  'Developer Tools': 'Code repos, CI/CD & monitoring',
  Productivity: 'Task management & docs',
  Finance: 'Payments & invoicing',
  eCommerce: 'Online stores & products',
  'Cloud Services': 'AWS, GCP & infrastructure',
  Databases: 'SQL, NoSQL & data stores',
  Utility: 'Helpers & flow control',
};

// ── Category row ────────────────────────────────────────────────────────────

function CategoryRow({ category, itemCount, onClick }) {
  const CatIcon = CATEGORY_ICONS[category] || ChevronRight;
  const description = CATEGORY_DESCRIPTIONS[category] || '';

  return (
    <button
      onClick={onClick}
      className='flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 active:bg-muted/50 transition-colors'
    >
      <div className='flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-muted'>
        <CatIcon size={15} className='text-muted-foreground' />
      </div>
      <div className='flex-1 min-w-0 text-left'>
        <div className='text-[13px] font-medium truncate leading-tight'>{category}</div>
        {description && <div className='text-[10px] opacity-50 truncate leading-tight mt-0.5'>{description}</div>}
      </div>
      <Badge variant='secondary' className='text-[10px] h-4 px-1.5 font-normal shrink-0'>
        {itemCount}
      </Badge>
      <ChevronRight size={14} className='shrink-0 opacity-30' />
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function WorkflowNodePalette({ onCollapse, pinned, onTogglePin }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState(null); // { label, items, color, icon }
  const searchRef = useRef(null);

  // Cmd+K to focus search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (onCollapse && searchRef.current) {
          // If palette is visible, focus search
          searchRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCollapse]);

  // App triggers are hidden when the host cannot serve them.
  //
  // Not cosmetic: every one of these nodes has a Connect panel behind it, and on
  // a host with no integration backend the panel's calls 404 while the node
  // still saves and deploys — producing a workflow that looks wired to Slack and
  // is not. Better to not offer it.
  const appTriggersAvailable = getTransport().capabilities?.integrations === true;
  const palette = useMemo(
    () => (appTriggersAvailable ? getNodePalette() : withoutAppTriggers(getNodePalette())),
    [appTriggersAvailable]
  );

  // Reset to category view when search begins
  useEffect(() => {
    if (search.trim()) { setActiveCategory(null); setActiveSubcategory(null); }
  }, [search]);

  // Active category items
  const activeGroup = useMemo(
    () => (activeCategory ? palette.find((g) => g.category === activeCategory) : null),
    [palette, activeCategory]
  );

  // Flat filtered results for search — includes subcategory children
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return palette
      .map((group) => {
        const matched = [];
        for (const item of group.items) {
          if (item.isSubcategoryParent) {
            // Search within children of subcategory parents
            for (const child of item.children || []) {
              if (child.label.toLowerCase().includes(q) || child.description.toLowerCase().includes(q)) {
                matched.push(child);
              }
            }
          } else if (item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
            matched.push(item);
          }
        }
        return { ...group, items: matched };
      })
      .filter((group) => group.items.length > 0);
  }, [palette, search]);

  const ActiveCatIcon = activeGroup ? (CATEGORY_ICONS[activeGroup.category] || ChevronRight) : null;

  return (
    <TooltipProvider delayDuration={400}>
      <div className='h-full flex flex-col border-r' style={{ backgroundColor: 'var(--workflow-sidebar-bg)' }}>
        {/* Search */}
        <div className='p-2.5 border-b flex items-center gap-1.5'>
          <div className='relative flex-1'>
            <Search size={13} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search nodes...'
              className='pl-8 pr-14 h-8 text-xs'
            />
            {search ? (
              <Button
                variant='ghost'
                size='icon'
                className='absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6'
                onClick={() => setSearch('')}
              >
                <X size={12} />
              </Button>
            ) : (
              <Kbd className='absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40'>
                ⌘K
              </Kbd>
            )}
          </div>
          {onTogglePin && (
            <Button
              variant='ghost'
              size='icon'
              className={`h-8 w-8 shrink-0 ${pinned ? 'text-[#D4AF37]' : ''}`}
              onClick={onTogglePin}
              title={pinned ? 'Unpin palette' : 'Pin palette open'}
            >
              {pinned ? <Pin size={13} /> : <PinOff size={13} />}
            </Button>
          )}
          {onCollapse && (
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 shrink-0'
              onClick={onCollapse}
              title='Hide palette'
            >
              <PanelLeftClose size={14} />
            </Button>
          )}
        </div>

        {/* Content area */}
        <div className='flex-1 overflow-hidden relative'>

          {/* ── Search overlay ── */}
          {searchResults && (
            <div className='absolute inset-0 z-10 bg-card'>
              <ScrollArea className='h-full'>
                <div className='p-1.5'>
                  {searchResults.map((group) => (
                    <div key={group.category} className='mb-2'>
                      <div className='flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                        {(() => { const I = CATEGORY_ICONS[group.category]; return I ? <I size={10} /> : null; })()}
                        {group.category}
                      </div>
                      {group.items.map((item) => (
                        <PaletteNodeItem key={item.registryKey} item={item} />
                      ))}
                    </div>
                  ))}
                  {searchResults.length === 0 && (
                    <div className='px-3 py-8 text-center text-xs text-muted-foreground'>
                      No nodes found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* ── Three-panel slider ── */}
          <div
            className='flex h-full transition-transform duration-200 ease-in-out'
            style={{ transform: activeSubcategory ? 'translateX(-200%)' : activeCategory ? 'translateX(-100%)' : 'translateX(0)' }}
          >
            {/* Panel 1: Category list */}
            <div className='w-full shrink-0 h-full'>
              <ScrollArea className='h-full'>
                <div className='p-1.5 space-y-0.5'>
                  {palette.map((group) => (
                    <CategoryRow
                      key={group.category}
                      category={group.category}
                      itemCount={group.items.length}
                      onClick={() => { setActiveCategory(group.category); setActiveSubcategory(null); }}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Panel 2: Items for active category */}
            <div className='w-full shrink-0 h-full flex flex-col'>
              {/* Back header */}
              <button
                onClick={() => { setActiveCategory(null); setActiveSubcategory(null); }}
                className='flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border-b shrink-0'
              >
                <ArrowLeft size={14} />
                {ActiveCatIcon && <ActiveCatIcon size={13} className='opacity-70' />}
                <span>{activeCategory}</span>
              </button>

              {/* Items list */}
              <ScrollArea className='flex-1' key={activeCategory}>
                <div className='p-1.5'>
                  {activeGroup?.items.map((item) => (
                    <PaletteNodeItem
                      key={item.registryKey}
                      item={item}
                      onSubcategoryClick={(parent) => setActiveSubcategory(parent)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Panel 3: Subcategory children */}
            <div className='w-full shrink-0 h-full flex flex-col'>
              <button
                onClick={() => setActiveSubcategory(null)}
                className='flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border-b shrink-0'
              >
                <ArrowLeft size={14} />
                <span>{activeSubcategory?.label}</span>
              </button>

              <ScrollArea className='flex-1' key={activeSubcategory?.label}>
                <div className='p-1.5'>
                  {activeSubcategory?.children?.map((item) => (
                    <PaletteNodeItem key={item.registryKey} item={item} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// withoutAppTriggers drops the "App Trigger" subcategory from a palette, and any
// category left empty by the removal.
function withoutAppTriggers(palette) {
  return palette
    .map((group) => ({
      ...group,
      items: (group.items || []).filter((item) => item.label !== 'App Trigger' && item.subcategory !== 'App Trigger'),
    }))
    .filter((group) => (group.items || []).length > 0);
}
