import type { ReactNode } from "react"

import { ChevronRight, type LucideIcon } from "lucide-react"

import { css, cx } from "../lib/emotion"
import { glass1, media } from "../lib/styles"

const wrap = css`
  margin-bottom: 24px;
`

const crumbNav = css`
  color: var(--muted-foreground);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;

  /* renderLink hands back an opaque node — the app's react-router Link — so the
     only way to style it is to reach the anchor it renders from here. */
  a {
    color: inherit;
    text-decoration: none;
    transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  a:hover {
    color: var(--foreground);
  }
`

const crumbItem = css`
  display: flex;
  align-items: center;
  gap: 4px;
`

const crumbSeparator = css`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.6;
`

const crumbIcon = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-right: 4px;
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

/** One step of the trail above the title; `to` turns the crumb into a link. */
export interface Breadcrumb {
  label: string
  to?: string
}

/** No router here, so a linked crumb degrades to an ordinary document link. */
const anchorLink = (crumb: Breadcrumb, children: ReactNode) => <a href={crumb.to}>{children}</a>

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Trail above the title. Rendered only when non-empty. */
  breadcrumbs?: Breadcrumb[]
  /**
   * Wraps a crumb that carries a `to`; the app passes react-router's `Link`.
   * This is a prop rather than a router context on purpose: common-ui is
   * instantiated twice in serverless-web, so a provider mounted through one
   * instance is invisible to components resolved from the other. Defaults to a
   * plain anchor, which is also what a router-less consumer wants.
   */
  renderLink?: (crumb: Breadcrumb, children: ReactNode) => ReactNode
  /**
   * Where `icon` goes. "tile" is the 36px glass tile beside the title and stays
   * the default so consoles already on this component do not shift; "crumb" is
   * the cloud console's small icon leading the breadcrumb row, which — like the
   * row itself — draws nothing when there are no breadcrumbs.
   */
  iconPlacement?: "tile" | "crumb"
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
  breadcrumbs,
  renderLink = anchorLink,
  iconPlacement = "tile",
  actions,
  meta,
  className,
}: Readonly<PageHeaderProps>) {
  const hasCrumbs = breadcrumbs !== undefined && breadcrumbs.length > 0

  return (
    <div className={cx(wrap, className)}>
      {hasCrumbs && (
        <nav aria-label="Breadcrumb" className={crumbNav}>
          {Icon && iconPlacement === "crumb" && <Icon className={crumbIcon} />}
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}:${String(index)}`} className={crumbItem}>
              {index > 0 && <ChevronRight className={crumbSeparator} />}
              {crumb.to === undefined ? <span>{crumb.label}</span> : renderLink(crumb, crumb.label)}
            </span>
          ))}
        </nav>
      )}
      <div className={rowTop}>
        <div className={identity}>
          <div className={titleRow}>
            {Icon && iconPlacement === "tile" && (
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
