import { useCallback } from "react"

import { Loader2, Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { Skeleton } from "@datadack/serverless-ui"

import { useSearch, useSearchInput, useSearchNavigation } from "../search.hooks"
import type { SearchResult } from "../search.types"
import { SearchResultGroup } from "./SearchResultGroup"

/* ── Component ─────────────────────────────────────────────────────────── */

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: Readonly<GlobalSearchProps>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { query, setQuery, inputRef } = useSearchInput(open)

  const { data, isLoading, isFetching } = useSearch(query)

  const flatItems = data?.groups.flatMap((g) => g.results) ?? []

  const { selectedId, setSelectedId, handleKeyDown, listRef } = useSearchNavigation(flatItems)

  const handleSelect = useCallback(
    (result: SearchResult) => {
      void navigate(result.path)
      onOpenChange(false)
    },
    [navigate, onOpenChange],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && selectedId) {
        const item = flatItems.find((r) => r.id === selectedId)
        if (item) handleSelect(item)
      }
      handleKeyDown(e)
    },
    [selectedId, flatItems, handleSelect, handleKeyDown],
  )

  const hasQuery = query.trim().length > 0
  const hasResults = (data?.totalCount ?? 0) > 0
  const showEmpty = hasQuery && !isLoading && !hasResults

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[760px] w-full p-0 gap-0 overflow-hidden rounded-2xl"
        style={{
          boxShadow: "var(--card-shadow)",
          border: "1px solid var(--border)",
        }}
        onKeyDown={onKeyDown}
      >
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Search</DialogTitle>

        {/* ── Input ─────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {isFetching && hasQuery ? (
            <Loader2 className="w-[18px] h-[18px] shrink-0 text-muted-foreground animate-spin" />
          ) : (
            <Search className="w-[18px] h-[18px] shrink-0 text-muted-foreground" />
          )}

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
            placeholder={t("nav.search")}
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          {query && (
            <button
              onClick={() => {
                setQuery("")
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Results ───────────────────────────────────────────── */}
        <ScrollArea className="max-h-[440px]">
          <div ref={listRef} className="py-1">
            {/* Loading skeleton */}
            {isLoading && hasQuery && (
              <div className="px-5 py-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick navigation (empty query) */}
            {!isLoading &&
              !hasQuery &&
              data?.groups.map((group, i) => (
                <SearchResultGroup
                  key={group.type}
                  label={group.label}
                  results={group.results}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  onHover={setSelectedId}
                  divided={i > 0}
                />
              ))}

            {/* Search results */}
            {!isLoading && hasQuery && hasResults && (
              <div className="animate-content-enter">
                {data?.groups.map((group, i) => (
                  <SearchResultGroup
                    key={group.type}
                    label={group.label}
                    results={group.results}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    onHover={setSelectedId}
                    divided={i > 0}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 animate-content-enter">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--muted)" }}
                >
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching for a module, VM, VPC, or user
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--bsc-outline)",
          }}
        >
          <div className="flex items-center gap-4 text-[11px]">
            <ShortcutHint keys={["↑", "↓"]} label={t("common.shortcuts.navigate")} />
            <ShortcutHint keys={["↵"]} label={t("common.shortcuts.open")} />
            {hasQuery && <ShortcutHint keys={["Esc"]} label={t("common.shortcuts.close")} />}
          </div>
          {hasQuery && (
            <span className="text-[11px]" style={{ color: "var(--bsc-outline)" }}>
              {data?.totalCount ?? 0} result{(data?.totalCount ?? 0) !== 1 ? "s" : ""}
            </span>
          )}
          {!hasQuery && (
            <span className="text-[11px]" style={{ color: "var(--bsc-outline)" }}>
              {t("common.shortcuts.search")} · ⌘K
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Shortcut hint ─────────────────────────────────────────────────────── */

function ShortcutHint({ keys, label }: Readonly<{ keys: string[]; label: string }>) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="font-mono px-1 py-0.5 rounded text-[10px]"
          style={{
            background: "var(--muted)",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {k}
        </kbd>
      ))}
      <span className="text-[11px]" style={{ color: "var(--bsc-outline)" }}>
        {label}
      </span>
    </span>
  )
}
