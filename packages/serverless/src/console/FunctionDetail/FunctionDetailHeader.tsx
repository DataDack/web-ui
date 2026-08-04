import type { ReactNode } from "react"

import { Container, Package } from "lucide-react"

import { Badge, StatusBadge, css, cx, fontMono, glass1 } from "@datadack/common-ui"

import type { FunctionDetailLabels } from "./labels"
import type { FunctionEntity } from "../../data/types"

const root = css`
  margin-bottom: 20px;
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
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`

const iconTile = css`
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
`

const tileIcon = css`
  width: 18px;
  height: 18px;
  color: var(--muted-foreground);
`

const heading = css`
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.025em;
`

const runtimeBadge = css`
  font-family: ${fontMono};
  font-size: 11px;
`

const arnLine = css`
  margin: 6px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

const actionsSlot = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

export interface FunctionDetailHeaderProps {
  fn: FunctionEntity
  labels: FunctionDetailLabels
  /** Rendered right-aligned; the shell puts headerActions + Delete here. */
  actions?: ReactNode
  className?: string
}

/**
 * The identity strip above the tabs: package icon, mono name, live state,
 * runtime badge, and the ARN when the control plane reports one.
 */
export function FunctionDetailHeader({
  fn,
  actions,
  className,
}: Readonly<FunctionDetailHeaderProps>) {
  const isImage = fn.packageType === "image"
  const TileIcon = isImage ? Container : Package

  return (
    <div className={cx(root, className)}>
      <div className={identity}>
        <div className={titleRow}>
          <div className={cx(glass1, iconTile)}>
            <TileIcon className={tileIcon} />
          </div>
          <h1 className={heading}>{fn.name}</h1>
          <StatusBadge status={fn.state} pulse={fn.state.toLowerCase() === "active"} />
          <Badge variant="outline" className={runtimeBadge}>
            {fn.runtime ?? fn.packageType}
          </Badge>
        </div>
        {fn.functionArn && <p className={arnLine}>{fn.functionArn}</p>}
      </div>
      {actions && <div className={actionsSlot}>{actions}</div>}
    </div>
  )
}
