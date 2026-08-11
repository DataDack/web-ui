import type { ReactNode } from "react"

import { Container, ExternalLink, Package } from "lucide-react"

import { Badge, StatusBadge, css, cx, fontMono, glass1 } from "@datadack/common-ui"

import type { FunctionDetailLabels } from "./labels"
import type { FunctionEntity, FunctionUrl } from "../../data/types"
import { familyFromRuntime, RuntimeIcon } from "../RuntimeIcon"

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

const urlLine = css`
  margin: 6px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  font-family: ${fontMono};
  font-size: 12px;
`

const urlAnchor = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const urlIcon = css`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: var(--muted-foreground);
`

const disabledUrl = css`
  color: var(--muted-foreground);
  text-decoration: line-through;
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
  /**
   * Hostnames that invoke this function. Empty or absent renders nothing: a
   * control plane with no function-URL surface, or a function nobody has
   * mapped, should not show an empty row where a link belongs.
   */
  urls?: FunctionUrl[]
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
  urls,
  actions,
  className,
}: Readonly<FunctionDetailHeaderProps>) {
  const isImage = fn.packageType === "image"
  const TileIcon = isImage ? Container : Package
  // An image function reports no runtime, so the badge falls back to the
  // package type and there is no language mark to put in front of it.
  const family = familyFromRuntime(fn.runtime)

  // Prefer a live hostname over a parked one, so a function with both shows the
  // address that actually answers.
  const primaryUrl = urls?.find((u) => !u.disabled) ?? urls?.[0]
  const extraUrls = (urls?.length ?? 0) - (primaryUrl ? 1 : 0)

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
            {family && <RuntimeIcon family={family} />}
            {fn.runtime ?? fn.packageType}
          </Badge>
        </div>
        {primaryUrl && (
          <div className={urlLine}>
            <ExternalLink className={urlIcon} aria-hidden />
            {primaryUrl.disabled ? (
              <span className={cx(urlAnchor, disabledUrl)}>{primaryUrl.domain}</span>
            ) : (
              <a
                className={urlAnchor}
                href={`https://${primaryUrl.domain}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {primaryUrl.domain}
              </a>
            )}
            {primaryUrl.disabled && (
              <Badge variant="outline" className={runtimeBadge}>
                disabled
              </Badge>
            )}
            {primaryUrl.qualifier && (
              <Badge variant="outline" className={runtimeBadge}>
                {primaryUrl.qualifier}
              </Badge>
            )}
            {extraUrls > 0 && (
              <Badge variant="outline" className={runtimeBadge}>
                +{extraUrls}
              </Badge>
            )}
          </div>
        )}
        {fn.functionArn && <p className={arnLine}>{fn.functionArn}</p>}
      </div>
      {actions && <div className={actionsSlot}>{actions}</div>}
    </div>
  )
}
