import type { ReactNode } from "react"

import { Check } from "lucide-react"

import { css, cx, glass1, mix } from "@datadack/common-ui"

const card = css`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 0.75rem;
  border: 1px solid ${mix("--border", 60)};
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;

  &:hover {
    border-color: ${mix("--brand-gold", 40)};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }
`

const cardSelected = css`
  border-color: ${mix("--brand-gold", 60)};
  background: ${mix("--brand-gold", 8)};
`

const checkMark = css`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--brand-gold);
  color: var(--brand-gold-foreground);
`

const iconTile = css`
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid ${mix("--border", 60)};
  color: var(--muted-foreground);
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
`

const iconTileSelected = css`
  border-color: ${mix("--brand-gold", 40)};
  background: ${mix("--brand-gold", 10)};
  color: var(--brand-gold);
`

const title = css`
  display: block;
  font-size: 14px;
  font-weight: 600;
`

const subtitle = css`
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted-foreground);
`

const bullets = css`
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--muted-foreground);

  & > li {
    display: flex;
    gap: 6px;
  }
  & > li + li {
    margin-top: 4px;
  }
`

const bulletDot = css`
  color: ${mix("--muted-foreground", 60)};
`

const bulletDotSelected = css`
  color: var(--brand-gold);
`

export interface PackageOptionCardProps {
  icon: ReactNode
  title: string
  subtitle: string
  bullets: string[]
  selected: boolean
  onSelect: () => void
}

/**
 * One answer to "where does this function's code come from?".
 *
 * The whole card is the control, so there is no dead zone between reading an
 * option and choosing it. Selection is carried by border, tint AND a check
 * mark rather than colour alone, so it survives a colourblind reader.
 */
export function PackageOptionCard({
  icon,
  title: titleText,
  subtitle: subtitleText,
  bullets: bulletItems,
  selected,
  onSelect,
}: Readonly<PackageOptionCardProps>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(glass1, card, selected && cardSelected)}
    >
      {selected && (
        <span aria-hidden className={checkMark}>
          <Check size={12} strokeWidth={3} />
        </span>
      )}

      <span className={cx(glass1, iconTile, selected && iconTileSelected)}>{icon}</span>

      <span>
        <span className={title}>{titleText}</span>
        <span className={subtitle}>{subtitleText}</span>
      </span>

      <ul className={bullets}>
        {bulletItems.map((bullet) => (
          <li key={bullet}>
            <span aria-hidden className={selected ? bulletDotSelected : bulletDot}>
              •
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </button>
  )
}
