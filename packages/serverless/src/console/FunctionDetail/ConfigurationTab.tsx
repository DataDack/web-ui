import { useEffect, useRef, useState, type KeyboardEvent } from "react"

import { Network, ShieldCheck } from "lucide-react"

import { css, cx, fontMono, media, mix } from "@datadack/common-ui"

import { AsyncSection } from "./configuration/AsyncSection"
import { ComingSoonSection } from "./configuration/ComingSoonSection"
import { ConcurrencySection } from "./configuration/ConcurrencySection"
import { EnvSection } from "./configuration/EnvSection"
import { FunctionUrlSection } from "./configuration/FunctionUrlSection"
import { GeneralSection } from "./configuration/GeneralSection"
import {
  CONFIGURATION_GROUPS,
  groupOfSection,
  type ConfigurationGroupValue,
} from "./configuration/groups"
import { LayersSection } from "./configuration/LayersSection"
import { CONFIGURATION_SECTIONS, type ConfigurationSectionValue } from "./configuration/sections"
import { TagsSection } from "./configuration/TagsSection"
import { TriggersSection } from "./configuration/TriggersSection"
import type { FunctionDetailLabels } from "./labels"
import { useServerlessContext } from "../../data/transport"
import type { FunctionEntity } from "../../data/types"

export type { ConfigurationSectionValue }

/* How wide each panel sits on the twelve-column grid. The anchor of every
   screen spans the full width and the rest pair off 7/5 or 6/6, which is what
   keeps three short sections from rendering as three lonely strips. */
const SPAN: Record<ConfigurationSectionValue, number> = {
  general: 12,
  env: 12,
  tags: 5,
  functionUrl: 12,
  triggers: 7,
  vpc: 5,
  concurrency: 6,
  async: 6,
  layers: 7,
  permissions: 5,
}

const screen = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 18px;
`

const head = css`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid ${mix("--border", 45)};
  padding-bottom: 16px;
`

const headCopy = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
`

const eyebrow = css`
  margin: 0;
  font-family: ${fontMono};
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 75)};
`

const title = css`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--foreground);
`

const blurb = css`
  margin: 0;
  max-width: 46rem;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted-foreground);
`

/* A segmented group rather than the kit's underline tabs: the underline set is
   page-level navigation, and this is one level down — the rail already said
   "Configuration", these three only say which part of it. */
const strip = css`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  border: 1px solid ${mix("--border", 60)};
  border-radius: 0.5rem;
  background: ${mix("--foreground", 3)};
  padding: 3px;
`

const tab = css`
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  padding: 6px 12px;
  font-family: ${fontMono};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${mix("--ring", 50)};
  }
`

const tabActive = css`
  border-color: ${mix("--brand-gold", 30)};
  background: ${mix("--brand-gold", 12)};
  color: var(--foreground);

  &:hover {
    color: var(--foreground);
  }
`

const grid = css`
  display: grid;
  align-items: start;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);

  ${media.lg} {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
`

const cell = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  border-radius: 0.75rem;

  ${media.lg} {
    grid-column: span var(--span) / span var(--span);
  }
`

/* A ?section= deep link still names one section, but its screen now shows
   three. The ring says which row the link meant without stranding the other
   two behind a click. */
const cellSpotlit = css`
  box-shadow: 0 0 0 1px var(--brand-gold);
