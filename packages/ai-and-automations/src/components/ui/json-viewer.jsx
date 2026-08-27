import React, { useState, useCallback } from 'react';
import ReactJson from '@microlink/react-json-view';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function JsonViewer({
  data,
  defaultExpanded = 2,
  editable = false,
  onChange,
  className,
  maxHeight,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [data]);

  const handleEdit = useCallback((edit) => {
    if (onChange) {
      onChange(edit.updated_src);
    }
  }, [onChange]);

  const isEmpty = data === null || data === undefined;

  return (
    <div className={cn('relative rounded-lg border bg-[#1a1a2e] group/viewer', className)}>
      {/* Copy button */}
      <div className='absolute top-1.5 right-1.5 z-10 opacity-0 group-hover/viewer:opacity-100 transition-opacity'>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6'
          onClick={handleCopy}
        >
          {copied ? <Check size={12} className='text-emerald-400' /> : <Copy size={12} className='text-muted-foreground' />}
        </Button>
      </div>

      {/* Content */}
      <div
        className='overflow-y-auto overflow-x-hidden p-2'
        style={maxHeight ? { maxHeight } : undefined}
      >
        {isEmpty ? (
          <span className='text-xs text-muted-foreground/60 italic p-2'>null</span>
        ) : (
          <ReactJson
            src={typeof data === 'object' ? data : { value: data }}
            theme='ocean'
            collapsed={defaultExpanded === false ? true : defaultExpanded}
            collapseStringsAfterLength={120}
            displayDataTypes={false}
            displayObjectSize={true}
            enableClipboard={false}
            name={false}
            indentWidth={2}
            iconStyle='triangle'
            style={{
              backgroundColor: 'transparent',
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              wordBreak: 'break-all',
            }}
            onEdit={editable ? handleEdit : false}
            onAdd={editable ? handleEdit : false}
            onDelete={editable ? handleEdit : false}
          />
        )}
      </div>
    </div>
  );
}
