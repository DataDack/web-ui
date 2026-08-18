import type { LucideIcon } from "lucide-react"

import { css, cx, fontMono, glass1, mix } from "@datadack/common-ui"

/* A fixed floor rather than `flex: 1`: enough room for the placeholder to sit
   centred without the panel growing to the height of the whole page. */
const panel = css`
  display: flex;
  min-height: 280px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed ${mix("--border", 70)};
  border-radius: 0.75rem;
  padding: 32px 24px;
  text-align: center;
`

const iconTile = css`
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
`

const icon = css`
  width: 20px;
  height: 20px;
  color: var(--brand-gold);
`

const soonBadge = css`
  margin-top: 12px;
  border-radius: 9999px;
  background: ${mix("--brand-gold", 10)};
  padding: 2px 8px;
  font-family: ${fontMono};
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--brand-gold);
`

const heading = css`
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 600;
`

const blurb = css`
  margin: 6px 0 0;
  max-width: 24rem;
  font-size: 13px;
  color: var(--muted-foreground);
  line-height: 1.625;
`

export interface ComingSoonSectionProps {
  icon: LucideIcon
  title: string
  message: string
  soonLabel: string
  className?: string
}

/**
 * The honest placeholder for a Configuration section with no backend yet
 * (Function URL, Permissions, VPC): a dashed panel that states what will land
 * here instead of a dead form.
 */
export function ComingSoonSection({
  icon: Icon,
  title,
  message,
  soonLabel,
  className,
}: Readonly<ComingSoonSectionProps>) {
  return (
    <section className={cx(glass1, panel, className)}>
      <div className={cx(glass1, iconTile)}>
        <Icon className={icon} />
      </div>
      <span className={soonBadge}>{soonLabel}</span>
      <h3 className={heading}>{title}</h3>
      <p className={blurb}>{message}</p>
    </section>
  )
}
