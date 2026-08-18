import type { ReactNode } from "react"

import { Container, Cpu, ExternalLink, HardDrive, MapPin, Package, Timer } from "lucide-react"

import { Badge, CopyButton, StatusBadge, css, cx, fontMono, glass1, media, mix } from "@datadack/common-ui"

import type { FunctionDetailLabels } from "./labels"
import type { FunctionEntity, FunctionUrl } from "../../data/types"
import { familyFromRuntime, RuntimeIcon } from "../RuntimeIcon"

const root = css`
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-bottom: 1px solid ${mix("--border", 55)};
  padding-bottom: 20px;
`

const identity = css`
  min-width: 0;
`

const identityRow = css`
  display: flex;
  align-items: flex-start;
  gap: 14px;
`

const identityCopy = css`
  min-width: 0;
  flex: 1;
`

const mainRow = css`
  display: flex;
  flex-direction: column;
  gap: 14px;

  ${media.md} {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
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
  border-radius: 0.625rem;
  border: 1px solid ${mix("--brand-gold", 28)};
  background: ${mix("--brand-gold", 7)};
`

const tileIcon = css`
  width: 18px;
  height: 18px;
  color: var(--brand-gold);
`

const heading = css`
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 700;
  letter-spacing: -0.025em;
`

const runtimeBadge = css`
  font-family: ${fontMono};
  font-size: 11px;
`

const arnLine = css`
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

const arnValue = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const description = css`
  max-width: 54rem;
  margin: 8px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.55;
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
  flex-shrink: 0;
`

const facts = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid ${mix("--border", 55)};
  border-radius: 0.625rem;
  background: ${mix("--border", 45)};

  ${media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const fact = css`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  background: ${mix("--background", 94)};
`

const factIcon = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--brand-gold);
`

const factValue = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--foreground);
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
  const factsList = [
    { icon: Cpu, value: fn.runtime ?? fn.runtimeMode ?? fn.packageType },
    { icon: MapPin, value: fn.region },
    { icon: HardDrive, value: fn.memorySize != null ? `${String(fn.memorySize)} MB` : undefined },
    { icon: Timer, value: fn.timeout != null ? `${String(fn.timeout)}s timeout` : undefined },
  ]

  return (
    <div className={cx(root, className)}>
      <div className={mainRow}>
        <div className={identity}>
          {fn.functionArn && (
            <div className={arnLine}>
              <span className={arnValue}>{fn.functionArn}</span>
              <CopyButton value={fn.functionArn} />
            </div>
          )}
          <div className={identityRow}>
            <div className={cx(glass1, iconTile)}>
              <TileIcon className={tileIcon} />
            </div>
            <div className={identityCopy}>
              <div className={titleRow}>
                <h1 className={heading}>{fn.name}</h1>
                <StatusBadge status={fn.state} pulse={fn.state.toLowerCase() === "active"} />
                <Badge variant="outline" className={runtimeBadge}>
                  {family && <RuntimeIcon family={family} />}
                  {fn.packageType}
                </Badge>
              </div>
              {fn.description && <p className={description}>{fn.description}</p>}
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
                  {primaryUrl.disabled && <Badge variant="outline">disabled</Badge>}
                  {primaryUrl.qualifier && <Badge variant="outline">{primaryUrl.qualifier}</Badge>}
                  {extraUrls > 0 && <Badge variant="outline">+{extraUrls}</Badge>}
                </div>
              )}
            </div>
          </div>
        </div>
        {actions && <div className={actionsSlot}>{actions}</div>}
      </div>

      <div className={facts}>
        {factsList.map((item) =>
          item.value ? (
            <div className={fact} key={item.value}>
              <item.icon className={factIcon} aria-hidden />
              <span className={factValue}>{item.value}</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}
