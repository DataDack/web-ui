import { ArrowDown, Trash2 } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Instance } from "@/modules/vms/vms.types"

import { HealthCheckFields } from "./HealthCheckFields"
import { TargetPicker } from "./TargetPicker"
import { targetGroupName, type FormValues } from "../schema"

interface ExistingGroup {
    id: string
    name: string
    protocol: string
    port: number
}

/**
 * One route, end to end: the port traffic arrives on, and the instances that
 * answer it.
 *
 * Listener and destination are one card because they are one decision. Split
 * across two screens, the same port appeared twice and a listener with no
 * destination looked finished until submit — and a target group referenced by
 * name gave no way to tell two of them apart.
 */
export function RouteCard({
    form,
    index,
    instances,
    instancesLoading,
    reachableVpcIds,
    existingGroups,
    canRemove,
    onRemove,
}: Readonly<{
    form: UseFormReturn<FormValues>
    index: number
    instances: Instance[]
    instancesLoading: boolean
    reachableVpcIds: ReadonlySet<string>
    existingGroups: ExistingGroup[]
    canRemove: boolean
    onRemove: () => void
}>) {
    const { t } = useTranslation()
    const {
        register,
        setValue,
        watch,
        formState: { errors },
    } = form
    const path = `listeners.${String(index)}` as `listeners.${number}`
    const l = watch(path)
    const lbName = watch("name")
    const rowErrors = errors.listeners?.[index]

    return (
        <div className="glass-1 rounded-lg border border-border/60 p-3.5">
            {/* ---- what arrives ---- */}
            <div className="mb-3 flex items-center gap-2.5">
                <span className="rounded-full bg-status-info-bg px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-status-info">
                    {l.protocol}
                </span>
                <span className="text-[11px] text-muted-foreground">
                    {t("loadBalancers.wizard.protocolLocked")}
                </span>
                <span className="flex-1" />
                {canRemove && (
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={t("loadBalancers.wizard.removeListener")}
                        onClick={onRemove}
                    >
                        <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("loadBalancers.wizard.listenerPort")}
                        <span className="ml-0.5 text-destructive">*</span>
                    </Label>
                    <Input
                        type="number"
                        inputMode="numeric"
                        className="font-mono"
                        {...register(`${path}.port`, { valueAsNumber: true })}
                    />
                    {rowErrors?.port && (
                        <p className="text-[11px] text-destructive">{rowErrors.port.message}</p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("loadBalancers.wizard.allowedSources")}
                    </Label>
                    <Input
                        className="font-mono"
                        placeholder={t("loadBalancers.wizard.allowedSourcesPlaceholder")}
                        {...register(`${path}.allowed_cidrs`)}
                    />
                    {rowErrors?.allowed_cidrs ? (
                        <p className="text-[11px] text-destructive">
                            {rowErrors.allowed_cidrs.message}
                        </p>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                            {t("loadBalancers.wizard.allowedSourcesHint")}
                        </p>
                    )}
                </div>
            </div>

            {/* ---- where it goes ---- */}
            <div className="my-3 flex items-center gap-2 border-t border-border/50 pt-3">
                <ArrowDown className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    {t("loadBalancers.wizard.forwardsTo")}
                </span>
                <span className="flex-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 text-[11px]"
                    onClick={() => {
                        setValue(`${path}.tg_mode`, l.tg_mode === "new" ? "existing" : "new", {
                            shouldValidate: true,
                        })
                    }}
                >
                    {l.tg_mode === "new"
                        ? t("loadBalancers.wizard.useExistingGroup")
                        : t("loadBalancers.wizard.createNewGroup")}
                </Button>
            </div>

            {l.tg_mode === "existing" ? (
                <div className="space-y-1.5">
                    <Select
                        value={l.target_group_id}
                        onValueChange={(v) => {
                            setValue(`${path}.target_group_id`, v, { shouldValidate: true })
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue
                                placeholder={t("loadBalancers.wizard.targetGroupPlaceholder")}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {existingGroups.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                    {g.name} · {g.protocol}:{g.port}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {existingGroups.length === 0 && (
                        <p className="text-[11px] text-muted-foreground">
                            {t("loadBalancers.wizard.noReachableGroups")}
                        </p>
                    )}
                    {rowErrors?.target_group_id && (
                        <p className="text-[11px] text-destructive">
                            {rowErrors.target_group_id.message}
                        </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                        {t("loadBalancers.wizard.existingGroupNote")}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t("loadBalancers.wizard.groupName")}
                            </Label>
                            {/* Optional: blank uses the generated name shown here,
                                so nobody has to name a group they did not ask for. */}
                            <Input
                                className="font-mono"
                                placeholder={targetGroupName(lbName, l)}
                                {...register(`${path}.tg_name`)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t("loadBalancers.wizard.groupPortLabel")}
                            </Label>
                            <Input
                                type="number"
                                inputMode="numeric"
                                className="font-mono"
                                {...register(`${path}.tg_port`, { valueAsNumber: true })}
                            />
                            {rowErrors?.tg_port && (
                                <p className="text-[11px] text-destructive">
                                    {rowErrors.tg_port.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t("loadBalancers.wizard.algorithm")}
                            </Label>
                            <Select
                                value={l.tg_algorithm}
                                onValueChange={(v) => {
                                    setValue(
                                        `${path}.tg_algorithm`,
                                        v as FormValues["listeners"][number]["tg_algorithm"],
                                        { shouldValidate: true }
                                    )
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="round_robin">
                                        {t("targetGroups.algorithms.round_robin")}
                                    </SelectItem>
                                    <SelectItem value="least_connections">
                                        {t("targetGroups.algorithms.least_connections")}
                                    </SelectItem>
                                    <SelectItem value="ip_hash">
                                        {t("targetGroups.algorithms.ip_hash")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="mt-3">
                        <HealthCheckFields
                            form={form}
                            index={index}
                            isHTTP={l.protocol === "HTTP"}
                        />
                    </div>

                    <div className="mt-3 space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("loadBalancers.wizard.instancesLabel")}
                        </Label>
                        <TargetPicker
                            instances={instances}
                            isLoading={instancesLoading}
                            reachableVpcIds={reachableVpcIds}
                            groupPort={l.tg_port}
                            targets={l.targets}
                            onToggle={(instanceId, checked) => {
                                setValue(
                                    `${path}.targets`,
                                    checked
                                        ? [...l.targets, { instance_id: instanceId, port: "" }]
                                        : l.targets.filter((tgt) => tgt.instance_id !== instanceId),
                                    { shouldValidate: true }
                                )
                            }}
                            onPortChange={(instanceId, port) => {
                                setValue(
                                    `${path}.targets`,
                                    l.targets.map((tgt) =>
                                        tgt.instance_id === instanceId ? { ...tgt, port } : tgt
                                    ),
                                    { shouldValidate: true }
                                )
                            }}
                        />
                        {l.targets.length === 0 && (
                            <p className="text-[11px] text-status-warning">
                                {t("loadBalancers.wizard.noTargetsWarning")}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
