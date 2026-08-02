import { css } from "../lib/emotion"
import { mix } from "../lib/styles"

// Radix's dropdown menu and context menu are the same surface with different
// triggers, and their shadcn styling was duplicated class-for-class. Shared here
// so the two cannot drift; only the transform-origin variable differs, which each
// component passes in.

export const menuSurface = (originVar: string) => css`
  z-index: 50;
  max-height: var(${originVar}-available-height);
  min-width: 8rem;
  transform-origin: var(${originVar}-transform-origin);
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--popover);
  padding: 4px;
  color: var(--popover-foreground);
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
`

export const menuSubSurface = (originVar: string) => css`
  z-index: 50;
  min-width: 8rem;
  transform-origin: var(${originVar}-transform-origin);
  overflow: hidden;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--popover);
  padding: 4px;
  color: var(--popover-foreground);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
`

/** Shared by every row: item, checkbox item, radio item and sub-trigger. */
const rowBase = css`
  position: relative;
  display: flex;
  cursor: default;
  align-items: center;
  gap: 8px;
  border-radius: 0.125rem;
  font-size: 14px;
  line-height: 20px;
  outline: none;
  user-select: none;

  &:focus {
    background: var(--accent);
    color: var(--accent-foreground);
  }

  &[data-disabled] {
    pointer-events: none;
    opacity: 0.5;
  }

  & svg {
    pointer-events: none;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--muted-foreground);
  }
`

export const menuItem = css`
  ${rowBase};
  padding: 6px 8px;

  &[data-inset] {
    padding-left: 32px;
  }

  &[data-variant="destructive"] {
    color: var(--destructive);
  }

  &[data-variant="destructive"]:focus {
    background: ${mix("--destructive", 10)};
    color: var(--destructive);
  }

  /* The original spelled this !important, to beat the svg colour rule above. */
  &[data-variant="destructive"] svg {
    color: var(--destructive) !important;
  }

  .dark &[data-variant="destructive"]:focus {
    background: ${mix("--destructive", 20)};
  }
`

/** Checkbox and radio rows: no left padding for text, room for the indicator. */
export const menuIndicatorItem = css`
  ${rowBase};
  padding: 6px 8px 6px 32px;
`

export const menuItemIndicator = css`
  pointer-events: none;
  position: absolute;
  left: 8px;
  display: flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
`

export const menuSubTrigger = css`
  ${rowBase};
  padding: 6px 8px;

  &[data-inset] {
    padding-left: 32px;
  }

  &[data-state="open"] {
    background: var(--accent);
    color: var(--accent-foreground);
  }
`

export const menuSubTriggerChevron = css`
  margin-left: auto;
`

export const menuLabel = css`
  padding: 6px 8px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;

  &[data-inset] {
    padding-left: 32px;
  }
`

export const menuSeparator = css`
  margin: 4px -4px;
  height: 1px;
  background: var(--border);
`

export const menuShortcut = css`
  margin-left: auto;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.1em;
  color: var(--muted-foreground);
`

/** Radio dots are filled, unlike the check glyph. */
export const menuRadioDot = css`
  width: 8px;
  height: 8px;
  fill: currentColor;
`
