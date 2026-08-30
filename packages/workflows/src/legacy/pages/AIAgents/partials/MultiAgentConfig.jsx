import React from 'react';
import { Plus, Network, Pencil, Trash2, Users, GripVertical } from 'lucide-react';
import { Button } from "@datadack/common-ui"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSubAgentCard({ subAgent, index, onRemove, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subAgent.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/20 transition-colors bg-background'
    >
      <button
        type='button'
        className='cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground shrink-0 touch-none'
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400 text-[10px] font-bold select-none'>
        {(subAgent.name || `A${index + 1}`).slice(0, 2).toUpperCase()}
      </div>
      <div className='flex-1 min-w-0'>
        <span className='text-sm font-medium truncate block'>{subAgent.name || `Agent ${index + 1}`}</span>
        <span className='text-[11px] text-muted-foreground truncate block'>{subAgent.model || 'No model'}</span>
      </div>
      <div className='flex items-center gap-1 shrink-0'>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground'
          onClick={() => onEdit(index)}
        >
          <Pencil size={10} />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 w-6 p-0 text-muted-foreground hover:text-red-400'
          onClick={() => onRemove(index)}
        >
          <Trash2 size={11} />
        </Button>
      </div>
    </div>
  );
}

export default function MultiAgentConfig({ subAgents, setSubAgents, setIsDirty, modelsByProvider, onEditSubAgent }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addSubAgent = () => {
    const firstModels = Object.values(modelsByProvider ?? {})[0];
    const defaultModel = firstModels?.[0] ?? 'gpt-4o';
    setSubAgents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Agent ${prev.length + 1}`,
        model: defaultModel,
        system_prompt: '',
        temperature: 0.7,
        top_p: 1,
        max_tokens: 4096,
      },
    ]);
    setIsDirty(true);
  };

  const removeSubAgent = (index) => {
    setSubAgents((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSubAgents((prev) => {
      const oldIndex = prev.findIndex((sa) => sa.id === active.id);
      const newIndex = prev.findIndex((sa) => sa.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setIsDirty(true);
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Users size={13} className='text-muted-foreground' />
          <span className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
            Sub-Agents
          </span>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='h-7 gap-1.5 text-xs'
          onClick={addSubAgent}
        >
          <Plus size={12} />
          Add Agent
        </Button>
      </div>

      <p className='text-[11px] text-muted-foreground leading-relaxed'>
        Drag to reorder the execution order of your sub-agents.
      </p>

      {subAgents.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground'>
            <Network size={18} />
          </div>
          <div className='text-center'>
            <p className='text-sm font-medium text-muted-foreground'>No sub-agents yet</p>
            <p className='text-[11px] text-muted-foreground/70 mt-0.5'>
              Add agents to build your multi-agent workflow
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 text-xs mt-1'
            onClick={addSubAgent}
          >
            <Plus size={12} />
            Add First Agent
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subAgents.map((sa) => sa.id)} strategy={verticalListSortingStrategy}>
            <div className='flex flex-col gap-2'>
              {subAgents.map((sa, i) => (
                <SortableSubAgentCard
                  key={sa.id}
                  subAgent={sa}
                  index={i}
                  onRemove={removeSubAgent}
                  onEdit={() => onEditSubAgent?.(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
