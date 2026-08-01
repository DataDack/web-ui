import { css, cx } from "@emotion/css"

import { fontMono, mix } from "../lib/styles"

const lockup = css`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  letter-spacing: -0.025em;
`

const mark = css`
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  object-fit: contain;
`

const gold = css`
  color: var(--brand-gold);
`

const badge = css`
  border: 1px solid ${mix("--brand-gold", 50)};
  background: var(--brand-gold-soft);
  color: var(--brand-gold);
  margin-left: 6px;
  display: inline-block;
  border-radius: 2px;
  padding: 3px 1px 2px 4px;
  vertical-align: middle;
  font-family: ${fontMono};
  font-size: 0.52em;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
`

/**
 * Datadack Serverless brand lockup: the official hexagon mark plus the
 * "Data" / gold "Dack" wordmark followed by a bordered uppercase SERVERLESS
 * badge. "Data" inherits the surrounding text colour so the lockup adapts to
 * light, dark and coloured contexts. Single source of truth — use this
 * everywhere rather than an inline placeholder.
 *
 * `iconSrc` is the deployment-specific path to the hexagon asset — each
 * console serves it from its own public/ under its own base path.
 */
export function Logo({
  iconSrc = "/datadack-icon.png",
  className,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
}: Readonly<{
  iconSrc?: string
  className?: string
  iconClassName?: string
  wordmarkClassName?: string
  showWordmark?: boolean
}>) {
  return (
    <span className={cx(lockup, className)}>
      <img src={iconSrc} alt="Datadack Serverless" className={cx(mark, iconClassName)} />
      {showWordmark && (
        <span className={wordmarkClassName}>
          Data<span className={gold}>Dack</span>
          <span className={badge}>Serverless</span>
        </span>
      )}
    </span>
  )
}
