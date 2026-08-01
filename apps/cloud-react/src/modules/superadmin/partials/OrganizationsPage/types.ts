import type { OverviewAccount, OverviewUser } from "../../superadmin.types"

// Flattened rows derived from the /org/overview lists. `orgName` is the label
// the tables show; the server denormalizes org_name onto both, since a search
// narrows the organizations list and would leave nothing to join against.
export type AccountRow = OverviewAccount & { orgName: string }
export type UserRow = OverviewUser & { orgName: string | null }

/**
 * What every tab needs from the page shell: the debounced search term and the
 * page it should fetch. Paging is server-side and lives in the URL, so the tab
 * reports a change upward rather than holding it.
 */
export interface TabProps {
	q: string
	page: number
	pageSize: number
	onPageChange: (page: number) => void
}
