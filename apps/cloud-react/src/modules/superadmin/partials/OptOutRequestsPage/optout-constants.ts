import type { OptOutRight, OptOutStatus } from "../../superadmin.types"

// Queue order, not alphabetical: it reads as the path a request takes through
// the team, so the filter dropdown and the status picker both make sense
// top-down.
export const OPTOUT_STATUSES: OptOutStatus[] = [
  "new",
  "in_progress",
  "completed",
  "rejected",
]

// Form order, matching the checkboxes the visitor saw. Kept in this order in the
// UI so an operator reading a row sees it laid out the way it was filled in.
export const OPTOUT_RIGHTS: OptOutRight[] = [
  "access_info",
  "opt_out_comms",
  "delete_info",
]

/**
 * Erasure is the one right that cannot be undone once acted on, so it is the one
 * the queue marks out visually. This is not a severity ranking of the rights —
 * all three are obligations — it is a note about which mistake is unrecoverable.
 */
export function isIrreversible(right: OptOutRight): boolean {
  return right === "delete_info"
}
