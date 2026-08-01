import { useState } from "react"

import { Activity, Crosshair, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
    ConfirmDialog,
    CopyButton,
    DetailPage,
    EmptyState,
    KeyValueGrid,
    Section,
    staggerDelay,
    StatusBadge,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import { TG_ROUTES } from "../target-groups.constants"
import {
    useDeleteTargetGroup,
    useDeregisterTarget,
    useRegisterTarget,
    useTargetGroup,
    useTargets,
} from "../target-groups.hooks"
import type { Target, TargetGroup } from "../target-groups.types"

export function TargetGroupDetailPage() {
    useScreen("target-groups.target-group-detail")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id = "" } = useParams()
    const { data: group, isLoading } = useTargetGroup(id)
    const { mutate: remove, isPending: isDeleting } = useDeleteTargetGroup()
    const [deleteOpen, setDeleteOpen] = useState(false)

    if (isLoading || !group) {
        return (
            <div className="space-y-5">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-80" />
                <Skeleton className="h-72 rounded-xl" />
            </div>
        )
    }

    return (
        <>
            <DetailPage
                backTo={TG_ROUTES.ROOT}
                backLabel={t("targetGroups.title")}
                icon={Crosshair}
                title={group.name}
                id={`TG-${String(group.tenant_serial)}`}
                actions={
                    <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => {
                            setDeleteOpen(true)
                        }}
                    >
                        <Trash2 className="size-3.5" />
                        {t("targetGroups.actions.delete")}
                    </Button>
                }
                tabs={[
                    {
                        value: "targets",
                        label: t("targetGroups.tabs.targets"),
                        icon: Crosshair,
                        content: <TargetsTab group={group} />,
                    },
                    {
                        value: "health",
                        label: t("targetGroups.tabs.healthChecks"),
                        icon: Activity,
                        content: <HealthTab group={group} />,
                    },
                ]}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t("targetGroups.deleteConfirm.title")}
                description={t("targetGroups.deleteConfirm.description", { name: group.name })}
                confirmLabel={t("targetGroups.actions.delete")}
                confirmText={group.name}
                loading={isDeleting}
                onConfirm={() => {
                    remove(group.id, { onSuccess: () => void navigate(TG_ROUTES.ROOT) })
                }}
            />
        </>
    )
}

function HealthTab({ group }: Readonly<{ group: TargetGroup }>) {
    const { t } = useTranslation()
    const isHttp = group.protocol === "HTTP"

    return (
        <Section
            variant="panel"
            title={t("targetGroups.tabs.healthChecks")}
            description={t("targetGroups.health.description")}
        >
            <KeyValueGrid
                columns={3}
                items={[
                    {
                        label: t("targetGroups.columns.algorithm"),
                        value: t(`targetGroups.algorithms.${group.algorithm}`),
                    },
                    {
                        label: t("targetGroups.columns.protocol"),
                        value: `${group.protocol}:${String(group.port)}`,
                        mono: true,
                    },
                    {
                        label: t("targetGroups.health.path"),
                        // A TCP group health-checks by opening a connection —
                        // there is no path to probe.
                        value: isHttp ? group.health_check_path : t("targetGroups.health.tcpCheck"),
                        mono: true,
                    },
                    {
                        label: t("targetGroups.health.interval"),
                        value: `${String(group.health_check_interval_s)}s`,
                    },
                    {
                        label: t("targetGroups.health.healthyThreshold"),
                        value: t("targetGroups.health.checkCount", {
                            count: group.healthy_threshold,
                        }),
                    },
                    {
                        label: t("targetGroups.health.unhealthyThreshold"),
                        value: t("targetGroups.health.checkCount", {
                            count: group.unhealthy_threshold,
                        }),
                    },
                ]}
            />
        </Section>
    )
}

