import type { ComponentType } from "react"

import { Braces, Boxes, Gauge, Globe, Hammer, LockKeyhole, Tag } from "lucide-react"

import type { SectionTone } from "@/components/console"

import { GitHubMark } from "../../../components/GitHubMark"
import type { Project } from "../../../managed-apps.types"

export const SETTINGS_SECTIONS_PARAM = "section"

export type SettingsSectionId =
  "general" | "git" | "build" | "environment-variables" | "restrictions" | "plan"

export interface SettingsSectionMeta {
  id: SettingsSectionId
  label: string
  /** One line, shown under the label in the rail on wide viewports. */
  hint: string
  icon: ComponentType<{ className?: string }>
  tone: SectionTone
  /** Sections that only exist for a project built from a repository. */
  needsRepo: boolean
  comingSoon?: boolean
}

/**
 * The rail's inventory, in the order a user reaches for it: identity, then
 * source, then how it builds, then what it costs. Project deletion lives at
 * the bottom of General instead of posing as a settings category of its own.
 *
 * Git carries the Octocat rather than lucide's `GitBranch`. The section is not
 * about branching in the abstract: it is about the GitHub installation, the
 * GitHub repository and the workflow file GitHub runs, and every one of those
 * words is a brand. GitHubMark already exists for exactly this reason.
 */
export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: "general",
    label: "General",
    hint: "Name, address, runtime",
    // Not `Settings` — that glyph belongs to the tab this rail lives inside,
    // and reusing it makes one section look like the whole page.
    icon: Tag,
    tone: "neutral",
    needsRepo: false,
  },
  {
    id: "git",
    label: "Git",
    hint: "Repository and branch",
    icon: GitHubMark,
    tone: "info",
    needsRepo: true,
  },
  {
    id: "build",
    label: "Build & output",
    hint: "Commands and directories",
    icon: Hammer,
    tone: "brand",
    needsRepo: true,
  },
  {
    id: "environment-variables",
    label: "Environment variables",
    hint: "Per environment",
    icon: Braces,
    tone: "brand",
    needsRepo: false,
  },
  {
    id: "restrictions",
    label: "Restrictions",
    hint: "IP rules and firewall, per environment",
    icon: LockKeyhole,
    tone: "warning",
    needsRepo: false,
  },
  {
    id: "plan",
    label: "Plan",
    hint: "Quotas this project runs under",
    // Quotas are a measurement. `CreditCard` would promise a payment this
    // section cannot take — the tier is account-scoped and changed elsewhere.
    icon: Gauge,
    tone: "accent",
    needsRepo: false,
  },
]

export interface SettingsDeparture {
  tab: string
  label: string
  hint: string
  icon: ComponentType<{ className?: string }>
}

/**
 * Settings that are real, and are not here.
 *
 * Environment variables and domains are their own tabs. Leaving them off the
 * rail entirely is what made someone scroll this page looking for them; naming
 * them and marking them as a departure costs one row and answers the question.
 */
export const SETTINGS_DEPARTURES: SettingsDeparture[] = [
  // Environments moved out of this rail and became a tab. An environment is not
  // a setting — it is the thing that OWNS the settings below it, and the two
  // sections that follow are both scoped to one. Leaving a stub here would be a
  // second, staler list of the same rows.
  { tab: "environments", label: "Environments", hint: "Branches and scopes", icon: Boxes },
  { tab: "domains", label: "Domains", hint: "Custom addresses", icon: Globe },
]

/** The sections this project actually has. */
export function sectionsFor(project: Project): SettingsSectionMeta[] {
  const hasRepo = project.project_type !== "n8n"
  return SETTINGS_SECTIONS.filter((section) => hasRepo || !section.needsRepo)
}

/** Resolves `?section=` against what this project has, never trusting the URL. */
export function resolveSection(project: Project, requested: string | null): SettingsSectionId {
  const available = sectionsFor(project)
  const match = available.find((section) => section.id === requested)
  return match?.id ?? available[0].id
}
