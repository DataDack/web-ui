import { useMemo, useState } from "react"

import { Link2, Loader2, Unlink } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, CopyButton, Section, staggerDelay, StatusBadge } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import {
    useAttachIGW,
    useDetachIGW,
    useInternetGateways,
    useNATGateways,
    useRouters,
    useVPCSubnets,
} from "../../vpc.hooks"
import type { InternetGateway, VPCNetwork } from "../../vpc.types"

const HEAD_CLASS = "px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"

function LoadingRows() {
    return (
        <div className="p-4 space-y-2">
            {["a", "b"].map((k) => (
                <Skeleton key={k} className="h-8 rounded" />
            ))}
        </div>
    )
}

function EmptyRow({ label, colSpan }: Readonly<{ label: string; colSpan: number }>) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell
                colSpan={colSpan}
                className="px-3 py-6 text-center text-[13px] text-muted-foreground"
            >
                {label}
            </TableCell>
        </TableRow>
    )
}

/* ── Routers ───────────────────────────────────────────────────────────── */

function RoutersSection({ network }: Readonly<{ network: VPCNetwork }>) {
    const { t } = useTranslation()
    const { data: routers = [], isLoading } = useRouters()
    const networkRouters = routers.filter((r) => r.network_id === network.id)

    return (
        <Section
            variant="panel"
            title={t("vpc.detail.routers")}
            description={t("vpc.detail.routersDescription")}
        >
            {isLoading ? (
                <LoadingRows />
            ) : (
                <div className="glass-1 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.name")}
                                </TableHead>
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.region")}
                                </TableHead>
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.status")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {networkRouters.map((router, index) => (
                                <TableRow
                                    key={router.id}
                                    className="animate-content-enter"
                                    style={staggerDelay(index)}
                                >
                                    <TableCell className="px-3 font-mono text-[13px] font-medium">
                                        {router.name}
                                    </TableCell>
                                    <TableCell className="px-3 text-sm text-muted-foreground">
                                        {router.region}
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <StatusBadge
                                            status={router.status}
                                            pulse={router.status === "active"}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {networkRouters.length === 0 && (
                                <EmptyRow label={t("vpc.detail.noRouters")} colSpan={3} />
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Section>
    )
}

/* ── Internet gateways ─────────────────────────────────────────────────── */

function InternetGatewaysSection({ network }: Readonly<{ network: VPCNetwork }>) {
    const { t } = useTranslation()
    const { data: gateways = [], isLoading } = useInternetGateways()
    const { mutate: attach, isPending: isAttaching } = useAttachIGW()
    const { mutate: detach, isPending: isDetaching } = useDetachIGW()
    const [toDetach, setToDetach] = useState<InternetGateway | null>(null)

    // Show gateways attached to this network plus detached ones available to attach.
    const visible = gateways.filter((g) => g.network_id === network.id || g.status === "detached")

    return (
        <Section
            variant="panel"
            title={t("vpc.detail.internetGateways")}
            description={t("vpc.detail.internetGatewaysDescription")}
        >
            {isLoading ? (
                <LoadingRows />
            ) : (
                <div className="glass-1 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.name")}
                                </TableHead>
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.status")}
                                </TableHead>
                                <TableHead className={HEAD_CLASS} />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((gateway, index) => (
                                <TableRow
                                    key={gateway.id}
                                    className="animate-content-enter"
                                    style={staggerDelay(index)}
                                >
                                    <TableCell className="px-3 font-mono text-[13px] font-medium">
                                        {gateway.name}
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <StatusBadge status={gateway.status} />
                                    </TableCell>
                                    <TableCell className="px-3 text-right">
                                        {gateway.status === "detached" ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1.5"
                                                disabled={isAttaching}
                                                onClick={() => {
                                                    attach({
                                                        id: gateway.id,
                                                        networkId: network.id,
                                                    })
                                                }}
                                            >
                                                {isAttaching ? (
                                                    <Loader2 className="size-3 animate-spin" />
                                                ) : (
                                                    <Link2 className="size-3" />
                                                )}
                                                {t("vpc.actions.attach")}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1.5 text-muted-foreground hover:text-destructive"
                                                disabled={isDetaching}
                                                onClick={() => {
                                                    setToDetach(gateway)
                                                }}
                                            >
                                                <Unlink className="size-3" />
                                                {t("vpc.actions.detach")}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {visible.length === 0 && (
                                <EmptyRow label={t("vpc.detail.noInternetGateways")} colSpan={3} />
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <ConfirmDialog
                open={toDetach !== null}
                onOpenChange={(open) => {
                    if (!open) setToDetach(null)
                }}
                title={t("vpc.detachConfirm.title")}
                description={t("vpc.detachConfirm.description", {
                    name: toDetach?.name ?? "",
                    network: network.name,
                })}
                confirmLabel={t("vpc.actions.detach")}
                loading={isDetaching}
                onConfirm={() => {
                    if (toDetach) {
                        detach(toDetach.id, {
                            onSuccess: () => {
                                setToDetach(null)
                            },
                        })
                    }
                }}
            />
        </Section>
    )
}

/* ── NAT gateways ──────────────────────────────────────────────────────── */

function NatGatewaysSection({ network }: Readonly<{ network: VPCNetwork }>) {
    const { t } = useTranslation()
    const { data: natGateways = [], isLoading } = useNATGateways()
    const { data: subnets = [] } = useVPCSubnets(network.id)

    const networkNats = natGateways.filter((n) => n.network_id === network.id)
    const subnetNames = useMemo(() => new Map(subnets.map((s) => [s.id, s.name])), [subnets])

    return (
        <Section
            variant="panel"
            title={t("vpc.detail.natGateways")}
            description={t("vpc.detail.natGatewaysDescription")}
        >
            {isLoading ? (
                <LoadingRows />
            ) : (
                <div className="glass-1 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.name")}
                                </TableHead>
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.subnet")}
                                </TableHead>
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.publicIp")}
                                </TableHead>
                                <TableHead className={HEAD_CLASS}>
                                    {t("vpc.columns.status")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {networkNats.map((nat, index) => (
                                <TableRow
                                    key={nat.id}
                                    className="animate-content-enter"
                                    style={staggerDelay(index)}
                                >
                                    <TableCell className="px-3 font-mono text-[13px] font-medium">
                                        {nat.name}
                                    </TableCell>
                                    <TableCell className="px-3 font-mono text-[12px] text-muted-foreground">
                                        {subnetNames.get(nat.subnet_id) ?? nat.subnet_id}
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <CopyButton value={nat.public_ip} />
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <StatusBadge
                                            status={nat.status}
                                            pulse={nat.status === "active"}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {networkNats.length === 0 && (
                                <EmptyRow label={t("vpc.detail.noNatGateways")} colSpan={4} />
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Section>
    )
}

/* ── Tab ───────────────────────────────────────────────────────────────── */

export function GatewaysTab({ network }: Readonly<{ network: VPCNetwork }>) {
    return (
        <div className="space-y-5">
            <RoutersSection network={network} />
            <InternetGatewaysSection network={network} />
            <NatGatewaysSection network={network} />
        </div>
    )
}
