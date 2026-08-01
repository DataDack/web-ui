import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { FileText, Lock, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
    actionsColumn,
    ConfirmDialog,
    dateColumn,
    EmptyState,
    nameColumn,
    PageHeader,
    ResourceTable,
    textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useScreen } from "@/services/api/screen"

import { IAM_ROUTES } from "../iam.constants"
import { useDeleteIAMPolicy, useIAMPolicies } from "../iam.hooks"
import type { IAMPolicy } from "../iam.types"

export function PoliciesListPage() {
    useScreen("iam.policies-list")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data: policies = [], isLoading, isError, refetch, isFetching } = useIAMPolicies()
    const { mutate: deletePolicy, isPending: isDeleting } = useDeleteIAMPolicy()

    const [toDelete, setToDelete] = useState<IAMPolicy | null>(null)

    const system = useMemo(() => policies.filter((p) => p.is_managed), [policies])
    const organization = useMemo(() => policies.filter((p) => !p.is_managed), [policies])

    // System (managed) policies are read-only — no delete action.
    const systemColumns = useMemo<ColumnDef<IAMPolicy>[]>(
        () => [
            nameColumn<IAMPolicy>({ header: t("iam.columns.name"), accessor: (p) => p.name }),
            textColumn<IAMPolicy>({
                id: "description",
                header: t("iam.columns.description"),
                accessor: (p) => p.description,
                muted: true,
                responsive: "md",
            }),
            dateColumn<IAMPolicy>({
                header: t("common.updated"),
                accessor: (p) => p.updated_at,
                responsive: "lg",
            }),
        ],
        [t]
    )

    const orgColumns = useMemo<ColumnDef<IAMPolicy>[]>(
        () => [
            ...systemColumns,
            actionsColumn<IAMPolicy>({
                ariaLabel: t("console.table.actions"),
                actions: () => [
                    {
                        label: t("iam.actions.deletePolicy"),
                        icon: Trash2,
                        destructive: true,
                        onAction: (p: IAMPolicy) => {
                            setToDelete(p)
                        },
                    },
                ],
            }),
        ],
        [t, systemColumns]
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={FileText}
                breadcrumbs={[
                    { label: t("console.nav.groups.iam") },
                    { label: t("iam.policies.title") },
                ]}
                title={t("iam.policies.title")}
                description={t("iam.policies.subtitle")}
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
                        <Button
                            className="gap-2"
                            onClick={() => void navigate(IAM_ROUTES.POLICY_NEW)}
                        >
                            <Plus className="w-4 h-4" />
                            {t("iam.policies.create")}
                        </Button>
                    </>
                }
            />

            <Tabs defaultValue="organization" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="organization">
                        {t("iam.policies.tabs.organization")}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                            {organization.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="system" className="gap-1.5">
                        <Lock className="size-3" />
                        {t("iam.policies.tabs.system")}
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                            {system.length}
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="organization">
                    <ResourceTable<IAMPolicy>
                        data={organization}
                        columns={orgColumns}
                        isLoading={isLoading}
                        isError={isError}
                        onRetry={() => void refetch()}
                        getRowId={(policy) => policy.id}
                        onRowClick={(policy) => void navigate(IAM_ROUTES.policyDetail(policy.id))}
                        emptyState={
                            <EmptyState
                                icon={FileText}
                                title={t("iam.policies.orgEmpty")}
                                description={t("iam.policies.orgEmptySubtitle")}
                                action={{
                                    label: t("iam.policies.create"),
                                    onClick: () => void navigate(IAM_ROUTES.POLICY_NEW),
                                }}
                            />
                        }
                    />
                </TabsContent>

                <TabsContent value="system">
                    <p className="text-[12px] text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Lock className="size-3" />
                        {t("iam.policies.systemHint")}
                    </p>
                    <ResourceTable<IAMPolicy>
                        data={system}
                        columns={systemColumns}
                        isLoading={isLoading}
                        isError={isError}
                        onRetry={() => void refetch()}
                        getRowId={(policy) => policy.id}
                        onRowClick={(policy) => void navigate(IAM_ROUTES.policyDetail(policy.id))}
                        emptyState={
                            <EmptyState
                                icon={FileText}
                                title={t("iam.policies.systemEmpty")}
                                description={t("iam.policies.systemEmptySubtitle")}
                            />
                        }
                    />
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => {
                    if (!open) setToDelete(null)
                }}
                title={t("iam.policies.deleteConfirm.title")}
                description={t("iam.policies.deleteConfirm.description", {
                    name: toDelete?.name ?? "",
                })}
                confirmLabel={t("iam.actions.deletePolicy")}
                loading={isDeleting}
                onConfirm={() => {
                    if (!toDelete) return
                    deletePolicy(toDelete.id, {
                        onSuccess: () => {
                            setToDelete(null)
                        },
                    })
                }}
            />
        </div>
    )
}
