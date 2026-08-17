// Shared building blocks for the Managed Apps section (used across pages).
export { ActivityTimeline } from "./ActivityTimeline"
export { BuildProgressBar } from "./BuildProgressBar"
export { BuildStatusPill } from "./BuildStatusPill"
export { ProjectAvatar } from "./ProjectAvatar"
export { ProjectStateChip } from "./ProjectStateChip"
export { FRAMEWORK_MARKS, PROJECT_TYPE_META, projectTypeLabel } from "./project-type"
export type { FrameworkMark } from "./project-type"
export { ProjectTypeBadge, ProjectTypeIcon } from "./ProjectTypeBadge"

// Pickers for the creation flow and the settings tab
export { BranchSelect } from "./BranchSelect"
export { BuildSettingsSection } from "./BuildSettingsSection"
export type { BuildSettingsValue } from "./BuildSettingsSection"
export { GitHubAccountSelect } from "./GitHubAccountSelect"
export { RepoSelect } from "./RepoSelect"
export { RootDirectoryInput } from "./RootDirectoryInput"
// The account's tier, stated rather than chosen — the create flow and a
// project's settings both show this, because neither may change it. There is
// no tier PICKER component any more: the one place a tier is chosen is the
// section's settings page, which owns its own cards.
export { PlanLimitsPanel } from "./PlanLimitsPanel"
export { PlanTierArt } from "./plan/PlanTierArt"
export {
  formatAmount,
  formatLimit,
  formatPrice,
  formatQuota,
  isUnlimited,
  planHighlights,
  planQuotaDeltas,
  planQuotaRows,
  quotaField,
  QUOTA_FIELDS,
} from "./plan/plan-format"
export type { PlanQuotaDelta, QuotaField } from "./plan/plan-format"
// What a tier sells beyond its eight numbers. Frontend copy, not catalogue
// data: nothing in the backend gates these by plan, so they are stated as
// included everywhere rather than invented as tier differences.
export {
  customFeatureCell,
  customHighlights,
  featureCell,
  FEATURE_GROUPS,
} from "./plan/plan-features"
export type { FeatureCell, FeatureGroup, FeatureRow } from "./plan/plan-features"
export { RuntimeSelect } from "./RuntimeSelect"

// Environment variables
export { EnvVarEditor } from "./env/EnvVarEditor"
export { parseDotEnv } from "./env/EnvVarEditor/env-parse"
export { duplicateKeys, newEnvRow, storedEnvRows, toEnvMap } from "./env/EnvVarEditor/env-types"
export type { EnvRow, EnvRowState } from "./env/EnvVarEditor/env-types"
