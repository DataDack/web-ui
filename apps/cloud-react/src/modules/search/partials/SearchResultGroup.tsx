import type { SearchResult } from "../search.types"
import { SearchResultItem } from "./SearchResultItem"

interface SearchResultGroupProps {
    label: string
    results: SearchResult[]
    selectedId: string | null
    onSelect: (result: SearchResult) => void
    onHover: (id: string) => void
    /** Hairline separator above the group (omit for the first group). */
    divided?: boolean
}

export function SearchResultGroup({
    label,
    results,
    selectedId,
    onSelect,
    onHover,
    divided = false,
}: Readonly<SearchResultGroupProps>) {
    return (
        <div
            className="py-1.5"
            style={divided ? { borderTop: "1px solid var(--border)" } : undefined}
        >
            <div
                className="px-5 pt-2 pb-1 text-[11px] font-medium tracking-wide uppercase"
                style={{ color: "var(--bsc-outline)" }}
            >
                {label}
            </div>
            {results.map((result) => (
                <SearchResultItem
                    key={result.id}
                    result={result}
                    isSelected={result.id === selectedId}
                    onSelect={onSelect}
                    onHover={onHover}
                />
            ))}
        </div>
    )
}
