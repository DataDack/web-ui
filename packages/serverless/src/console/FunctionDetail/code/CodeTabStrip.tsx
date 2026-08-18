import { Circle, X } from "lucide-react"

import { css, cx, fontMono, mix } from "@datadack/common-ui"

import { iconFor } from "./fileIcon"
import { baseName } from "./language"

const strip = css`
  display: flex;
  min-height: 38px;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid ${mix("--border", 60)};
  background: ${mix("--background", 88)};

  /* A tab strip that grows a scrollbar changes height; keep it off-canvas. */
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

const tab = css`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  border: none;
  border-right: 1px solid ${mix("--border", 50)};
  background: transparent;
  padding: 8px 12px;
  font-family: ${fontMono};
  font-size: 11.5px;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
`

const tabActive = css`
  background: var(--card);
  color: var(--foreground);
  box-shadow: inset 0 2px 0 0 var(--brand-gold);
`

const tabIcon = css`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`

const closeButton = css`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  color: ${mix("--muted-foreground", 70)};
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
`

const closeIcon = css`
  width: 11px;
  height: 11px;
`

const dirtyDot = css`
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  fill: var(--brand-gold);
  color: var(--brand-gold);
`

export interface CodeTabStripProps {
  openPaths: readonly string[]
  activePath: string
  dirtyPaths: ReadonlySet<string>
  onSelect: (path: string) => void
  onClose: (path: string) => void
  closeLabel: string
}

/** The open-file tabs, with the unsaved dot standing in for the close button. */
export function CodeTabStrip({
  openPaths,
  activePath,
  dirtyPaths,
  onSelect,
  onClose,
  closeLabel,
}: Readonly<CodeTabStripProps>) {
  if (openPaths.length === 0) return null

  return (
    <div className={strip} role="tablist">
      {openPaths.map((path) => {
        const Icon = iconFor(path)
        const dirty = dirtyPaths.has(path)
        return (
          <div
            key={path}
            className={cx(tab, path === activePath && tabActive)}
            role="tab"
            aria-selected={path === activePath}
            tabIndex={0}
            title={path}
            onClick={() => {
              onSelect(path)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect(path)
              }
            }}
            // Middle-click closes, the way every editor's tab strip does.
            onMouseDown={(event) => {
              if (event.button === 1) {
                event.preventDefault()
                onClose(path)
              }
            }}
          >
            <Icon className={tabIcon} aria-hidden />
            {baseName(path)}
            <button
              type="button"
              className={closeButton}
              aria-label={`${closeLabel} ${baseName(path)}`}
              onClick={(event) => {
                event.stopPropagation()
                onClose(path)
              }}
            >
              {dirty ? (
                <Circle className={dirtyDot} aria-hidden />
              ) : (
                <X className={closeIcon} aria-hidden />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
