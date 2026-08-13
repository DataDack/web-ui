import type { ContactSubmissionStatus } from "../../superadmin.types"

// Queue order, not alphabetical: it reads as the path a lead takes through the
// team, so the filter dropdown and the status picker both make sense top-down.
export const CONTACT_STATUSES: ContactSubmissionStatus[] = [
  "new",
  "contacted",
  "closed",
  "spam",
]
