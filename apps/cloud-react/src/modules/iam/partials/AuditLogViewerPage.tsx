import { useMemo, useState } from "react"
import { useScreen } from "@/services/api/screen"

import type { ColumnDef } from "@tanstack/react-table"
import { RefreshCw, ScrollText, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { dateColumn, EmptyState, PageHeader, ResourceTable, textColumn } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useAuditLogs } from "../iam.hooks"
import type { AuditLog } from "../iam.types"

function decision(log: AuditLog): string {
    try {
        const meta = JSON.parse(log.metadata) as { decision?: string }
        return meta.decision ?? ""
    } catch {
        return ""
    }
}

export function AuditLogViewerPage() {
    useScreen("iam.audit-log-viewer")
    const { t } = useTranslation()
    const { data: logs = [], isLoading, isError, refetch, isFetching } = useAuditLogs()
    const [query, setQuery] = useState("")

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return logs
        return logs.filter(
            (l) =>
                l.action.toLowerCase().includes(q) ||
                l.resource_urn.toLowerCase().includes(q) ||
                l.service.toLowerCase().includes(q)
        )
    }, [logs, query])

    const columns = useMemo<ColumnDef<AuditLog>[]>(
        () => [
            dateColumn<AuditLog>({
                header: t("iam.audit.columns.time"),
                accessor: (l) => l.created_at,
            }),
            textColumn<AuditLog>({
                id: "action",
                header: t("iam.audit.columns.action"),
                accessor: (l) => l.action,
                mono: true,
            }),
            {
                id: "decision",
                header: () => t("iam.audit.columns.decision"),
                enableSorting: false,
                cell: ({ row }) => {
                    const d = decision(row.original)
                    if (!d) return <span className="text-muted-foreground">—</span>
                    return (
                        <span
                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${
                                d === "deny"
                                    ? "text-destructive border-destructive/30 bg-destructive/10"
                                    : "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                            }`}
                        >
                            {d}
                        </span>
                    )
                },
            },
            textColumn<AuditLog>({
                id: "resource",
                header: t("iam.audit.columns.resource"),
                accessor: (l) => l.resource_urn || "—",
                muted: true,
                responsive: "md",
            }),
            textColumn<AuditLog>({
                id: "actor",
                header: t("iam.audit.columns.actor"),
                accessor: (l) => (l.actor_id ? `#${String(l.actor_id)}` : "system"),
                responsive: "lg",
            }),
            textColumn<AuditLog>({
                id: "ip",
                header: t("iam.audit.columns.ip"),
                accessor: (l) => l.ip_address || "—",
                mono: true,
                responsive: "lg",
            }),
        ],
        [t]
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={ScrollText}
                breadcrumbs={[
                    { label: t("console.nav.groups.iam") },
                    { label: t("iam.audit.title") },
                ]}
                title={t("iam.audit.title")}
                description={t("iam.audit.subtitle")}
                actions={
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                        aria-label={t("common.refresh")}
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                    </Button>
                }
            />

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                    }}
                    placeholder={t("iam.audit.search")}
                    className="pl-9 font-mono text-[13px]"
                />
            </div>

            <ResourceTable<AuditLog>
                data={filtered}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(l) => l.id}
                emptyState={
                    <EmptyState
                        icon={ScrollText}
                        title={t("iam.audit.empty")}
                        description={t("iam.audit.emptySubtitle")}
                    />
                }
            />
        </div>
    )
}