function TargetsTab({ group }: Readonly<{ group: TargetGroup }>) {
    const { t } = useTranslation()
    const { data: targets = [], isLoading } = useTargets(group.id)
    const { data: instances = [] } = useInstances()
    const { mutate: deregister, isPending: isDeregistering } = useDeregisterTarget(group.id)

    const [registerOpen, setRegisterOpen] = useState(false)
    const [pendingRemove, setPendingRemove] = useState<Target | null>(null)

    if (isLoading) return <Skeleton className="h-48 rounded-xl" />

    return (
        <>
            <Section
                variant="panel"
                title={t("targetGroups.tabs.targets")}
                description={t("targetGroups.targets.description")}
                actions={
                    <Button
                        size="sm"
                        variant="gold"
                        className="gap-1.5"
                        onClick={() => {
                            setRegisterOpen(true)
                        }}
                    >
                        <Plus className="size-3.5" />
                        {t("targetGroups.targets.register")}
                    </Button>
                }
            >
                {targets.length === 0 ? (
                    <EmptyState
                        icon={Crosshair}
                        title={t("targetGroups.targets.empty")}
                        description={t("targetGroups.targets.emptySubtitle")}
                    />
                ) : (
                    <div className="glass-1 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    {[
                                        t("targetGroups.targets.instance"),
                                        t("targetGroups.targets.privateIp"),
                                        t("targetGroups.targets.port"),
                                        t("targetGroups.targets.health"),
                                        "",
                                    ].map((header, i) => (
                                        <TableHead
                                            key={header || `actions-${String(i)}`}
                                            className="px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                                        >
                                            {header}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {targets.map((target, index) => {
                                    const instance = instances.find(
                                        (i) => i.id === target.instance_id,
                                    )
                                    return (
                                        <TableRow
                                            key={target.id}
                                            className="animate-content-enter"
                                            style={staggerDelay(index)}
                                        >
                                            <TableCell className="px-3">
                                                {instance ? (
                                                    <Link
                                                        to={VMS_ROUTES.detail(instance.id)}
                                                        className="font-mono text-[13px] text-status-info hover:underline"
                                                    >
                                                        {instance.name}
                                                    </Link>
                                                ) : (
                                                    <CopyButton value={target.instance_id} />
                                                )}
                                            </TableCell>
                                            <TableCell className="px-3 font-mono text-[13px] text-muted-foreground">
                                                {instance?.private_ip ?? "—"}
                                            </TableCell>
                                            <TableCell className="px-3 font-mono text-[13px]">
                                                {target.port}
                                            </TableCell>
                                            <TableCell className="px-3">
                                                <StatusBadge
                                                    status={target.health_status}
                                                    pulse={target.health_status === "healthy"}
                                                />
                                            </TableCell>
                                            <TableCell className="px-3 text-right">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={t("targetGroups.targets.deregister")}
                                                    onClick={() => {
                                                        setPendingRemove(target)
                                                    }}
                                                >
                                                    <Trash2 className="size-3.5 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Section>

            <RegisterTargetDialog
                group={group}
                registered={targets}
                open={registerOpen}
                onOpenChange={setRegisterOpen}
            />

            <ConfirmDialog
                open={!!pendingRemove}
                onOpenChange={(open) => {
                    if (!open) setPendingRemove(null)
                }}
                title={t("targetGroups.targets.deregisterConfirm.title")}
                description={t("targetGroups.targets.deregisterConfirm.description")}
                confirmLabel={t("targetGroups.targets.deregister")}
                loading={isDeregistering}
                onConfirm={() => {
                    if (pendingRemove) {
                        deregister(pendingRemove.id, {
                            onSuccess: () => {
                                setPendingRemove(null)
                            },
                        })
                    }
                }}
            />
        </>
    )
}

function RegisterTargetDialog({
    group,
    registered,
    open,
    onOpenChange,
}: Readonly<{
    group: TargetGroup
    registered: Target[]
    open: boolean
    onOpenChange: (open: boolean) => void
}>) {
    const { t } = useTranslation()
    const { data: instances = [] } = useInstances()
    const { mutate: register, isPending } = useRegisterTarget(group.id)

    const [instanceId, setInstanceId] = useState("")
    const [port, setPort] = useState("")

    const alreadyRegistered = new Set(registered.map((r) => r.instance_id))

    /**
     * An instance is only reachable from the load balancer over the VPC's
     * private network, so one without a private IP cannot be a target — the API
     * returns 400. Rather than let someone pick it and eat the error, such
     * instances are listed but disabled, with the reason shown.
     */
    const candidates = instances.filter((i) => !alreadyRegistered.has(i.id))

    const portNum = port === "" ? group.port : Number(port)
    const valid =
        !!instanceId && Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535

    const submit = () => {
        register(
            { instance_id: instanceId, port: portNum },
            {
                onSuccess: () => {
                    setInstanceId("")
                    setPort("")
                    onOpenChange(false)
                },
            },
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("targetGroups.targets.register")}</DialogTitle>
                    <DialogDescription>
                        {t("targetGroups.targets.registerDescription")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("targetGroups.targets.instance")}
                        </Label>
                        <Select value={instanceId} onValueChange={setInstanceId}>
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t("targetGroups.targets.instancePlaceholder")}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {candidates.map((instance) => (
                                    <SelectItem
                                        key={instance.id}
                                        value={instance.id}
                                        disabled={!instance.private_ip}
                                    >
                                        {instance.name}
                                        {instance.private_ip
                                            ? ` · ${instance.private_ip}`
                                            : ` · ${t("targetGroups.targets.noPrivateIp")}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            {t("targetGroups.targets.privateIpHint")}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("targetGroups.targets.port")}
                        </Label>
                        <Input
                            value={port}
                            onChange={(e) => {
                                setPort(e.target.value)
                            }}
                            inputMode="numeric"
                            placeholder={String(group.port)}
                            className="font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {t("targetGroups.targets.portHint", { port: group.port })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            onOpenChange(false)
                        }}
                    >
                        {t("console.wizard.cancel")}
                    </Button>
                    <Button variant="gold" disabled={!valid || isPending} onClick={submit}>
                        {isPending
                            ? t("targetGroups.targets.registering")
                            : t("targetGroups.targets.register")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
