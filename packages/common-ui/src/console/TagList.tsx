import { css, cx } from "../lib/emotion"
import { fontMono, mix } from "../lib/styles"

const empty = css`
  color: var(--muted-foreground);
  font-size: 14px;
  line-height: 20px;
`

const list = css`
  display: flex;
  align-items: center;
  gap: 6px;
`

const wrapping = css`
  flex-wrap: wrap;
`

const clipped = css`
  overflow: hidden;
`

const chip = css`
  font-family: ${fontMono};
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 0.25rem;
  border: 1px solid var(--border-glass, var(--border));
  background: ${mix("--muted", 50)};
  color: var(--muted-foreground);
`

const chipInline = css`
  display: inline-flex;
  align-items: center;
`

const chipTruncated = css`
  display: inline-block;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
`

const chipValue = css`
  opacity: 0.6;
`

const overflow = css`
  flex-shrink: 0;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

interface TagListProps {
  tags: Record<string, string>
  /** Show at most this many chips, with a "+n" for the rest. */
  max?: number
  className?: string
  /**
   * Keep every chip on one line and truncate long values. For dense contexts
   * like table cells, where wrapping gives uneven row heights and a long value
   * (a UUID, say) would blow the column out of shape.
   */
  truncate?: boolean
}

export function TagList({ tags, max, className, truncate }: Readonly<TagListProps>) {
  const entries = Object.entries(tags)
  if (entries.length === 0) return <span className={empty}>—</span>

  const visible = max ? entries.slice(0, max) : entries
  const hidden = entries.length - visible.length

  return (
    <div className={cx(list, truncate ? clipped : wrapping, className)}>
      {visible.map(([key, value]) => (
        <span key={key} className={cx(chip, truncate ? chipTruncated : chipInline)}>
          {key}
          {value && <span className={chipValue}>={value}</span>}
        </span>
      ))}
      {hidden > 0 && <span className={overflow}>+{hidden}</span>}
    </div>
  )
}
