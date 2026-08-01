import { useState } from "react"

import { ExternalLink, Loader2, Plus, Unlink } from "lucide-react"

import { ConfirmDialog } from "@/components/console"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

import { GitHubMark } from "../../components/GitHubMark"
import { GITHUB_INSTALLATIONS_URL } from "../../managed-apps.constants"
import {
    useDeleteGitHubConnection,
    useGitHubConnections,
    useGitHubInstallUrl,
} from "../../managed-apps.hooks"
import type { GitHubConnection } from "../../managed-apps.types"

interface GitHubConnectionsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Managing which GitHub accounts this platform can reach.
 *
 * This capability existed only inside the old create wizard. When that was
 * replaced, connecting was rebuilt into the composer but REMOVING was not, so
 * `useDeleteGitHubConnection` had no caller anywhere in the app — a connection
 * could be added and never taken away. This restores it as a surface of its
 * own, reachable whether or not you are creating a project.
 */
export function GitHubConnectionsDialog({
    open,
    onOpenChange,
}: Readonly<GitHubConnectionsDialogProps>) {
    const { data: connections = [], isLoading } = useGitHubConnections()
    const installUrl = useGitHubInstallUrl()
    const remove = useDeleteGitHubConnection()

    const [target, setTarget] = useState<GitHubConnection | null>(null)
    // Removing the link and uninstalling the app are genuinely different acts:
    // the first stops us using it, the second revokes our access at GitHub.
    const [uninstall, setUninstall] = useState(false)

    const connect = () => {
        installUrl.mutate(undefined, {
            onSuccess: ({ url }) => {
                window.location.assign(url)
            },
        })
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>GitHub connections</DialogTitle>
                        <DialogDescription>
                            Accounts and organisations this platform can read repositories from.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        {isLoading && <Skeleton className="h-16 rounded-lg" />}

                        {!isLoading && connections.length === 0 && (
                            <p className="py-6 text-center text-[13px] text-muted-foreground">
                                No GitHub account is connected yet.
                            </p>
                        )}

                        {connections.map((connection) => (
                            <div
                                key={connection.installation_id}
                                className="flex items-center gap-3 rounded-lg border border-border/60 p-3"
                            >
                                <img
                                    src={`https://github.com/${connection.github_login}.png?size=64`}
                                    alt=""
                                    loading="lazy"
                                    className="size-8 rounded-full bg-muted ring-1 ring-border/50"
                                    onError={(event) => {
                                        event.currentTarget.style.visibility = "hidden"
                                    }}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-semibold">
                                        {connection.github_login}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        {connection.target_type || "Account"} · installation #
                                        {String(connection.installation_id)}
                                    </p>
                                </div>
                                {connection.revoked && (
                                    <Badge
                                        variant="outline"
                                        className="shrink-0 text-[10px] text-status-danger"
                                    >
                                        Revoked
                                    </Badge>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove ${connection.github_login}`}
                                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                        setTarget(connection)
                                    }}
                                >
                                    <Unlink className="size-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                        <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={installUrl.isPending}
                            onClick={connect}
                        >
                            {installUrl.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Plus className="size-3.5" />
                            )}
                            Connect an account
                        </Button>
                        <Button size="sm" variant="ghost" asChild className="gap-1.5">
                            <a href={GITHUB_INSTALLATIONS_URL} target="_blank" rel="noreferrer">
                                <GitHubMark className="size-3.5" />
                                Manage repository access
                                <ExternalLink className="size-3" />
                            </a>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={target !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setTarget(null)
                        setUninstall(false)
                    }
                }}
                title="Remove GitHub connection?"
                confirmLabel={uninstall ? "Remove & uninstall" : "Remove"}
                loading={remove.isPending}
                onConfirm={() => {
                    if (!target) return
                    remove.mutate(
                        { installationId: target.installation_id, uninstall },
                        {
                            onSuccess: () => {
                                setTarget(null)
                                setUninstall(false)
                            },
                        }
                    )
                }}
                description={
                    <span className="block space-y-3">
                        <span className="block">
                            {target?.github_login} will be unlinked. Existing projects keep their
                            artifacts and history, but they can no longer pull new commits or build
                            from this installation.
                        </span>
                        <Label className="flex cursor-pointer items-start gap-2 text-[13px] font-normal">
                            <Checkbox
                                checked={uninstall}
                                onCheckedChange={(checked) => {
                                    setUninstall(checked === true)
                                }}
                                className="mt-0.5"
                            />
                            <span>
                                Also uninstall the app from{" "}
                                <span className="font-semibold">
                                    {target?.github_login ?? "GitHub"}
                                </span>{" "}
                                — revokes our repository access entirely
                            </span>
                        </Label>
                    </span>
                }
            />
        </>
    )
}
