import { useMemo, useState } from "react"
import { useScreen } from "@/services/api/screen"

import type { ColumnDef } from "@tanstack/react-table"
import { KeyRound, RefreshCw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EmptyState, PageHeader, ResourceTable, textColumn } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { usePermissions } from "../iam.hooks"
import type { Permission } from "../iam.types"

export function PermissionsCatalogPage() {
    useScreen("iam.permissions-catalog")
    const { t } = useTranslation()
    const { data: permissions = [], isLoading, isError, refetch, isFetching } = usePermissions()
    const [query, setQuery] = useState("")

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return permissions
        return permissions.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.resource.toLowerCase().includes(q)
        )
    }, [permissions, query])

    const columns = useMemo<ColumnDef<Permission>[]>(
        () => [
            textColumn<Permission>({
                id: "name",
                header: t("iam.permissions.columns.action"),
                accessor: (p) => p.name,
                mono: true,
            }),
            textColumn<Permission>({
                id: "service",
                header: t("iam.permissions.columns.service"),
                accessor: (p) => p.service ?? "—",
                responsive: "md",
            }),
            textColumn<Permission>({
                id: "description",
                header: t("iam.columns.description"),
                accessor: (p) => p.description,
                muted: true,
                responsive: "lg",
            }),
        ],
        [t]
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={KeyRound}
                breadcrumbs={[
                    { label: t("console.nav.groups.iam") },
                    { label: t("iam.permissions.title") },
                ]}
                title={t("iam.permissions.title")}
                description={t("iam.permissions.subtitle")}
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
                    placeholder={t("iam.permissions.search")}
                    className="pl-9 font-mono text-[13px]"
                />
            </div>

            <ResourceTable<Permission>
                data={filtered}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(p) => p.id}
                emptyState={
                    <EmptyState
                        icon={KeyRound}
                        title={t("iam.permissions.empty")}
                        description={t("iam.permissions.emptySubtitle")}
                    />
                }
            />
        </div>
    )
}
