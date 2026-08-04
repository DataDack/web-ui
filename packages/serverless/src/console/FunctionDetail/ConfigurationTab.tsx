import { useState } from "react"

import { Link2, Network, ShieldCheck } from "lucide-react"

import { css, cx, fontMono, media, mix } from "@datadack/common-ui"

import { AsyncSection } from "./configuration/AsyncSection"
import { ComingSoonSection } from "./configuration/ComingSoonSection"
import { ConcurrencySection } from "./configuration/ConcurrencySection"
import { EnvSection } from "./configuration/EnvSection"
import { GeneralSection } from "./configuration/GeneralSection"
import { TagsSection } from "./configuration/TagsSection"
import { TriggersSection } from "./configuration/TriggersSection"
import type { FunctionDetailLabels } from "./labels"
import { useServerlessContext } from "../../data/transport"
import type { FunctionEntity } from "../../data/types"

export type ConfigurationSectionValue =
  | "general"
  | "env"
  | "triggers"
  | "tags"
  | "concurrency"
  | "async"
  | "functionUrl"
  | "permissions"
  | "vpc"

/** Nav order; the last three have no backend yet and carry a "Soon" chip. */
const SECTION_ORDER: readonly { value: ConfigurationSectionValue; soon: boolean }[] = [
  { value: "general", soon: false },
  { value: "env", soon: false },
  { value: "triggers", soon: false },
  { value: "tags", soon: false },
  { value: "concurrency", soon: false },
  { value: "async", soon: false },
  { value: "functionUrl", soon: true },
  { value: "permissions", soon: true },
  { value: "vpc", soon: true },
]

const layout = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
  align-items: stretch;

  ${media.lg} {
    flex-direction: row;
    align-items: stretch;
  }
`

const nav = css`
  display: flex;
  flex-direction: column;
  gap: 2px;

  ${media.lg} {
    width: 220px;
    flex-shrink: 0;
  }
`

const navItem = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 0.375rem;
  padding: 6px 10px;
  text-align: left;
  font-size: 13px;
  color: var(--muted-foreground);

  &:hover {
    background: ${mix("--accent", 40)};
    color: var(--foreground);
  }
`

const navItemActive = css`
  background: ${mix("--accent", 70)};
  color: var(--foreground);

  &:hover {
    background: ${mix("--accent", 70)};
  }
`

const soonChip = css`
  flex-shrink: 0;
  font-family: ${fontMono};
  font-size: 10px;
  color: var(--muted-foreground);
`

const pane = css`
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
`

export interface ConfigurationTabProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  /** Optional controlled section (apps may persist ?section=). */
  activeSection?: ConfigurationSectionValue
  onSectionChange?: (section: ConfigurationSectionValue) => void
  className?: string
}

/**
 * Lambda's Configuration layout: a left nav of sections and one active panel.
 * Sections with no backend render honest coming-soon panels; the triggers item
 * disappears entirely when the transport cannot list them.
 */
export function ConfigurationTab({
  fn,
  scope,
  labels,
  activeSection,
  onSectionChange,
  className,
}: Readonly<ConfigurationTabProps>) {
  const { capabilities } = useServerlessContext()
  const [internal, setInternal] = useState<ConfigurationSectionValue>("general")

  const config = labels.configuration
  const sections = SECTION_ORDER.filter(
    (section) => section.value !== "triggers" || capabilities.triggers,
  )

  const requested = activeSection ?? internal
  const active = sections.some((section) => section.value === requested) ? requested : "general"

  const select = (section: ConfigurationSectionValue) => {
    setInternal(section)
    onSectionChange?.(section)
  }

  return (
    <div className={cx(layout, className)}>
      <nav className={nav}>
        {sections.map((section) => (
          <button
            key={section.value}
            type="button"
            className={cx(navItem, section.value === active && navItemActive)}
            aria-current={section.value === active || undefined}
            onClick={() => {
              select(section.value)
            }}
          >
            {config.nav[section.value]}
            {section.soon && <span className={soonChip}>{config.soon}</span>}
          </button>
        ))}
      </nav>

      <div className={pane}>
        {active === "general" && <GeneralSection fn={fn} scope={scope} labels={labels} />}
        {active === "env" && <EnvSection fn={fn} scope={scope} labels={labels} />}
        {active === "triggers" && <TriggersSection fn={fn} scope={scope} labels={labels} />}
        {active === "tags" && <TagsSection fn={fn} scope={scope} labels={labels} />}
        {active === "concurrency" && <ConcurrencySection fn={fn} scope={scope} labels={labels} />}
        {active === "async" && <AsyncSection fn={fn} scope={scope} labels={labels} />}
        {active === "functionUrl" && (
          <ComingSoonSection
            icon={Link2}
            title={config.comingSoon.functionUrl.title}
            message={config.comingSoon.functionUrl.message}
            soonLabel={config.soon}
          />
        )}
        {active === "permissions" && (
          <ComingSoonSection
            icon={ShieldCheck}
            title={config.comingSoon.permissions.title}
            message={config.comingSoon.permissions.message}
            soonLabel={config.soon}
          />
        )}
        {active === "vpc" && (
          <ComingSoonSection
            icon={Network}
            title={config.comingSoon.vpc.title}
            message={config.comingSoon.vpc.message}
            soonLabel={config.soon}
          />
        )}
      </div>
    </div>
  )
}
