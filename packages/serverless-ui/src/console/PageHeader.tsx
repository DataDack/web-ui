import type { ReactNode } from "react"

import { css, cx } from "@emotion/css"
import type { LucideIcon } from "lucide-react"

import { glass1, media } from "../lib/styles"

const wrap = css`
  margin-bottom: 24px;
`

const rowTop = css`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const identity = css`
  min-width: 0;
`

const titleRow = css`
  display: flex;
  align-items: center;
  gap: 10px;
`

const iconTile = css`
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
`

const icon = css`
  color: var(--muted-foreground);
  width: 16px;
  height: 16px;
`

const heading = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  letter-spacing: -0.025em;

  ${media.md} {
    font-size: 30px;
    line-height: 36px;
  }
`

const blurb = css`
  color: var(--muted-foreground);
  margin-top: 6px;
  font-size: 14px;
  line-height: 20px;
`

const metaRow = css`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const actionsRow = css`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
`

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Right-aligned action slot (refresh button, primary CTA, ...) */
  actions?: ReactNode
  /** Extra row under the title (status badges, meta chips, ...) */
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  meta,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <div className={cx(wrap, className)}>
      <div className={rowTop}>
        <div className={identity}>
          <div className={titleRow}>
            {Icon && (
              <div className={cx(glass1, iconTile)}>
                <Icon className={icon} />
              </div>
            )}
            <h1 className={heading}>{title}</h1>
          </div>
          {description && <p className={blurb}>{description}</p>}
          {meta && <div className={metaRow}>{meta}</div>}
        </div>
        {actions && <div className={actionsRow}>{actions}</div>}
      </div>
    </div>
  )
}