`

export interface ConfigurationTabProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  /**
   * Optional controlled section (apps may persist ?section=). A section selects
   * the screen it belongs to; selecting a screen reports its first section back
   * through onSectionChange, so the URL keeps naming one destination.
   */
  activeSection?: ConfigurationSectionValue
  onSectionChange?: (section: ConfigurationSectionValue) => void
  className?: string
}

/**
 * Configuration groups related settings without hiding high-use environment
 * variables inside the General screen.
 *
 * General says what the function is, Environment owns runtime variables,
 * Networking says how requests reach it, and Runtime covers execution; each uses a
 * twelve-column grid. Sections with no backend keep an honest coming-soon
 * panel in place rather than disappearing, and the triggers panel drops out
 * entirely when the transport cannot list them.
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
  const panels = useRef(new Map<ConfigurationSectionValue, HTMLDivElement | null>())

  const config = labels.configuration

  const available = CONFIGURATION_SECTIONS.filter(
    (section) => section.value !== "triggers" || capabilities.triggers,
  ).map((section) => section.value)

  const groups = CONFIGURATION_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) => available.includes(section)),
  })).filter((group) => group.sections.length > 0)

  const requested = activeSection ?? internal
  const resolved = available.includes(requested) ? requested : (available[0] ?? "general")
  const requestedGroup = groupOfSection(resolved)
  const group =
    groups.find((candidate) => candidate.value === requestedGroup) ?? groups[0] ?? undefined

  // The group's own first section — the one the tab itself means. Anything else
  // arrived as a deep link and gets scrolled to and ringed.
  const anchor = group?.sections[0]
  const spotlit = resolved === anchor ? undefined : resolved

  useEffect(() => {
    if (!spotlit) return
    panels.current.get(spotlit)?.scrollIntoView({ block: "nearest" })
  }, [spotlit])

  if (!group) return null

  const select = (section: ConfigurationSectionValue) => {
    setInternal(section)
    onSectionChange?.(section)
  }

  const selectGroup = (value: ConfigurationGroupValue) => {
    const next = groups.find((candidate) => candidate.value === value)
    if (next?.sections[0]) select(next.sections[0])
  }

  // Roving arrow keys, the behaviour a tablist owes the keyboard: only the
  // active tab is tabbable, and ←/→/Home/End move between them.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = groups.findIndex((candidate) => candidate.value === group.value)
    let next = index
    if (event.key === "ArrowRight") next = (index + 1) % groups.length
    else if (event.key === "ArrowLeft") next = (index - 1 + groups.length) % groups.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = groups.length - 1
    else return
    event.preventDefault()
    const target = groups[next]
    if (target) selectGroup(target.value)
  }

  const renderSection = (section: ConfigurationSectionValue) => {
    switch (section) {
      case "general":
        return <GeneralSection fn={fn} scope={scope} labels={labels} />
      case "env":
        return <EnvSection fn={fn} scope={scope} labels={labels} />
      case "tags":
        return <TagsSection fn={fn} scope={scope} labels={labels} />
      case "functionUrl":
        return <FunctionUrlSection fn={fn} scope={scope} labels={labels} />
      case "triggers":
        return <TriggersSection fn={fn} scope={scope} labels={labels} />
      case "layers":
        return <LayersSection fn={fn} scope={scope} labels={labels} />
      case "concurrency":
        return <ConcurrencySection fn={fn} scope={scope} labels={labels} />
      case "async":
        return <AsyncSection fn={fn} scope={scope} labels={labels} />
      case "permissions":
        return (
          <ComingSoonSection
            icon={ShieldCheck}
            title={config.comingSoon.permissions.title}
            message={config.comingSoon.permissions.message}
            soonLabel={config.soon}
          />
        )
      case "vpc":
        return (
          <ComingSoonSection
            icon={Network}
            title={config.comingSoon.vpc.title}
            message={config.comingSoon.vpc.message}
            soonLabel={config.soon}
          />
        )
    }
  }

  return (
    <div className={cx(screen, className)}>
      <header className={head}>
        <div className={headCopy}>
          <p className={eyebrow}>{config.eyebrow}</p>
          <h2 className={title} id="fn-config-heading">
            {config.groups[group.value].title}
          </h2>
          <p className={blurb}>{config.groups[group.value].description}</p>
        </div>

        <div className={strip} role="tablist" aria-label={config.eyebrow} onKeyDown={onKeyDown}>
          {groups.map((candidate) => {
            const active = candidate.value === group.value
            return (
              <button
                key={candidate.value}
                type="button"
                role="tab"
                id={`fn-config-tab-${candidate.value}`}
                aria-selected={active}
                aria-controls="fn-config-panel"
                tabIndex={active ? 0 : -1}
                className={cx(tab, active && tabActive)}
                onClick={() => {
                  selectGroup(candidate.value)
                }}
              >
                {config.groups[candidate.value].title}
              </button>
            )
          })}
        </div>
      </header>

      <div
        className={grid}
        id="fn-config-panel"
        role="tabpanel"
        aria-labelledby={`fn-config-tab-${group.value}`}
      >
        {group.sections.map((section) => (
          <div
            key={section}
            ref={(node) => {
              panels.current.set(section, node)
            }}
            className={cx(cell, spotlit === section && cellSpotlit)}
            style={{ "--span": SPAN[section] } as React.CSSProperties}
          >
            {renderSection(section)}
          </div>
        ))}
      </div>
    </div>
  )
}
