import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { CreateWizard, PageHeader, type WizardStep } from "@/components/console"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import { useScreen } from "@/services/api/screen"

import { BasicsStep } from "./BasicsStep"
import { NetworkStep } from "./NetworkStep"
import { PresetChooser } from "./PresetChooser"
import { defaultFormValues } from "./presets"
import { RoutingStep } from "./RoutingStep"
import { makeSchema, splitCIDRs, targetGroupName, type FormValues } from "./schema"
import { SecurityStep } from "./SecurityStep"
import { TopologyAside } from "./TopologyAside"
import { LB_ROUTES } from "../../load-balancers.constants"
import { useCreateLoadBalancer } from "../../load-balancers.hooks"
import type {
    LBListenerSpec,
    LBTargetGroupSpec,
} from "../../load-balancers.types"

export function LoadBalancerCreateWizardPage() {
    useScreen("load-balancers.load-balancer-create-wizard")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { mutate: create, isPending } = useCreateLoadBalancer()
    const quotaBlocked = useQuotaBlocked("compute.load_balancers")
    const { rule } = useNamingRule("load-balancer")
    const schema = useMemo(() => makeSchema(rule), [rule])

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultFormValues(),
        mode: "onTouched",
    })

    const steps: WizardStep<FormValues>[] = [
        {
            id: "basics",
            title: t("loadBalancers.wizard.basics"),
            description: t("loadBalancers.wizard.basicsDescription"),
            fields: ["name", "type", "scheme", "billing_cycle", "resource_group_id"],
            render: (f) => (
                <div className="space-y-6">
                    <PresetChooser form={f} />
                    <BasicsStep form={f} />
                </div>
            ),
            reviewItems: (values) => [
                { label: t("loadBalancers.form.name"), value: values.name, mono: true },
                {
                    label: t("loadBalancers.columns.type"),
                    value: t(`loadBalancers.types.${values.type}`),
                },
                {
                    label: t("loadBalancers.columns.scheme"),
                    value: t(`loadBalancers.schemes.${values.scheme}`),
                },
                {
                    label: t("loadBalancers.wizard.billing"),
                    value: t(`loadBalancers.wizard.billingCycle.${values.billing_cycle}`),
                },
            ],
        },
        {
            id: "network",
            title: t("loadBalancers.wizard.network"),
            description: t("loadBalancers.wizard.networkDescription"),
            fields: ["vpcs"],
            render: (f) => <NetworkStep form={f} />,
            reviewItems: (values) =>
                values.vpcs.map((g, i) => ({
                    label: `${t("vms.detail.vpc")} ${String(i + 1)}`,
                    value: `${g.vpc_id} · ${t("loadBalancers.wizard.subnetsSelected", {
                        count: g.subnet_ids.length,
                    })}`,
                    mono: true,
                })),
        },
        {
            // Listeners and Targets were separate steps. They asked halves of
            // one question — "where does :80 go" — so they are one step now.
            id: "routing",
            title: t("loadBalancers.wizard.routing"),
            description: t("loadBalancers.wizard.routingDescription"),
            fields: ["listeners"],
            render: (f) => <RoutingStep form={f} />,
            reviewItems: (values) =>
                values.listeners.length === 0
                    ? [
                          {
                              label: t("loadBalancers.wizard.routing"),
                              value: t("loadBalancers.wizard.reviewNoListeners"),
                          },
                      ]
                    : values.listeners.map((l) => ({
                          label: `${l.protocol}:${String(l.port)} · ${
                              splitCIDRs(l.allowed_cidrs).join(", ") ||
                              t("loadBalancers.wizard.fromAnywhere")
                          }`,
                          value:
                              l.tg_mode === "existing"
                                  ? t("loadBalancers.wizard.reviewExistingGroup")
                                  : t("loadBalancers.wizard.reviewNewGroup", {
                                        name: targetGroupName(values.name, l),
                                        port: l.tg_port,
                                        count: l.targets.length,
                                    }),
                          mono: true,
                      })),
        },
        {
            id: "security",
            title: t("loadBalancers.wizard.security"),
            description: t("loadBalancers.wizard.securityDescription"),
            fields: ["security_group_ids"],
            render: (f) => <SecurityStep form={f} />,
            reviewItems: (values) => [
                {
                    label: t("loadBalancers.wizard.securityGroups"),
                    value:
                        values.security_group_ids.length === 0
                            ? t("loadBalancers.wizard.reviewNoSecurityGroups")
                            : t("loadBalancers.wizard.reviewSecurityGroups", {
                                  count: values.security_group_ids.length,
                              }),
                },
            ],
        },
    ]

    /**
     * Flatten the form into the declarative create request.
     *
     * Everything goes in one call — target groups, their targets, and the
     * listeners — because the backend writes the container's firewall from the
     * listener set before it boots. A listener created afterwards binds inside
     * the container and is dropped at the hypervisor, so sending them separately
     * would produce a load balancer that looks correct and serves nothing.
     */
    const onSubmit = (values: FormValues) => {
        const subnets = values.vpcs.flatMap((g) =>
            g.subnet_ids.map((subnet_id) => ({ vpc_id: g.vpc_id, subnet_id })),
        )

        // Listeners that create their own group get a request-local ref, which is
        // how they name a target group that has no id yet.
        const targetGroups: LBTargetGroupSpec[] = []
        const listeners: LBListenerSpec[] = values.listeners.map((l, i) => {
            const allowedCidrs = splitCIDRs(l.allowed_cidrs)
            if (l.tg_mode === "existing") {
                return {
                    protocol: l.protocol,
                    port: l.port,
                    default_target_group_id: l.target_group_id,
                    allowed_cidrs: allowedCidrs,
                }
            }
            const ref = `tg-${String(i)}`
            targetGroups.push({
                ref,
                name: targetGroupName(values.name, l),
                protocol: l.protocol,
                port: l.tg_port,
                algorithm: l.tg_algorithm,
                health_check_path: l.health_check_path,
                health_check_interval_s: l.health_check_interval_s,
                healthy_threshold: l.healthy_threshold,
                unhealthy_threshold: l.unhealthy_threshold,
                // A blank per-target port means "use the group's", which is what
                // the backend does when the field is omitted.
                targets: l.targets.map((tgt) => ({
                    instance_id: tgt.instance_id,
                    ...(tgt.port.trim() ? { port: Number(tgt.port) } : {}),
                })),
            })
            return {
                protocol: l.protocol,
                port: l.port,
                target_group_ref: ref,
                allowed_cidrs: allowedCidrs,
            }
        })

        create(
            {
                name: values.name,
                type: values.type,
                scheme: values.scheme,
                subnets,
                billing_cycle: values.billing_cycle,
                resource_group_id: values.resource_group_id || undefined,
                security_group_ids: values.security_group_ids,
                target_groups: targetGroups,
                listeners,
            },
            { onSuccess: (lb) => void navigate(LB_ROUTES.detail(lb.id)) },
        )
    }

    return (
        <>
            <PageHeader
                title={t("loadBalancers.wizard.title")}
                description={t("loadBalancers.wizard.subtitle")}
                breadcrumbs={[
                    { label: t("loadBalancers.title"), to: LB_ROUTES.ROOT },
                    { label: t("loadBalancers.wizard.title") },
                ]}
            />
            <div className="mb-6 empty:hidden">
                <QuotaNotice code="compute.load_balancers" />
            </div>
            <CreateWizard
                steps={steps}
                form={form}
                onSubmit={onSubmit}
                submitLabel={t("loadBalancers.form.create")}
                isSubmitting={isPending}
                submitDisabled={quotaBlocked}
                onCancel={() => void navigate(LB_ROUTES.ROOT)}
                fullWidth
                aside={<TopologyAside form={form} />}
            />
        </>
    )
}
