import { useMemo, useState } from "react"
import { useScreen } from "@/services/api/screen"

import type { ColumnDef } from "@tanstack/react-table"
import { KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
    actionsColumn,
    ConfirmDialog,
    copyColumn,
    dateColumn,
    EmptyState,
    nameColumn,
    PageHeader,
    ResourceTable,
} from "@/components/console"
import { Button } from "@/components/ui/button"

import { SSH_KEYS_ROUTES } from "../ssh-keys.constants"
import { useDeleteSSHKey, useSSHKeys } from "../ssh-keys.hooks"
import type { SSHKey } from "../ssh-keys.types"

export function SshKeysListPage() {
    useScreen("ssh-keys.ssh-keys-list")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data: keys = [], isLoading, isError, refetch, isFetching } = useSSHKeys()
    const { mutate: deleteKey, isPending: isDeleting } = useDeleteSSHKey()

    const [keyToDelete, setKeyToDelete] = useState<SSHKey | null>(null)
    const goToCreate = () => void navigate(SSH_KEYS_ROUTES.CREATE)

    const columns = useMemo<ColumnDef<SSHKey>[]>(
        () => [
            copyColumn<SSHKey>({
                id: "id",
                header: "ID",
                accessor: (k) => `KEY-${k.tenant_serial}`,
                responsive: "lg",
            }),
            nameColumn<SSHKey>({ header: t("sshKeys.columns.name"), accessor: (k) => k.name }),
            copyColumn<SSHKey>({
                id: "fingerprint",
                header: t("sshKeys.columns.fingerprint"),
                accessor: (k) => k.fingerprint,
                responsive: "md",
            }),
            textColumnType(t),
            dateColumn<SSHKey>({
                header: t("common.created"),
                accessor: (k) => k.created_at,
                responsive: "lg",
            }),
            actionsColumn<SSHKey>({
                ariaLabel: t("console.table.actions"),
                actions: (key) => [
                    {
                        label: t("sshKeys.actions.delete"),
                        icon: Trash2,
                        destructive: true,
                        onAction: () => { setKeyToDelete(key); },
                    },
                ],
            }),
        ],
        [t]
    )

    return (
        <div>
            <PageHeader
                icon={KeyRound}
                breadcrumbs={[
                    { label: t("console.nav.groups.compute") },
                    { label: t("sshKeys.title") },
                ]}
                title={t("sshKeys.title")}
                description={t("sshKeys.subtitle")}
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
                        <Button className="gap-2" onClick={goToCreate}>
                            <Plus className="w-4 h-4" />
                            {t("sshKeys.form.add")}
                        </Button>
                    </>
                }
            />

            <ResourceTable<SSHKey>
                data={keys}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(key) => key.id}
                emptyState={
                    <EmptyState
                        icon={KeyRound}
                        title={t("sshKeys.empty")}
                        description={t("sshKeys.emptySubtitle")}
                        action={{
                            label: t("sshKeys.form.add"),
                            onClick: goToCreate,
                        }}
                    />
                }
            />

            <ConfirmDialog
                open={!!keyToDelete}
                onOpenChange={(open) => {
                    if (!open) setKeyToDelete(null)
                }}
                title={t("sshKeys.deleteConfirm.title")}
                description={t("sshKeys.deleteConfirm.description", {
                    name: keyToDelete?.name ?? "",
                })}
                confirmLabel={t("sshKeys.actions.delete")}
                loading={isDeleting}
                onConfirm={() => {
                    if (!keyToDelete) return
                    deleteKey(keyToDelete.id, { onSuccess: () => { setKeyToDelete(null); } })
                }}
            />
        </div>
    )
}

// Key type chip derived from the public key prefix
function textColumnType(t: (key: string) => string): ColumnDef<SSHKey> {
    return {
        id: "type",
        header: () => t("sshKeys.columns.type"),
        enableSorting: false,
        meta: { responsive: "lg" },
        cell: ({ row }) => (
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border-glass bg-muted/50 text-muted-foreground">
                {row.original.public_key.split(" ")[0]}
            </span>
        ),
    }
}
