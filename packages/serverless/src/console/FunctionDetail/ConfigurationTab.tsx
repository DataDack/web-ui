import { useState } from "react"

import { Network, ShieldCheck } from "lucide-react"

import { css, cx, fontMono, media, mix } from "@datadack/common-ui"

import { AsyncSection } from "./configuration/AsyncSection"
import { ComingSoonSection } from "./configuration/ComingSoonSection"
import { ConcurrencySection } from "./configuration/ConcurrencySection"
import { EnvSection } from "./configuration/EnvSection"
import { FunctionUrlSection } from "./configuration/FunctionUrlSection"
import { GeneralSection } from "./configuration/GeneralSection"
import { LayersSection } from "./configuration/LayersSection"
import {
  CONFIGURATION_SECTIONS,
  type ConfigurationSectionValue,
} from "./configuration/sections"
import { TagsSection } from "./configuration/TagsSection"
import { TriggersSection } from "./configuration/TriggersSection"
import type { FunctionDetailLabels } from "./labels"
import { useServerlessContext } from "../../data/transport"
import type { FunctionEntity } from "../../data/types"

export type { ConfigurationSectionValue }

const layout = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
  align-items: stretch;

  ${media.md} {
    flex-direction: row;
    align-items: stretch;
  }
`

const nav = css`
  display: flex;
  min-width: 0;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px;
  border: 1px solid ${mix("--border", 55)};
  border-radius: 0.625rem;
  background: var(--glass-1-bg);

  ${media.md} {
    width: 232px;
    flex-shrink: 0;
    flex-direction: column;
    overflow: visible;
    padding: 6px;
  }
`

const navItem = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  border-radius: 0.375rem;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  color: var(--muted-foreground);

  &:hover {
    background: ${mix("--accent", 40)};
    color: var(--foreground);
  }
`

const navItemActive = css`
  background: ${mix("--brand-gold", 9)};
  color: var(--foreground);
  box-shadow: inset 2px 0 0 var(--brand-gold);

  &:hover {
    background: ${mix("--brand-gold", 9)};
  }
`

const navLabel = css`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`

const navIcon = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
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
  /**
   * Drop the built-in section nav. The detail page sets this because its left
   * rail already lists the sections — two navs for one choice is one too many.
   */
  hideNav?: boolean
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
  hideNav = false,
  className,
}: Readonly<ConfigurationTabProps>) {
  const { capabilities } = useServerlessContext()
  const [internal, setInternal] = useState<ConfigurationSectionValue>("general")

  const config = labels.configuration
  const sections = CONFIGURATION_SECTIONS.filter(
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
      {!hideNav && (
      <nav className={nav} aria-label={labels.nav.label}>
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
            <span className={navLabel}>
              <section.icon className={navIcon} aria-hidden />
              {config.nav[section.value]}
            </span>
            {section.soon && <span className={soonChip}>{config.soon}</span>}
          </button>
        ))}
      </nav>
      )}

      <div className={pane}>
        {active === "general" && <GeneralSection fn={fn} scope={scope} labels={labels} />}
        {active === "env" && <EnvSection fn={fn} scope={scope} labels={labels} />}
        {active === "triggers" && <TriggersSection fn={fn} scope={scope} labels={labels} />}
        {active === "layers" && <LayersSection fn={fn} scope={scope} labels={labels} />}
        {active === "tags" && <TagsSection fn={fn} scope={scope} labels={labels} />}
        {active === "concurrency" && <ConcurrencySection fn={fn} scope={scope} labels={labels} />}
        {active === "async" && <AsyncSection fn={fn} scope={scope} labels={labels} />}
        {active === "functionUrl" && (
          <FunctionUrlSection fn={fn} scope={scope} labels={labels} />
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
