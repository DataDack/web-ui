/*
  PaletteNodeItem — Enhanced draggable node item for the palette with tooltip.
*/

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@datadack/common-ui"
import { ICON_MAP, BRAND_ICON_MAP } from '../../../components/workflows/workflowIconMap';

function NodeIcon({ registryKey, iconName, color, size = 14 }) {
  const BrandIcon = BRAND_ICON_MAP[registryKey];
  if (BrandIcon) return <BrandIcon size={size} className='text-foreground' />;
  const LucideIcon = ICON_MAP[iconName];
  if (LucideIcon) return <LucideIcon size={size} color={color} strokeWidth={2} />;
  return <div className='rounded-full' style={{ width: size, height: size, background: color }} />;
}

export default function PaletteNodeItem({ item, onSubcategoryClick }) {
  const isDisabled = !!item.disabled;
  const isParent = !!item.isSubcategoryParent;

  const onDragStart = (event) => {
    if (isDisabled || isParent) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ registryKey: item.registryKey })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = () => {
    if (isParent && onSubcategoryClick) {
      onSubcategoryClick(item);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
            isDisabled
              ? 'opacity-50 cursor-not-allowed'
              : isParent
                ? 'cursor-pointer hover:bg-muted/50 active:bg-muted/70'
                : 'cursor-grab hover:bg-muted/50 active:bg-muted/70'
          }`}
          draggable={!isDisabled && !isParent}
          onDragStart={onDragStart}
          onClick={handleClick}
        >
          <div
            className='flex items-center justify-center w-8 h-8 rounded-lg shrink-0'
            style={{ background: `${item.color}18` }}
          >
            <NodeIcon registryKey={item.registryKey} iconName={item.icon} color={item.color} size={15} />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='text-[13px] font-medium text-foreground truncate leading-tight flex items-center gap-1.5'>
              {item.label}
              {item.badge && (
                <span className='text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded'>
                  {item.badge}
                </span>
              )}
            </div>
            <div className='text-[10px] text-muted-foreground truncate leading-tight mt-0.5'>
              {item.description}
            </div>
          </div>
          {isParent && (
            <>
              <Badge variant='secondary' className='text-[10px] h-4 px-1.5 font-normal shrink-0'>
                {item.children.length}
              </Badge>
              <ChevronRight size={14} className='shrink-0 opacity-30' />
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side='right' className='max-w-[220px]'>
        <p className='font-medium text-xs'>{item.label}</p>
        <p className='text-[10px] text-muted-foreground mt-0.5'>{item.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
