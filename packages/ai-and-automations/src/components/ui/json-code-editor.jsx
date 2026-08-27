import React, { useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import { cn } from '@/lib/utils';

// Lightweight JSON syntax highlighter — no external dependency
function highlightJson(code) {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // strings
    .replace(/"(?:\\.|[^"\\])*"/g, (match) => {
      // Check if it's a key (followed by :)
      return `<span style="color:var(--json-string,#6ee7b7)">${match}</span>`;
    })
    // numbers
    .replace(/\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/g, '<span style="color:var(--json-number,#60a5fa)">$1</span>')
    // booleans & null
    .replace(/\b(true|false|null)\b/g, '<span style="color:var(--json-bool,#fbbf24)">$1</span>');
}

const JsonCodeEditor = React.forwardRef(({
  value,
  onChange,
  className,
  minHeight = '120px',
  maxHeight = '400px',
  placeholder = '{ }',
  readOnly = false,
}, ref) => {
  const handleChange = useCallback((code) => {
    if (!readOnly) onChange?.(code);
  }, [onChange, readOnly]);

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-muted/30 overflow-auto font-mono text-xs',
        'focus-within:ring-1 focus-within:ring-ring',
        className
      )}
      style={{ minHeight, maxHeight }}
    >
      <Editor
        value={value || ''}
        onValueChange={handleChange}
        highlight={highlightJson}
        placeholder={placeholder}
        readOnly={readOnly}
        padding={12}
        tabSize={2}
        insertSpaces
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: '12px',
          lineHeight: '1.6',
          minHeight,
        }}
        textareaClassName='outline-none'
      />
    </div>
  );
});
JsonCodeEditor.displayName = 'JsonCodeEditor';

export { JsonCodeEditor };
