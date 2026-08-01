import { useMemo, useState } from "react"

import { Database, Flame, RefreshCw, ShieldAlert, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, EmptyState, PageHeader, StatGrid } from "@/components/console"
import { Button } from "@/components/ui/button"
import { useScreen } from "@/services/api/screen"

import { Skeleton } from "@datadack/common-ui"

import { EMPTY_SELECTION, summarize, toggle, toggleGroup, type Selection } from "./cache-selection"
import { ClearBar } from "./ClearBar"
import { CustomPatternCard } from "./CustomPatternCard"
import { ModuleCard } from "./ModuleCard"
import { useCacheNamespaces, useClearCache } from "../../superadmin.hooks"
import type { CacheNamespaceGroup, ClearCacheRequest } from "../../superadmin.types"

// Burst Cache — the super-admin console for Redis. Every way the cache can be
// cleared lives here, coarse to fine:
//
//   • one namespace          a single key family, e.g. "Price books"
//   • several namespaces     any combination, across any modules
//   • a whole module         select-all on the module header
//   • a raw glob             the custom-pattern escape hatch
//   • namespaces + globs     both compose into one request
//   • the entire logical DB  the danger zone, behind a typed confirmation
//
// The registry, its labels and its blast-radius flags all come from the backend
// (GET /platform/cache/namespaces), so this page never hard-codes a key prefix.
export function CachePage() {
  useScreen("superadmin.cache")
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch, isFetching } = useCacheNamespaces()
  const clearCache = useClearCache()

  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION)
  const [patterns, setPatterns] = useState<string[]>([])
  const [confirming, setConfirming] = useState<ClearCacheRequest | null>(null)
  const [flushOpen, setFlushOpen] = useState(false)

  const groups = useMemo(() => data?.groups ?? [], [data])
  const summary = useMemo(() => summarize(groups, selection), [groups, selection])
  const pending = clearCache.isPending

  const run = (payload: ClearCacheRequest) => {
    clearCache.mutate(payload, {
      onSuccess: () => {
        // Only drop the selection once the server confirms; on failure it
        // stays put so a retry doesn't mean re-ticking every box.
        setSelection(EMPTY_SELECTION)
        setPatterns([])
        setConfirming(null)
        setFlushOpen(false)
      },
    })
  }

  // A clear that touches only "safe" namespaces is a cold read at worst, so it
  // runs straight away. Anything that destroys Redis-only state — live sign-in
  // codes, pending handshakes — stops for a confirmation first, as does a raw
  // glob, whose reach the registry cannot vouch for.
  const requestClear = (payload: ClearCacheRequest) => {
    const named = summarize(groups, new Set(payload.namespaces ?? []))
    const risky = named.disruptive.length > 0 || (payload.patterns?.length ?? 0) > 0
    if (risky) setConfirming(payload)
    else run(payload)
  }

  const clearSelected = () => {
    requestClear({
      namespaces: [...selection],
      ...(patterns.length > 0 && { patterns }),
    })
  }

  const clearGroup = (group: CacheNamespaceGroup) => {
    requestClear({ namespaces: group.namespaces.map((ns) => ns.key) })
  }

  const confirmingSummary = summarize(groups, new Set(confirming?.namespaces ?? []))
  const hasSelection = selection.size > 0 || patterns.length > 0

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        icon={Flame}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.cache.title") }]}
        title={t("superAdmin.cache.title")}
        description={t("superAdmin.cache.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            {/* FLUSHDB is the one action here that cannot be scoped. It
						    still sits behind a typed confirmation, so promoting it to
						    the header costs reach, not safety. */}
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => {
                setFlushOpen(true)
              }}
              disabled={pending || isLoading}
            >
              <Flame className="w-4 h-4" />
              {t("superAdmin.cache.flush.action")}
            </Button>
          </>
        }
      />

      <StatGrid
        stats={[
          {
            label: t("superAdmin.cache.stats.totalKeys"),
            value: data?.keys ?? 0,
            icon: Database,
            loading: isLoading,
          },
          {
            label: t("superAdmin.cache.stats.namespaces"),
            value: groups.reduce((n, g) => n + g.namespaces.length, 0),
            icon: Trash2,
            loading: isLoading,
          },
          {
            label: t("superAdmin.cache.stats.selected"),
            value: selection.size,
            icon: Flame,
            color: selection.size > 0 ? "info" : "default",
          },
          {
            label: t("superAdmin.cache.stats.disruptive"),
            value: summary.disruptive.length,
            icon: ShieldAlert,
            color: summary.disruptive.length > 0 ? "warning" : "default",
          },
        ]}
      />

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {isError && (
        <EmptyState
          icon={Database}
          title={t("superAdmin.cache.loadFailed")}
          description={t("superAdmin.cache.loadFailedSubtitle")}
          action={{ label: t("common.refresh"), onClick: () => void refetch() }}
        />
      )}

      {!isLoading && !isError && (
        <>
          <div className="space-y-3">
            {groups.map((group) => (
              <ModuleCard
                key={group.module}
                group={group}
                selection={selection}
                onToggleNamespace={(key) => {
                  setSelection((s) => toggle(s, key))
                }}
                onToggleGroup={(g) => {
                  setSelection((s) => toggleGroup(s, g))
                }}
                onClearGroup={clearGroup}
                disabled={pending}
              />
            ))}
          </div>

          <CustomPatternCard patterns={patterns} onChange={setPatterns} disabled={pending} />

          {hasSelection && (
            <ClearBar
              namespaceCount={selection.size}
              patternCount={patterns.length}
              keys={summary.keys}
              disruptiveCount={summary.disruptive.length}
              pending={pending}
              onClear={clearSelected}
              onReset={() => {
                setSelection(EMPTY_SELECTION)
                setPatterns([])
              }}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
        title={t("superAdmin.cache.confirm.title")}
        description={
          <div className="space-y-2 text-[13px]">
            <p>
              {t("superAdmin.cache.confirm.body", {
                count: confirming?.namespaces?.length ?? 0,
              })}
            </p>
            {confirmingSummary.disruptive.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-amber-600 dark:text-amber-400">
                {confirmingSummary.disruptive.map((ns) => (
                  <li key={ns.key}>
                    <span className="font-medium">{ns.label}</span> — {ns.description}
                  </li>
                ))}
              </ul>
            )}
            {(confirming?.patterns?.length ?? 0) > 0 && (
              <p className="text-muted-foreground">
                {t("superAdmin.cache.confirm.patterns", {
                  patterns: confirming?.patterns?.join(", "),
                })}
              </p>
            )}
          </div>
        }
        confirmLabel={t("superAdmin.cache.clearSelected")}
        loading={pending}
        onConfirm={() => {
          if (confirming) run(confirming)
        }}
      />

      <ConfirmDialog
        open={flushOpen}
        onOpenChange={setFlushOpen}
        title={t("superAdmin.cache.flush.confirmTitle")}
        // The dialog now carries the full explanation: with the button in
        // the header there is no danger-zone panel left to read first.
        description={
          <div className="space-y-2 text-[13px]">
            <p>{t("superAdmin.cache.flush.confirmBody", { count: data?.keys ?? 0 })}</p>
            <p className="text-muted-foreground">{t("superAdmin.cache.flush.subtitle")}</p>
          </div>
        }
        // Typed confirmation: a full flush is the one action on this page
        // with no scope at all, so it should not be reachable by reflex.
        confirmText="FLUSH"
        confirmLabel={t("superAdmin.cache.flush.action")}
        loading={pending}
        onConfirm={() => {
          run({ all: true })
        }}
      />
    </div>
  )
}
