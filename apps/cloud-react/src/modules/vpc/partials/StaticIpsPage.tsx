import { useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Globe, Link2, Plus, RefreshCw, Search, Trash2, Unlink } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { z } from "zod/v4"

import {
    actionsColumn,
    ConfirmDialog,
    copyColumn,
    EmptyState,
    PageHeader,
    ResourceTable,
    StatGrid,
    statusColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import {
    useAssignStaticIP,
    useRegions,
    useReleaseStaticIP,
    useReserveStaticIP,
    useStaticIPs,
    useUnassignStaticIP,
} from "../vpc.hooks"
import type { StaticIP } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"

/* ── Reserve dialog ────────────────────────────────────────────────────── */

const makeReserveSchema = (rule: NamingRule) =>
    z.object({
        name: namingNameSchema(rule),
        region: z.string().min(1, "Required"),
    })

type ReserveValues = z.infer<ReturnType<typeof makeReserveSchema>>

function ReserveIpDialog({
    open,
    onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
    const { t } = useTranslation()
    const { mutate: reserve, isPending } = useReserveStaticIP()
    const { data: regions = [] } = useRegions()
    const { rule } = useNamingRule("static-ip")
    const reserveSchema = useMemo(() => makeReserveSchema(rule), [rule])
    const quotaBlocked = useQuotaBlocked("vpc.static_ips")

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<ReserveValues>({
        resolver: zodResolver(reserveSchema),
        defaultValues: { name: "", region: "" },
    })

    const close = () => {
        reset()
        onOpenChange(false)
    }

    const onSubmit = (values: ReserveValues) => {
        reserve(values, { onSuccess: close })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md glass-3">
                <DialogHeader>
                    <DialogTitle>{t("staticIps.reserveForm.title")}</DialogTitle>
                    <DialogDescription>{t("staticIps.reserveForm.description")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
                    <QuotaNotice code="vpc.static_ips" />
                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL_CLASS}>
                            {t("staticIps.reserveForm.name")}
                            <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input {...register("name")} placeholder="my-ip" className="font-mono" />
                        {errors.name && (
                            <p className="text-[11px] text-destructive">{errors.name.message}</p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label className={FIELD_LABEL_CLASS}>
                            {t("staticIps.reserveForm.region")}
                            <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Select
                            value={watch("region")}
                            disabled={regions.length === 0}
                            onValueChange={(value) => {
                                setValue("region", value, { shouldValidate: true })
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t("staticIps.reserveForm.regionPlaceholder")}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map((r) => (
                                    <SelectItem key={r.code} value={r.code}>
                                        {r.code} — {r.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={close}>
                            {t("console.wizard.cancel")}
                        </Button>
                        <Button type="submit" variant="gold" disabled={isPending || quotaBlocked}>
                            {isPending
                                ? t("staticIps.reserveForm.submitting")
                                : t("staticIps.reserveForm.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/* ── Assign dialog ─────────────────────────────────────────────────────── */

function AssignIpDialog({
    ip,
    onOpenChange,
}: Readonly<{ ip: StaticIP | null; onOpenChange: (open: boolean) => void }>) {
    const { t } = useTranslation()
    const { data: instances = [] } = useInstances()
    const { mutate: assign, isPending } = useAssignStaticIP()
    const [instanceId, setInstanceId] = useState("")

    const runningInstances = instances.filter((i) => i.status === "running")

    const close = (open: boolean) => {
        if (!open) setInstanceId("")
        onOpenChange(open)
    }

    return (
        <Dialog open={ip !== null} onOpenChange={close}>
            <DialogContent className="sm:max-w-md glass-3">
                <DialogHeader>
                    <DialogTitle>{t("staticIps.assignForm.title")}</DialogTitle>
                    <DialogDescription>
                        {t("staticIps.assignForm.description", { ip: ip?.ip_address ?? "" })}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                    <Label className={FIELD_LABEL_CLASS}>
                        {t("staticIps.assignForm.instance")}
                        <span className="text-destructive ml-0.5">*</span>
                    </Label>
                    <Select value={instanceId} onValueChange={setInstanceId}>
                        <SelectTrigger className="w-full font-mono text-[13px]">
                            <SelectValue
                                placeholder={t("staticIps.assignForm.instancePlaceholder")}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {runningInstances.map((instance) => (
                                <SelectItem
                                    key={instance.id}
                                    value={instance.id}
                                    className="font-mono text-[13px]"
                                >
                                    {instance.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {runningInstances.length === 0 && (
                        <p className="text-[11px] text-muted-foreground">
                            {t("staticIps.assignForm.noInstances")}
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            close(false)
                        }}
                    >
                        {t("console.wizard.cancel")}
                    </Button>
                    <Button
                        type="button"
                        disabled={!instanceId || isPending}
                        onClick={() => {
                            if (ip) {
                                assign(
                                    { id: ip.id, instanceId },
                                    {
                                        onSuccess: () => {
                                            close(false)
                                        },
                                    }
                                )
                            }
                        }}
                    >
                        {isPending
                            ? t("staticIps.assignForm.submitting")
                            : t("staticIps.assignForm.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function StaticIpsPage() {
    useScreen("vpc.static-ips")
    const { t } = useTranslation()
    const { data: ips = [], isLoading, isError, refetch, isFetching } = useStaticIPs()
    const { data: instances = [] } = useInstances()
    const { mutate: unassign, isPending: isUnassigning } = useUnassignStaticIP()
    const { mutate: release, isPending: isReleasing } = useReleaseStaticIP()

    const [query, setQuery] = useState("")
    const [reserveOpen, setReserveOpen] = useState(false)
    const [toAssign, setToAssign] = useState<StaticIP | null>(null)
    const [toUnassign, setToUnassign] = useState<StaticIP | null>(null)
    const [toRelease, setToRelease] = useState<StaticIP | null>(null)

    const instanceNames = useMemo(() => new Map(instances.map((i) => [i.id, i.name])), [instances])

    const filtered = useMemo(() => {
        if (!query.trim()) return ips
        const q = query.toLowerCase()
        return ips.filter(
            (ip) =>
                ip.name.toLowerCase().includes(q) ||
                ip.ip_address.includes(q) ||
                ip.region.toLowerCase().includes(q)
        )
    }, [ips, query])

    const stats = useMemo(
        () => [
            { label: t("staticIps.stats.total"), value: ips.length, loading: isLoading },
            {
                label: t("staticIps.stats.assigned"),
                value: ips.filter((ip) => ip.status === "assigned").length,
                color: "info" as const,
                loading: isLoading,
            },
            {
                label: t("staticIps.stats.reserved"),
                value: ips.filter((ip) => ip.status === "reserved").length,
                loading: isLoading,
            },
        ],
        [t, ips, isLoading]
    )

    const columns = useMemo<ColumnDef<StaticIP>[]>(
        () => [
            {
                id: "name",
                header: () => (
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        {t("staticIps.columns.name")}
                    </span>
                ),
                accessorFn: (ip) => ip.name,
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-[14px] leading-tight text-foreground flex items-center gap-2">
                            <Globe className="size-4 text-muted-foreground" />
                            {row.original.name}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground mt-0.5 ml-6">
                            IP-{row.original.tenant_serial}
                        </span>
                    </div>
                ),
            },
            {
                id: "region",
                header: () => (
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        {t("staticIps.columns.region")}
                    </span>
                ),
                accessorFn: (ip) => ip.region,
                cell: ({ row }) => (
                    <span className="flex items-center gap-1.5 font-medium text-[13px] text-foreground">
                        <Globe className="size-3.5 text-muted-foreground" />
                        {row.original.region}
                    </span>
                ),
                meta: { responsive: "md" },
            },
            copyColumn<StaticIP>({
                id: "ip_address",
                header: t("staticIps.columns.ip"),
                accessor: (ip) => ip.ip_address,
            }),
            statusColumn<StaticIP>({
                header: t("staticIps.columns.status"),
                accessor: (ip) => ip.status,
                pulse: (ip) => ip.status === "assigned" || ip.status === "provisioning",
            }),
            {
                id: "instance",
                accessorFn: (ip: StaticIP) => instanceNames.get(ip.instance_id) ?? "",
                header: () => t("staticIps.columns.instance"),
                meta: { interactive: true },
                cell: ({ row }) => {
                    const ip = row.original
                    if (!ip.instance_id) {
                        return <span className="text-muted-foreground">—</span>
                    }
                    return (
                        <Link
                            to={VMS_ROUTES.detail(ip.instance_id)}
                            className="font-mono text-[13px] text-status-info hover:underline"
                        >
                            {instanceNames.get(ip.instance_id) ?? ip.instance_id}
                        </Link>
                    )
                },
            },
            actionsColumn<StaticIP>({
                ariaLabel: t("console.table.actions"),
                actions: (ip) => {
                    // Provisioning IPs are still being allocated — neither
                    // assign nor unassign applies until the address is ready.
                    const attachmentActions = []
                    if (ip.status === "reserved") {
                        attachmentActions.push({
                            label: t("staticIps.actions.assign"),
                            icon: Link2,
                            onAction: (row: StaticIP) => {
                                setToAssign(row)
                            },
                        })
                    } else if (ip.status !== "provisioning") {
                        attachmentActions.push({
                            label: t("staticIps.actions.unassign"),
                            icon: Unlink,
                            onAction: (row: StaticIP) => {
                                setToUnassign(row)
                            },
                        })
                    }
                    return [
                        ...attachmentActions,
                        {
                            label: t("staticIps.actions.release"),
                            icon: Trash2,
                            destructive: true,
                            onAction: (row: StaticIP) => {
                                setToRelease(row)
                            },
                        },
                    ]
                },
            }),
        ],
        [t, instanceNames]
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={Globe}
                breadcrumbs={[
                    { label: t("console.nav.groups.networking") },
                    { label: t("staticIps.title") },
                ]}
                title={t("staticIps.title")}
                description={t("staticIps.subtitle")}
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
                            onClick={() => {
                                setReserveOpen(true)
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            {t("staticIps.reserve")}
                        </Button>
                    </>
                }
            />

            <StatGrid stats={stats} className="grid-cols-2 lg:grid-cols-3" />

            <ResourceTable<StaticIP>
                data={filtered}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(ip) => ip.id}
                enableColumnVisibility
                toolbar={
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                            }}
                            placeholder={t("staticIps.searchPlaceholder")}
                            className="pl-8 h-8 text-[13px]"
                        />
                    </div>
                }
                emptyState={
                    <EmptyState
                        icon={Globe}
                        title={t("staticIps.empty")}
                        description={t("staticIps.emptySubtitle")}
                        action={{
                            label: t("staticIps.reserve"),
                            onClick: () => {
                                setReserveOpen(true)
                            },
                        }}
                    />
                }
            />

            <ReserveIpDialog open={reserveOpen} onOpenChange={setReserveOpen} />

            <AssignIpDialog
                ip={toAssign}
                onOpenChange={(open) => {
                    if (!open) setToAssign(null)
                }}
            />

            <ConfirmDialog
                open={toUnassign !== null}
                onOpenChange={(open) => {
                    if (!open) setToUnassign(null)
                }}
                title={t("staticIps.unassignConfirm.title")}
                description={t("staticIps.unassignConfirm.description", {
                    ip: toUnassign?.ip_address ?? "",
                    instance: instanceNames.get(toUnassign?.instance_id ?? "") ?? "",
                })}
                confirmLabel={t("staticIps.actions.unassign")}
                destructive={false}
                loading={isUnassigning}
                onConfirm={() => {
                    if (toUnassign) {
                        unassign(toUnassign.id, {
                            onSuccess: () => {
                                setToUnassign(null)
                            },
                        })
                    }
                }}
            />

            <ConfirmDialog
                open={toRelease !== null}
                onOpenChange={(open) => {
                    if (!open) setToRelease(null)
                }}
                title={t("staticIps.releaseConfirm.title")}
                description={t("staticIps.releaseConfirm.description", {
                    ip: toRelease?.ip_address ?? "",
                })}
                confirmLabel={t("staticIps.actions.release")}
                loading={isReleasing}
                onConfirm={() => {
                    if (toRelease) {
                        release(toRelease.id, {
                            onSuccess: () => {
                                setToRelease(null)
                            },
                        })
                    }
                }}
            />
        </div>
    )
}
