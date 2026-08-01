import { css, cx } from "@emotion/css"
import type { LucideIcon } from "lucide-react"

import { contentEnter, glass1, media } from "../lib/styles"
import { Skeleton } from "../ui/skeleton"

export type StatColor = "default" | "success" | "warning" | "danger" | "info"

const VALUE_CLASSES: Record<StatColor, string> = {
  default: css`
    color: var(--foreground);
  `,
  success: css`
    color: var(--status-success);
  `,
  warning: css`
    color: var(--status-warning);
  `,
  danger: css`
    color: var(--status-danger);
  `,
  info: css`
    color: var(--status-info);
  `,
}

const card = css`
  padding: 16px;
`

const skeletonValue = css`
  margin-bottom: 4px;
  height: 32px;
  width: 64px;
`

const skeletonLabel = css`
  height: 16px;
  width: 96px;
`

const rowTop = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const valueText = css`
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
`

const icon = css`
  color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
  width: 16px;
  height: 16px;
`

const label = css`
  color: var(--muted-foreground);
  margin-top: 4px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
`

export interface StatCardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  color?: StatColor
  loading?: boolean
  className?: string
}

export function StatCard({
  label: labelText,
  value,
  icon: Icon,
  color = "default",
  loading = false,
  className,
}: Readonly<StatCardProps>) {
  return (
    <div className={cx(glass1, card, className)}>
      {loading ? (
        // Mirrors the loaded layout (h-8 value line, h-4 label line).
        <>
          <Skeleton className={skeletonValue} />
          <Skeleton className={skeletonLabel} />
        </>
      ) : (
        <div className={contentEnter}>
          <div className={rowTop}>
            <span className={cx(valueText, VALUE_CLASSES[color])}>{value}</span>
            {Icon && <Icon className={icon} />}
          </div>
          <span className={label}>{labelText}</span>
        </div>
      )}
    </div>
  )
}

const statGrid = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  ${media.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

export function StatGrid({
  children,
  className,
}: Readonly<{
  children: React.ReactNode
  className?: string
}>) {
  return <div className={cx(statGrid, className)}>{children}</div>
}
