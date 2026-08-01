import { useEffect, useMemo } from "react"

import {
    Anchor,
    CheckCircle2,
    Globe,
    Layers,
    Loader2,
    MapPin,
    Network,
    ShieldCheck,
    Wifi,
    type LucideIcon,
} from "lucide-react"
import { motion } from "motion/react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { RegionCatalog, StaticIPPriceOption } from "@/modules/catalog/catalog.types"
import { VPC_ROUTES } from "@/modules/vpc/vpc.constants"
import {
    useAllSecurityGroups,
    useCreateDefaultSecurityGroup,
    useVPCSubnets,
} from "@/modules/vpc/vpc.hooks"
import type { VPCNetwork } from "@/modules/vpc/vpc.types"

import { formatPrice } from "./wizard.format"
import { FieldLabel, FieldError } from "./wizard.shared"
import type { FormValues } from "./wizard.types"

export function LocationAndNetworkStep({
    form,
    regions,
    vpcs,
    staticIpPrice,
}: Readonly<{
    form: UseFormReturn<FormValues>
    regions: RegionCatalog[]
    vpcs: VPCNetwork[]
    staticIpPrice?: StaticIPPriceOption | null
}>) {
    const { t } = useTranslation()
    const region = form.watch("region")
    const skipVpc = form.watch("skip_vpc")
    const billingPeriod = form.watch("billing_period")
    const publicIpType = form.watch("public_ip_type")
    const zone = form.watch("zone")
    const vpcId = form.watch("vpc_id")
    const subnetId = form.watch("subnet_id")
    const { data: subnets = [] } = useVPCSubnets(vpcId)

    // A subnet is availability-zone-scoped, so a VM launched into a given AZ can
    // only use a subnet in that same AZ (the backend rejects a mismatch). Resolve
    // the selected AZ code → its uuid and offer only matching subnets; AZ-less
    // subnets aren't pinned, so they always remain selectable.
    const selectedAzId = useMemo(
        () =>
            regions
                .find((r) => r.code === region)
                ?.availability_zones.find((az) => az.code === zone)?.id,
        [regions, region, zone]
    )
    const azSubnets = useMemo(
        () =>
            selectedAzId
                ? subnets.filter(
                      (s) => !s.availability_zone_id || s.availability_zone_id === selectedAzId
                  )
                : subnets,
        [subnets, selectedAzId]
    )
    const selectedSubnet = azSubnets.find((s) => s.id === subnetId)

    // If the chosen subnet no longer matches the selected AZ (e.g. the user
    // changed the data-center location after picking a subnet), clear it so a
    // stale, now-invalid subnet can't be submitted.
    useEffect(() => {
        if (subnetId && !azSubnets.some((s) => s.id === subnetId)) {
            form.setValue("subnet_id", "")
            form.setValue("_subnet_cidr", "")
        }
    }, [azSubnets, subnetId, form])

    let publicIpSummary = "Disabled"
    if (publicIpType === "static") publicIpSummary = "Static IP"
    else if (publicIpType !== "none") publicIpSummary = "Dynamic IP"

    let staticIpLabel = "Billed"
    if (staticIpPrice) {
        staticIpLabel =
            billingPeriod === "hourly"
                ? `${formatPrice(staticIpPrice.price_hourly, staticIpPrice.currency, true)}/hr`
                : `${formatPrice(staticIpPrice.price_monthly, staticIpPrice.currency)}/mo`
    }

    return (
        <div className="space-y-8">
            {/* Part 1: DC Location */}
            <div className="space-y-3">
                <FieldLabel>Data Center Location</FieldLabel>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {regions.map((r) => {
                        const isActive = region === r.code
                        return (
                            <motion.button
                                key={r.code}
                                type="button"
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    form.setValue("region", r.code)
                                    form.setValue("zone", r.availability_zones.at(0)?.code ?? "")
                                    form.setValue("machine_type_id", "")
                                }}
                                className={cn(
                                    "glass-1 relative flex items-center gap-3 px-4 py-3 text-left transition-colors overflow-hidden rounded-lg",
                                    isActive
                                        ? "gradient-ring bg-accent/20"
                                        : "hover:bg-accent/30 border-border-glass"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle2 className="size-4 text-primary" />
                                    </div>
                                )}
                                <MapPin className="size-5 text-muted-foreground shrink-0" />
                                <div>
                                    <span className="block text-[13px] font-medium text-foreground">
                                        {r.name}
                                    </span>
                                    <span className="block text-[11px] text-muted-foreground uppercase">
                                        {r.code}
                                    </span>
                                </div>
                            </motion.button>
                        )
                    })}
                </div>
            </div>

            {/* Availability Zone — AZ-scoped resources (subnet, machine prices)
			    depend on this, so changing it clears those picks. */}
            {(() => {
                const zones = regions.find((r) => r.code === region)?.availability_zones ?? []
                if (zones.length === 0) return null
                return (
                    <div className="space-y-3">
                        <FieldLabel>Availability Zone</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                            {zones.map((az) => {
                                const isActive = zone === az.code
                                return (
                                    <motion.button
                                        key={az.code}
                                        type="button"
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            form.setValue("zone", az.code)
                                            form.setValue("machine_type_id", "")
                                            form.setValue("subnet_id", "")
                                        }}
                                        className={cn(
                                            "glass-1 relative flex items-center gap-2 px-3.5 py-2 text-left transition-colors rounded-lg",
                                            isActive
                                                ? "gradient-ring bg-accent/20"
                                                : "hover:bg-accent/30 border-border-glass"
                                        )}
                                    >
                                        <Layers className="size-4 text-muted-foreground shrink-0" />
                                        <span className="text-[13px] font-medium text-foreground">
                                            {az.code}
                                        </span>
                                        {isActive && (
                                            <CheckCircle2 className="size-3.5 text-primary" />
                                        )}
                                    </motion.button>
                                )
                            })}
                        </div>
                    </div>
                )
            })()}

            <div className="border-t border-border-glass pt-6 space-y-4">
                <FieldLabel>Network Isolation</FieldLabel>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            form.setValue("skip_vpc", true, { shouldValidate: true })
                            // A VPS is defined by direct internet exposure, so turn on a
                            // public IP automatically — but don't clobber an existing
                            // "static" pick by downgrading it to ephemeral.
                            if (form.getValues("public_ip_type") === "none") {
                                form.setValue("public_ip_type", "ephemeral", {
                                    shouldValidate: true,
                                })
                            }
                        }}
                        className={cn(
                            "glass-1 relative px-4 py-3 text-left transition-colors rounded-lg",
                            skipVpc
                                ? "gradient-ring bg-accent/20"
                                : "hover:bg-accent/30 border-border-glass"
                        )}
                    >
                        <Network className="size-4 text-muted-foreground mb-2" />
                        <span className="block text-[13px] font-medium text-foreground">
                            Virtual Public Server (VPS)
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                            Instance connects directly to the internet with a public IP.
                        </span>
                    </motion.button>
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            // A VPC instance is private by default, so switching in from a
                            // VPS drops the public IP that pick had turned on. It is only
                            // a default: the Public IPv4 control below stays available,
                            // since a VPC instance may still want a public address as its
                            // ingress. Guarded on skipVpc so re-clicking the active card
                            // doesn't wipe a public IP the user deliberately enabled here.
                            if (skipVpc) {
                                form.setValue("public_ip_type", "none", {
                                    shouldValidate: true,
                                })
                            }
                            form.setValue("skip_vpc", false, { shouldValidate: true })
                        }}
                        className={cn(
                            "glass-1 relative px-4 py-3 text-left transition-colors rounded-lg",
                            !skipVpc
                                ? "gradient-ring bg-accent/20"
                                : "hover:bg-accent/30 border-border-glass"
                        )}
                    >
                        <Globe className="size-4 text-muted-foreground mb-2" />
                        <span className="block text-[13px] font-medium text-foreground">
                            Virtual Private Cloud (VPC)
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                            Isolate your instance inside a private network.
                        </span>
                    </motion.button>
                </div>

                {!skipVpc && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {vpcs.length === 0 ? (
                            <div className="glass-1 px-4 py-4 text-center rounded-lg border-dashed border-status-warning/40 bg-status-warning/5">
                                <p className="text-[13px] font-medium text-foreground">
                                    No VPCs Available
                                </p>
                                <p className="text-[12px] text-muted-foreground mb-3">
                                    You don’t have any VPCs in this region.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(VPC_ROUTES.CREATE, "_blank")}
                                >
                                    Create a VPC first
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <FieldLabel>{t("vms.detail.vpc")} *</FieldLabel>
                                        <Select
                                            value={vpcId}
                                            onValueChange={(value) => {
                                                form.setValue("vpc_id", value, {
                                                    shouldValidate: true,
                                                })
                                                form.setValue("subnet_id", "")
                                                form.setValue("_subnet_cidr", "")
                                                if (form.getValues("private_ip"))
                                                    void form.trigger("private_ip")
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue
                                                    placeholder={t("vms.wizard.vpcPlaceholder")}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vpcs.map((vpc) => (
                                                    <SelectItem key={vpc.id} value={vpc.id}>
                                                        {vpc.name} ({vpc.cidr})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError
                                            message={form.formState.errors.vpc_id?.message}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <FieldLabel>{t("vms.detail.subnet")} *</FieldLabel>
                                        <Select
                                            value={subnetId}
                                            disabled={!vpcId}
                                            onValueChange={(value) => {
                                                form.setValue("subnet_id", value, {
                                                    shouldValidate: true,
                                                })
                                                const sub = azSubnets.find((s) => s.id === value)
                                                form.setValue("_subnet_cidr", sub?.cidr ?? "")
                                                if (form.getValues("private_ip"))
                                                    void form.trigger("private_ip")
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue
                                                    placeholder={t("vms.wizard.subnetPlaceholder")}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {azSubnets.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                                                        {t("vms.wizard.noSubnetsInAz")}
                                                    </div>
                                                ) : (
                                                    azSubnets.map((subnet) => (
                                                        <SelectItem
                                                            key={subnet.id}
                                                            value={subnet.id}
                                                        >
                                                            {subnet.name} ({subnet.cidr})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FieldError
                                            message={form.formState.errors.subnet_id?.message}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 max-w-sm">
                                    <FieldLabel>{t("vms.wizard.privateIp")}</FieldLabel>
                                    <Input
                                        className="font-mono"
                                        placeholder={t("vms.wizard.privateIpPlaceholder")}
                                        disabled={!subnetId}
                                        value={form.watch("private_ip")}
                                        onChange={(e) => {
                                            form.setValue("private_ip", e.target.value.trim(), {
                                                shouldValidate: form.formState.isSubmitted,
                                            })
                                        }}
                                        onBlur={() => void form.trigger("private_ip")}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        {selectedSubnet
                                            ? t("vms.wizard.privateIpHint", {
                                                  cidr: selectedSubnet.cidr,
                                              })
                                            : t("vms.wizard.privateIpHintNoSubnet")}
                                    </p>
                                    <FieldError
                                        message={form.formState.errors.private_ip?.message}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Security groups apply to both wiring modes: a VPS can attach
				    account-wide groups, a VPC instance can also use the VPC's own. */}
                <SecurityGroupPicker form={form} />

                {/* Public IPv4 applies to both wiring modes: a VPS is defined by it,
				    and a VPC instance can take one as its public ingress alongside its
				    private address (public NIC on net0, private on net1). It is off by
				    default under VPC. Collapsed into an accordion to keep the network
				    step compact. */}
                <div className="pt-2 border-t border-border-glass">
                    <Accordion type="single" collapsible>
                        <AccordionItem value="public-ipv4">
                            <AccordionTrigger className="hover:no-underline [&>svg]:size-6 [&>svg]:text-foreground [&[data-state=open]>svg]:text-primary">
                                <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                                    <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                        Public IPv4
                                    </span>
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                        {publicIpSummary}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="flex items-center justify-between gap-6 max-w-sm">
                                    <p className="text-[12px] text-muted-foreground">
                                        {skipVpc
                                            ? "Assign a public IP address to this instance"
                                            : "Assign a public IP address to this instance. It keeps its private address and becomes the entry point for public traffic into the VPC."}
                                    </p>
                                    <Switch
                                        checked={publicIpType !== "none"}
                                        onCheckedChange={(checked) => {
                                            form.setValue(
                                                "public_ip_type",
                                                checked ? "ephemeral" : "none",
                                                { shouldValidate: true }
                                            )
                                        }}
                                    />
                                </div>

                                {publicIpType !== "none" && (
                                    <div className="grid sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                        <PublicIpOption
                                            active={publicIpType === "ephemeral"}
                                            onSelect={() => {
                                                form.setValue("public_ip_type", "ephemeral", {
                                                    shouldValidate: true,
                                                })
                                            }}
                                            icon={Wifi}
                                            title="Dynamic IP"
                                            description="DHCP-assigned address. May change when the instance stops and starts."
                                            priceLabel="Free"
                                            priceTone="success"
                                        />
                                        <PublicIpOption
                                            active={publicIpType === "static"}
                                            onSelect={() => {
                                                form.setValue("public_ip_type", "static", {
                                                    shouldValidate: true,
                                                })
                                            }}
                                            icon={Anchor}
                                            title="Static IP"
                                            description="Reserved address that stays with the instance for its lifetime."
                                            priceLabel={staticIpLabel}
                                            priceTone="warning"
                                        />
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>
    )
}

/** Optional multi-select of security groups for the new instance. Scope follows
 * the network mode: VPS (skip_vpc) offers only account-wide groups; a VPC
 * instance additionally gets the selected VPC's own groups. */
function SecurityGroupPicker({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
    const { t } = useTranslation()
    const skipVpc = form.watch("skip_vpc")
    const vpcId = form.watch("vpc_id")
    const selected = form.watch("security_group_ids")
    const { data: allGroups = [] } = useAllSecurityGroups()
    const { mutateAsync: createDefault, isPending: isCreatingDefault } =
        useCreateDefaultSecurityGroup()

    const eligible = useMemo(
        () =>
            allGroups.filter((g) =>
                skipVpc || !vpcId ? !g.network_id : !g.network_id || g.network_id === vpcId
            ),
        [allGroups, skipVpc, vpcId]
    )

    // Drop selections that fell out of scope (e.g. the VPC changed).
    useEffect(() => {
        const ids = new Set(eligible.map((g) => g.id))
        const pruned = selected.filter((id) => ids.has(id))
        if (pruned.length !== selected.length) {
            form.setValue("security_group_ids", pruned)
        }
    }, [eligible, selected, form])

    const toggle = (id: string, checked: boolean) => {
        const next = checked ? [...selected, id] : selected.filter((s) => s !== id)
        form.setValue("security_group_ids", next)
    }

    // Quick action: get-or-create the account's default SG (idempotent on the
    // backend) and auto-select it.
    const createDefaultGroup = () => {
        void (async () => {
            try {
                const group = await createDefault(skipVpc ? undefined : vpcId || undefined)
                const current = form.getValues("security_group_ids")
                form.setValue("security_group_ids", [...new Set([...current, group.id])])
            } catch {
                // Error toast handled by the mutation.
            }
        })()
    }

    return (
        <div className="space-y-1.5 pt-2">
            <FieldLabel>
                <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    {t("vms.wizard.securityGroups")}
                </span>
            </FieldLabel>
            {eligible.length === 0 ? (
                <div className="glass-1 rounded-lg border-dashed px-4 py-4 text-center">
                    <p className="text-[12px] text-muted-foreground mb-3">
                        {t("vms.wizard.noSecurityGroups")}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={isCreatingDefault}
                        onClick={createDefaultGroup}
                    >
                        {isCreatingDefault && <Loader2 className="size-3.5 animate-spin" />}
                        {t("vms.wizard.createDefaultSg")}
                    </Button>
                </div>
            ) : (
                <div className="glass-1 rounded-lg divide-y divide-border-glass overflow-hidden">
                    {eligible.map((g) => {
                        const checked = selected.includes(g.id)
                        return (
                            <label
                                key={g.id}
                                className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors"
                            >
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={(state) => {
                                        toggle(g.id, state === true)
                                    }}
                                    className="mt-0.5"
                                    aria-label={g.name}
                                />
                                <span className="min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono text-[13px] font-medium text-foreground">
                                            {g.name}
                                        </span>
                                        {!g.network_id && (
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-status-neutral-bg text-status-neutral">
                                                {t("vpc.sgList.accountWide")}
                                            </span>
                                        )}
                                    </span>
                                    {g.description && (
                                        <span className="block text-[11px] text-muted-foreground truncate">
                                            {g.description}
                                        </span>
                                    )}
                                </span>
                            </label>
                        )
                    })}
                </div>
            )}
            <p className="text-[11px] text-muted-foreground">
                {t("vms.wizard.securityGroupsHint")}
            </p>
        </div>
    )
}

/** A selectable card for one public-IP mode (dynamic vs static). */
function PublicIpOption({
    active,
    onSelect,
    icon: Icon,
    title,
    description,
    priceLabel,
    priceTone,
}: Readonly<{
    active: boolean
    onSelect: () => void
    icon: LucideIcon
    title: string
    description: string
    priceLabel: string
    priceTone: "success" | "warning"
}>) {
    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={cn(
                "glass-1 relative px-4 py-3 text-left transition-colors rounded-lg",
                active ? "gradient-ring bg-accent/20" : "hover:bg-accent/30 border-border-glass"
            )}
        >
            {active && (
                <div className="absolute top-2 right-2">
                    <CheckCircle2 className="size-4 text-primary" />
                </div>
            )}
            <Icon className="size-4 text-muted-foreground mb-2" />
            <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">{title}</span>
                <span
                    className={cn(
                        "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full",
                        priceTone === "success"
                            ? "bg-status-success/10 text-status-success"
                            : "bg-status-warning/10 text-status-warning"
                    )}
                >
                    {priceLabel}
                </span>
            </div>
            <span className="block text-[11px] text-muted-foreground mt-0.5 pr-4">
                {description}
            </span>
        </motion.button>
    )
}
