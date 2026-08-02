import { useEffect, useRef, useState } from "react"

import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { css, cx } from "../lib/emotion"
import { fontMono, mix } from "../lib/styles"

// The icon swap was a motion/react AnimatePresence pair. Done in CSS here so the
// design system does not take an animation library as a dependency for one
// crossfade — the two icons are stacked and only their opacity and scale differ.
const root = css`
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  text-align: left;
  color: var(--muted-foreground);
  background: none;
  border: 0;
  padding: 0;
  border-radius: 0.25rem;
  outline: none;
  cursor: pointer;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: var(--foreground);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px ${mix("--ring", 50)};
  }
`

const mono = css`
  font-family: ${fontMono};
  font-size: 12px;
`

const text = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* The icon only appears on hover or focus, so a dense table of copyable values
   is not a wall of icons. */
const iconSlot = css`
  position: relative;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);

  .${root}:hover &,
  .${root}:focus-visible & {
    opacity: 1;
  }
`

const layer = css`
  position: absolute;
  inset: 0;
  transition:
    opacity 120ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);

  & > svg {
    width: 14px;
    height: 14px;
  }
`

const hidden = css`
  opacity: 0;
  transform: scale(0.5);
`

const shown = css`
  opacity: 1;
  transform: scale(1);
`

const check = css`
  color: var(--status-success, #16a34a);
`

interface CopyButtonProps {
  value: string
  /** Visible text; defaults to the copied value. */
  label?: string
  mono?: boolean
  /**
   * Toast text on success. A prop rather than a translation lookup so the design
   * system carries no i18n dependency — pass `t("…")` from an app that has one.
   */
  copiedLabel?: string
  className?: string
}

export function CopyButton({
  value,
  label,
  mono: isMono = true,
  copiedLabel = "Copied",
  className,
}: Readonly<CopyButtonProps>) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    [],
  )

  const copy = async (event: React.MouseEvent) => {
    // Copyable values sit in clickable rows; copying must not also navigate.
    event.stopPropagation()
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(copiedLabel)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setCopied(false)
    }, 1500)
  }

  return (
    <button
      type="button"
      onClick={(event) => void copy(event)}
      className={cx(root, isMono && mono, className)}
    >
      <span className={text}>{label ?? value}</span>
      <span className={iconSlot}>
        <span className={cx(layer, check, copied ? shown : hidden)}>
          <Check />
        </span>
        <span className={cx(layer, copied ? hidden : shown)}>
          <Copy />
        </span>
      </span>
    </button>
  )
}
