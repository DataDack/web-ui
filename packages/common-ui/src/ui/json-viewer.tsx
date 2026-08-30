import { useCallback, useState } from "react"

import ReactJson from "@microlink/react-json-view"
import { CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "./button"
import { css, cx } from "../lib/emotion"
import { fontMono } from "../lib/styles"

export interface JsonViewerProps {
  data: unknown
  /** Depth to expand to, or `false` to start fully collapsed. */
  defaultExpanded?: number | false
  editable?: boolean
  onChange?: (value: unknown) => void
  className?: string
  maxHeight?: string | number
}

// The viewer uses react-json-view's "ocean" theme, which is dark in both colour
// schemes. The surface is therefore a fixed dark panel rather than a themed
// one — a --background here would put light-theme chrome around dark JSON.
const wrapper = css`
  position: relative;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: #1a1a2e;
`

// The copy button sits over the content, so it stays hidden until the pointer
// is on the panel rather than covering the first line at all times.
const copySlot = css`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 10;
  opacity: 0;
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);

  [data-slot="json-viewer"]:hover & {
    opacity: 1;
  }

  /* Keyboard users never hover; without this the control is unreachable. */
  &:focus-within {
    opacity: 1;
  }
`

const copyButton = css`
  height: 24px;
  width: 24px;
`

const copied = css`
  color: var(--status-success, #34d399);
`

const muted = css`
  color: var(--muted-foreground);
`

const body = css`
  overflow-y: auto;
  /* Long unbroken values scroll the panel rather than widening the page; the
     viewer already breaks words inside a row. */
  overflow-x: hidden;
  padding: 8px;
`

const nullish = css`
  padding: 8px;
  font-size: 12px;
  font-style: italic;
  color: color-mix(in oklab, var(--muted-foreground) 60%, transparent);
`

function JsonViewer({
  data,
  defaultExpanded = 2,
  editable = false,
  onChange,
  className,
  maxHeight,
}: Readonly<JsonViewerProps>) {
  const [hasCopied, setHasCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 2))
      .then(() => {
        setHasCopied(true)
        return setTimeout(() => {
          setHasCopied(false)
        }, 1500)
      })
      .catch(() => {
        // A denied clipboard permission is not worth an error state; the button
        // simply does not flip to its confirmed look.
      })
  }, [data])

  const handleEdit = useCallback(
    (edit: { updated_src: unknown }) => {
      onChange?.(edit.updated_src)
    },
    [onChange],
  )

  const isEmpty = data === null || data === undefined

  return (
    <div data-slot="json-viewer" className={cx(wrapper, className)}>
      <div className={copySlot}>
        <Button variant="ghost" size="icon" className={copyButton} onClick={handleCopy}>
          {hasCopied ? (
            <CheckIcon size={12} className={copied} />
          ) : (
            <CopyIcon size={12} className={muted} />
          )}
        </Button>
      </div>

      <div className={body} style={maxHeight ? { maxHeight } : undefined}>
        {isEmpty ? (
          <span className={nullish}>null</span>
        ) : (
          <ReactJson
            // The viewer renders objects only, so a bare scalar is wrapped
            // rather than dropped.
            src={typeof data === "object" ? data : { value: data }}
            theme="ocean"
            collapsed={defaultExpanded === false ? true : defaultExpanded}
            collapseStringsAfterLength={120}
            displayDataTypes={false}
            displayObjectSize
            enableClipboard={false}
            name={false}
            indentWidth={2}
            iconStyle="triangle"
            style={{
              backgroundColor: "transparent",
              fontSize: "12px",
              fontFamily: fontMono,
              wordBreak: "break-all",
            }}
            onEdit={editable ? handleEdit : false}
            onAdd={editable ? handleEdit : false}
            onDelete={editable ? handleEdit : false}
          />
        )}
      </div>
    </div>
  )
}

export { JsonViewer }
