import { useState } from "react"

import { css, cx, fontMono, media, mix } from "@datadack/common-ui"

import { AsyncSection } from "./configuration/AsyncSection"
import { ConcurrencySection } from "./configuration/ConcurrencySection"
import { EnvSection } from "./configuration/EnvSection"
import { GeneralSection } from "./configuration/GeneralSection"
import { LayersSection } from "./configuration/LayersSection"
import {
  NetworkRoutingSection,
  NetworkRoutingTabs,
  type NetworkTab,
} from "./configuration/NetworkRoutingSection"
import { CONFIGURATION_SECTIONS, type ConfigurationSectionValue } from "./configuration/sections"
import { TagsSection } from "./configuration/TagsSection"
import type { FunctionDetailLabels } from "./labels"
import type { FunctionEntity } from "../../data/types"

export type { ConfigurationSectionValue }

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

  grid-column: 1 / -1;
`

const halfCell = css`
  ${media.lg} {
    grid-column: span 6 / span 6;
  }
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
  className,
}: Readonly<ConfigurationTabProps>) {
  const config = labels.configuration
  const [networkTab, setNetworkTab] = useState<NetworkTab>("url")
  const available = CONFIGURATION_SECTIONS.map((section) => section.value)
  const resolved = activeSection && available.includes(activeSection) ? activeSection : "general"

  const renderSection = (section: ConfigurationSectionValue) => {
    switch (section) {
      case "general":
        return (
          <div className={grid}>
            <div className={cell}>
              <GeneralSection fn={fn} scope={scope} labels={labels} />
            </div>
            <div className={cx(cell, halfCell)}>
              <ConcurrencySection fn={fn} scope={scope} labels={labels} />
            </div>
            <div className={cx(cell, halfCell)}>
              <AsyncSection fn={fn} scope={scope} labels={labels} />
            </div>
          </div>
        )
      case "env":
        return <EnvSection fn={fn} scope={scope} labels={labels} />
      case "layers":
        return <LayersSection fn={fn} scope={scope} labels={labels} />
      case "tags":
        return <TagsSection fn={fn} scope={scope} labels={labels} />
      case "network":
        return <NetworkRoutingSection fn={fn} scope={scope} labels={labels} selected={networkTab} />
      default:
        return null
    }
  }

  return (
    <div className={cx(screen, className)}>
      <header className={head}>
        <div className={headCopy}>
          <p className={eyebrow}>{config.eyebrow}</p>
          <h2 className={title} id="fn-config-heading">
            {config.nav[resolved]}
          </h2>
          <p className={blurb}>
            {resolved === "general" &&
              "Manage execution, resources, and runtime behavior for this function."}
            {resolved === "env" && config.groups.environment.description}
            {resolved === "layers" && "Attach shared runtime dependencies in a defined order."}
            {resolved === "tags" && "Organize and identify this function with resource tags."}
            {resolved === "network" &&
              "Manage URL routing, private connectivity, and edge distribution in one place."}
          </p>
        </div>
        {resolved === "network" && (
          <NetworkRoutingTabs selected={networkTab} onSelect={setNetworkTab} />
        )}
      </header>
      <div>{renderSection(resolved)}</div>
    </div>
  )
}
