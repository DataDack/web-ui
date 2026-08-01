import type { ReactNode } from "react"

import { css, cx } from "@emotion/css"

import { fontMono, media, mix } from "../lib/styles"

const grid = css`
  display: grid;
  column-gap: 32px;
  row-gap: 16px;
`

const COLUMN_CLASSES: Record<1 | 2 | 3, string> = {
  1: css`
    grid-template-columns: repeat(1, minmax(0, 1fr));
  `,
  2: css`
    grid-template-columns: repeat(1, minmax(0, 1fr));

    ${media.sm} {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  3: css`
    grid-template-columns: repeat(1, minmax(0, 1fr));

    ${media.sm} {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    ${media.lg} {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  `,
}

const item = css`
  min-width: 0;
`

const term = css`
  color: ${mix("--muted-foreground", 80)};
  margin-bottom: 4px;
  font-family: ${fontMono};
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
`

const value = css`
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: break-word;
`

const valueMono = css`
  font-family: ${fontMono};
  font-size: 13px;
`

const missing = css`
  color: var(--muted-foreground);
`

export interface KeyValueItem {
  label: string
  value: ReactNode
  mono?: boolean
}

interface KeyValueGridProps {
  items: KeyValueItem[]
  columns?: 1 | 2 | 3
  className?: string
}

export function KeyValueGrid({ items, columns = 3, className }: Readonly<KeyValueGridProps>) {
  return (
    <dl className={cx(grid, COLUMN_CLASSES[columns], className)}>
      {items.map((entry) => (
        <div key={entry.label} className={item}>
          <dt className={term}>{entry.label}</dt>
          <dd className={cx(value, entry.mono && valueMono)}>
            {entry.value ?? <span className={missing}>—</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
