import { Boxes, Eye, Terminal, Upload, type LucideIcon } from "lucide-react"

import type { BranchMode, EnvironmentKind, ProjectEnvironment } from "../../../managed-apps.types"

/** The glyph and tone each kind wears, keyed by kind rather than by name so a
 *  custom environment called "production-eu" does not borrow production's. */
const KIND_META: Record<EnvironmentKind, { icon: LucideIcon; label: string }> = {
  production: { icon: Upload, label: "Production" },
  preview: { icon: Eye, label: "Preview" },
  development: { icon: Terminal, label: "Development" },
  custom: { icon: Boxes, label: "Custom" },
}

export function kindMeta(kind: EnvironmentKind) {
  return KIND_META[kind]
}

/**
 * What the Branch Tracking column says.
 *
 * Prose rather than the stored mode, because the stored mode is a word from a
 * vocabulary the reader has never seen. "All unassigned branches" is a sentence;
 * "unassigned" is a field name that leaked.
 */
export function branchLabel(environment: ProjectEnvironment): string {
  switch (environment.branch_mode) {
    case "exact":
      return environment.branch_value
    case "prefix":
      return `${environment.branch_value}*`
    case "unassigned":
      return "All unassigned git branches"
    default:
      return environment.kind === "development" ? "Accessible via CLI" : "Not tracked"
  }
}

/** Whether the label above names a real branch, so the row can mark it up as
 *  one — a git glyph beside "Accessible via CLI" would be a small lie. */
export function tracksABranch(mode: BranchMode): boolean {
  return mode === "exact" || mode === "prefix"
}

/** The options the branch picker offers, worded as the reader meets them. */
export const BRANCH_MODE_OPTIONS: { value: BranchMode; label: string; hint: string }[] = [
  {
    value: "exact",
    label: "Branch is",
    hint: "One branch, exactly. A push to it builds this environment.",
  },
  {
    value: "prefix",
    label: "Branch starts with",
    hint: "Every branch under a prefix — release/, feature/.",
  },
  {
    value: "unassigned",
    label: "All unassigned branches",
    hint: "Anything no other environment claims. Only one environment may hold this.",
  },
]
