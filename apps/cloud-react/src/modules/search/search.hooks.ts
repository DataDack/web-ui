import { useCallback, useEffect, useRef, useState } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useDebounce } from "@/hooks/use-debounce"

import { SEARCH_DEBOUNCE_MS, SEARCH_QUERY_KEYS } from "./search.constants"
import { searchService } from "./search.service"
import type { SearchResult } from "./search.types"

/* ── useSearch ─────────────────────────────────────────────────────────── */

export function useSearch(query: string) {
    const debounced = useDebounce(query, SEARCH_DEBOUNCE_MS)
    return useQuery({
        queryKey: SEARCH_QUERY_KEYS.results(debounced),
        queryFn: () => searchService.search(debounced),
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        placeholderData: keepPreviousData,
    })
}

/* ── useSearchNavigation ───────────────────────────────────────────────── */

export function useSearchNavigation(flatItems: SearchResult[]) {
    const [manualSelectedId, setSelectedId] = useState<string | null>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Derive selection at render: keep the manual selection while it exists in
    // the current items, otherwise fall back to the first item
    const selectedId =
        manualSelectedId !== null && flatItems.some((i) => i.id === manualSelectedId)
            ? manualSelectedId
            : (flatItems[0]?.id ?? null)

    // Scroll selected item into view
    useEffect(() => {
        if (!selectedId || !listRef.current) return
        const el = listRef.current.querySelector(`[data-result-id="${selectedId}"]`)
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }, [selectedId])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const idx = flatItems.findIndex((i) => i.id === selectedId)
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setSelectedId(flatItems[Math.min(idx + 1, flatItems.length - 1)]?.id ?? null)
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setSelectedId(flatItems[Math.max(idx - 1, 0)]?.id ?? null)
            }
        },
        [flatItems, selectedId]
    )

    return { selectedId, setSelectedId, handleKeyDown, listRef }
}

/* ── useSearchInput ────────────────────────────────────────────────────── */

export function useSearchInput(open: boolean) {
    const [query, setQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setQuery("")
            const t = setTimeout(() => inputRef.current?.focus(), 30)
            return () => {
                clearTimeout(t)
            }
        }
    }, [open])

    return { query, setQuery, inputRef }
}
