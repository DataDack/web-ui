import type { KeyboardEvent } from "react"

import { Globe2, Link2, Network } from "lucide-react"

import { css, cx, fontMono, mix } from "@datadack/common-ui"

import type { FunctionEntity } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"
import { EdgeSection } from "./EdgeSection"
import { FunctionUrlSection } from "./FunctionUrlSection"
import { NetworkSection } from "./NetworkSection"

export type NetworkTab = "url" | "vpc" | "edge"

const tabs = [
  { value: "url", label: "URL routing", icon: Link2 },
  { value: "vpc", label: "VPC connectivity", icon: Network },
  { value: "edge", label: "Edge distribution", icon: Globe2 },
] as const

const tabList = css`
  display: grid;
  grid-template-columns: repeat(3, minmax(max-content, 1fr));
  gap: 3px;
  overflow-x: auto;
  border: 1px solid ${mix("--border", 60)};
  border-radius: 0.5rem;
  background: ${mix("--background", 58)};
  padding: 4px;
`

const tab = css`
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  padding: 7px 14px;
  font-family: ${fontMono};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.035em;
  white-space: nowrap;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${mix("--ring", 55)};
  }
`

const activeTab = css`
  border-color: ${mix("--border", 80)};
  background: ${mix("--foreground", 10)};
  color: var(--foreground);
`

export interface NetworkRoutingSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  selected: NetworkTab
}

export function NetworkRoutingTabs({
  selected,
  onSelect,
}: Readonly<{ selected: NetworkTab; onSelect: (tab: NetworkTab) => void }>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab_) => tab_.value === selected)
    let next: number
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = tabs.length - 1
    else return

    event.preventDefault()
    const nextTab = tabs[next]
    if (nextTab) {
      onSelect(nextTab.value)
      document.getElementById(`network-tab-${nextTab.value}`)?.focus()
    }
  }

  return (
    <div
      className={tabList}
      role="tablist"
      aria-label="Network configuration"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab_) => {
        const active = tab_.value === selected
        const Icon = tab_.icon
        return (
          <button
            key={tab_.value}
            type="button"
            role="tab"
            id={`network-tab-${tab_.value}`}
            aria-selected={active}
            aria-controls={`network-panel-${tab_.value}`}
            tabIndex={active ? 0 : -1}
            className={cx(tab, active && activeTab)}
            onClick={() => {
              onSelect(tab_.value)
            }}
          >
            <Icon size={14} aria-hidden />
            {tab_.label}
          </button>
        )
      })}
    </div>
  )
}

export function NetworkRoutingSection({
  fn,
  scope,
  labels,
  selected,
}: Readonly<NetworkRoutingSectionProps>) {
  return (
    <section
      aria-label="Network routing"
      role="tabpanel"
      id={`network-panel-${selected}`}
      aria-labelledby={`network-tab-${selected}`}
    >
      {selected === "url" && <FunctionUrlSection fn={fn} scope={scope} labels={labels} />}
      {selected === "vpc" && <NetworkSection fn={fn} />}
      {selected === "edge" && <EdgeSection fn={fn} />}
    </section>
  )
}
