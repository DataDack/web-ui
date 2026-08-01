import type { ReactNode } from "react"

/**
 * One choice, carrying the domain object it came from so `renderRow` can build
 * a rich row without a second lookup.
 *
 * `searchText` is everything the filter should match — for a repository that is
 * "owner/name owner name", so typing either half finds it. It is never
 * displayed.
 */
export interface SmartSelectOption<TItem> {
    value: string
    item: TItem
    searchText: string
    /** Section heading this option sits under. Ungrouped options come first. */
    group?: string
    disabled?: boolean
    /** Why it is disabled — shown on the row, never left to be guessed. */
    disabledReason?: string
}

/**
 * The anatomy of a row. Domain selects return this from `renderRow` instead of
 * arbitrary JSX, so every picker in the console lines up on the same grid.
 */
export interface SmartSelectRowProps {
    /** Icon or avatar. */
    leading?: ReactNode
    primary: ReactNode
    /** Muted second line — meta, path, timestamp. */
    secondary?: ReactNode
    /** Right-aligned badge or hint, before the check mark. */
    trailing?: ReactNode
    selected?: boolean
    disabledReason?: string
    className?: string
}

/**
 * How the list is filtered.
 *
 * `client` filters the loaded options in the browser — correct when everything
 * is already here. `server` hands the debounced query to `onSearchChange` and
 * renders whatever comes back, for lists too large to load (a 500-repo org).
 * Choosing `client` for a truncated list is the bug this flag exists to make
 * visible: the search box would only ever match the first page.
 */
export type SmartSelectMode = "client" | "server"

export interface SmartSelectProps<TItem> {
    options: readonly SmartSelectOption<TItem>[]
    value: string | undefined
    onValueChange: (value: string, item: TItem) => void
    /** Row anatomy for one option. */
    renderRow: (option: SmartSelectOption<TItem>) => SmartSelectRowProps
    /** Trigger content once something is chosen. Defaults to the row's primary. */
    renderValue?: (option: SmartSelectOption<TItem>) => ReactNode
    /**
     * Trigger content for a value that is set but absent from `options` — a
     * branch chosen before the branch list loaded, a repo outside the current
     * page. Without this the trigger would fall back to the placeholder and the
     * user would think their choice was lost.
     */
    renderUnknownValue?: (value: string) => ReactNode

    mode?: SmartSelectMode
    /** Server mode only: the debounced query. */
    onSearchChange?: (query: string) => void

    /** First load — the list renders skeleton rows. */
    loading?: boolean
    /** A background refetch — the list stays, the refresh control spins. */
    fetching?: boolean
    error?: boolean
    onRefresh?: () => void
    hasMore?: boolean
    onLoadMore?: () => void
    /** Says the source capped the response, so "no match" may be a lie. */
    truncatedNote?: ReactNode

    placeholder?: string
    searchPlaceholder?: string
    /** Nothing exists to choose from. */
    emptyText?: ReactNode
    /** Things exist, but none match the query. Deliberately separate. */
    noMatchText?: (query: string) => ReactNode
    errorText?: ReactNode
    /** Sticky footer — escape hatches like "Adjust GitHub App access". */
    footer?: ReactNode

    /** Explicit section order; groups not listed keep their natural order. */
    groupOrder?: readonly string[]

    id?: string
    disabled?: boolean
    invalid?: boolean
    className?: string
    /** Accessible name when there is no visible <label>. */
    ariaLabel?: string
}
