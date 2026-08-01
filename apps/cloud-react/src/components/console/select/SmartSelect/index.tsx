import { type ReactNode, useEffect, useMemo, useState } from "react"

import { ChevronDown } from "lucide-react"

import { Command, CommandInput } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useDebounce } from "@/hooks/use-debounce"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

import type { SmartSelectOption, SmartSelectProps } from "./smart-select.types"
import { SmartSelectFooter } from "./SmartSelectFooter"
import { SmartSelectList } from "./SmartSelectList"

/** Long enough that a typist is not firing a request per keystroke. */
const SERVER_SEARCH_DEBOUNCE_MS = 250

/** Below this the popover becomes a bottom sheet. Matches Tailwind's `lg`. */
const DESKTOP_QUERY = "(min-width: 1024px)"

/**
 * The console's rich picker: searchable, groupable, async-aware, with rows that
 * carry real metadata instead of a single label.
 *
 * It is deliberately query-library agnostic — it takes `loading`/`fetching`/
 * `error`/`onRefresh` as plain props rather than a `useQuery` result, so it can
 * be driven by anything and tested without a provider.
 *
 * Filtering is done here rather than by cmdk. cmdk matches against each item's
 * `value`, which forces a choice between "value is the id" (unsearchable) and
 * "value is the search text" (collides when two options share a label). Owning
 * the filter keeps ids as ids and makes client and server mode behave the same.
 */
export function SmartSelect<TItem>({
	options,
	value,
	onValueChange,
	renderRow,
	renderValue,
	renderUnknownValue,
	mode = "client",
	onSearchChange,
	loading = false,
	fetching = false,
	error = false,
	onRefresh,
	hasMore = false,
	onLoadMore,
	truncatedNote,
	placeholder = "Select…",
	searchPlaceholder = "Search…",
	emptyText,
	noMatchText,
	errorText,
	footer,
	groupOrder,
	id,
	disabled = false,
	invalid = false,
	className,
	ariaLabel,
}: Readonly<SmartSelectProps<TItem>>) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const isDesktop = useMediaQuery(DESKTOP_QUERY)
	const debouncedQuery = useDebounce(query, SERVER_SEARCH_DEBOUNCE_MS)

	// Server mode owns the result set; the debounced query goes out, whatever
	// comes back is rendered as-is.
	useEffect(() => {
		if (mode === "server") onSearchChange?.(debouncedQuery)
	}, [mode, debouncedQuery, onSearchChange])

	const visible = useMemo(() => {
		if (mode === "server") return options
		const needle = query.trim().toLowerCase()
		if (!needle) return options
		return options.filter((option) => option.searchText.toLowerCase().includes(needle))
	}, [mode, options, query])

	const selected = options.find((option) => option.value === value)

	const pick = (option: SmartSelectOption<TItem>) => {
		onValueChange(option.value, option.item)
		setOpen(false)
		setQuery("")
	}

	let triggerLabel: ReactNode = placeholder
	if (selected) {
		triggerLabel = renderValue ? renderValue(selected) : renderRow(selected).primary
	} else if (value) {
		// A value we hold but cannot resolve yet. Showing the placeholder here
		// would read as "nothing selected" and invite the user to pick again.
		triggerLabel = renderUnknownValue ? renderUnknownValue(value) : value
	}

	const body = (
		<Command shouldFilter={false} className="bg-transparent">
			<CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
			<SmartSelectList
				options={visible}
				totalCount={options.length}
				query={query}
				value={value}
				onPick={pick}
				renderRow={renderRow}
				loading={loading}
				fetching={fetching}
				error={error}
				onRefresh={onRefresh}
				hasMore={hasMore}
				onLoadMore={onLoadMore}
				truncatedNote={truncatedNote}
				emptyText={emptyText}
				noMatchText={noMatchText}
				errorText={errorText}
				groupOrder={groupOrder}
			/>
			<SmartSelectFooter onRefresh={onRefresh} fetching={fetching}>
				{footer}
			</SmartSelectFooter>
		</Command>
	)

	const trigger = (
		<button
			id={id}
			type="button"
			// Not role="combobox": the trigger only opens the surface. The real
			// combobox semantics live on cmdk's input inside it, which owns the
			// listbox and the active-descendant relationship.
			aria-haspopup="dialog"
			aria-expanded={open}
			aria-label={ariaLabel}
			data-invalid={invalid ? "true" : undefined}
			data-empty={selected || value ? undefined : "true"}
			disabled={disabled}
			onClick={() => {
				setOpen(true)
			}}
			className={cn(
				"flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
				"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
				"data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20",
				"disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
				className
			)}
		>
			<span
				className={cn(
					"min-w-0 flex-1 truncate text-left",
					!selected && !value && "text-muted-foreground"
				)}
			>
				{triggerLabel}
			</span>
			<ChevronDown className="size-4 shrink-0 opacity-50" />
		</button>
	)

	// A popover anchored to a narrow trigger has nowhere to go on a phone, and
	// the on-screen keyboard would cover most of it. Below `lg` the same list
	// opens as a bottom sheet instead.
	if (!isDesktop) {
		return (
			<>
				{trigger}
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetContent side="bottom" className="max-h-[85vh] p-0">
						<SheetHeader className="border-b border-border/60 px-4 py-3">
							<SheetTitle className="text-sm">{ariaLabel ?? placeholder}</SheetTitle>
						</SheetHeader>
						{body}
					</SheetContent>
				</Sheet>
			</>
		)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) min-w-72 p-0"
			>
				{body}
			</PopoverContent>
		</Popover>
	)
}
