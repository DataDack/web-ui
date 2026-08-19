import type { LucideIcon } from "lucide-react"

import { css, fontMono, mix } from "@datadack/common-ui"

import { SectionShell } from "./SectionShell"

/* Reuses SectionShell rather than being its own island: Permissions and VPC sit
   in the same grid as the sections that work, and a panel with different chrome
   would read as a rendering fault rather than as a feature that has not landed. */
const soonChip = css`
  border-radius: 9999px;
  border: 1px solid ${mix("--brand-gold", 30)};
  background: ${mix("--brand-gold", 10)};
  padding: 2px 8px;
  font-family: ${fontMono};
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-gold);
`

const placeholder = css`
  display: flex;
  min-height: 92px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed ${mix("--border", 70)};
  border-radius: 0.5rem;
  padding: 20px 24px;
  text-align: center;
`

const icon = css`
  width: 18px;
  height: 18px;
  color: ${mix("--brand-gold", 70)};
`

const blurb = css`
  margin: 0;
  max-width: 26rem;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--muted-foreground);
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
 * (Permissions, VPC): the same panel as its neighbours, with a Soon chip where
 * their Edit button goes, stating what will land here instead of a dead form.
 */
export function ComingSoonSection({
  icon: Icon,
  title,
  message,
  soonLabel,
  className,
}: Readonly<ComingSoonSectionProps>) {
  return (
    <SectionShell
      title={title}
      icon={Icon}
      actions={<span className={soonChip}>{soonLabel}</span>}
      className={className}
    >
      <div className={placeholder}>
        <Icon className={icon} aria-hidden />
        <p className={blurb}>{message}</p>
      </div>
    </SectionShell>
  )
}
