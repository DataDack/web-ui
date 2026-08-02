import type { LucideIcon } from "lucide-react"

import { css, cx } from "../lib/emotion"
import { contentEnter, glass1 } from "../lib/styles"

const wrap = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  text-align: center;
`

const iconTile = css`
  margin-bottom: 16px;
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
`

const icon = css`
  color: var(--muted-foreground);
  width: 20px;
  height: 20px;
`

const heading = css`
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
`

const blurb = css`
  color: var(--muted-foreground);
  margin-top: 4px;
  max-width: 24rem;
  font-size: 13px;
`

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div className={cx(contentEnter, wrap, className)}>
      <div className={cx(glass1, iconTile)}>
        <Icon className={icon} />
      </div>
      <h3 className={heading}>{title}</h3>
      {description && <p className={blurb}>{description}</p>}
    </div>
  )
}
