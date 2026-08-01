import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { CreateWizard, PageHeader, type WizardStep } from "@/components/console"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useVPCs } from "@/modules/vpc/vpc.hooks"
import { useScreen } from "@/services/api/screen"

import { HEALTH_CHECK_INTERVALS, TG_ROUTES } from "../target-groups.constants"
import { useCreateTargetGroup } from "../target-groups.hooks"

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    vpc_id: z.string().min(1, "Select a VPC"),
    protocol: z.enum(["HTTP", "TCP", "UDP"]),
    port: z.coerce.number<number>().int().min(1).max(65535),
    algorithm: z.enum(["round_robin", "least_connections", "ip_hash"]),
    health_check_path: z.string().startsWith("/", "Must start with /"),
    health_check_interval_s: z.coerce.number<number>().int().min(5).max(300),
    healthy_threshold: z.coerce.number<number>().int().min(1).max(10),
    unhealthy_threshold: z.coerce.number<number>().int().min(1).max(10),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function TargetGroupCreateWizardPage() {
  useScreen("target-groups.target-group-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateTargetGroup()
  const { rule } = useNamingRule("load-balancer")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      vpc_id: "",
      protocol: "HTTP",
      port: 8080,
      algorithm: "round_robin",
      health_check_path: "/healthz",
      health_check_interval_s: 30,
      healthy_threshold: 3,
      unhealthy_threshold: 3,
    },
    mode: "onTouched",
  })

  const steps: WizardStep<FormValues>[] = [
    {
      id: "basics",
      title: t("targetGroups.wizard.basics"),
      description: t("targetGroups.wizard.basicsDescription"),
      fields: ["name", "vpc_id", "protocol", "port", "algorithm"],
      render: (f) => <BasicsStep form={f} />,
      reviewItems: (v) => [
        { label: t("targetGroups.columns.name"), value: v.name, mono: true },
        {
          label: t("targetGroups.columns.protocol"),
          value: `${v.protocol}:${String(v.port)}`,
          mono: true,
        },
        {
          label: t("targetGroups.columns.algorithm"),
          value: t(`targetGroups.algorithms.${v.algorithm}`),
        },
      ],
    },
    {
      id: "health",
      title: t("targetGroups.wizard.healthChecks"),
      description: t("targetGroups.wizard.healthChecksDescription"),
      fields: [
        "health_check_path",
        "health_check_interval_s",
        "healthy_threshold",
        "unhealthy_threshold",
      ],
      render: (f) => <HealthStep form={f} />,
      reviewItems: (v) => [
        {
          label: t("targetGroups.health.path"),
          value: v.protocol === "HTTP" ? v.health_check_path : t("targetGroups.health.tcpCheck"),
          mono: true,
        },
        {
          label: t("targetGroups.health.interval"),
          value: `${String(v.health_check_interval_s)}s`,
        },
        {
          label: t("targetGroups.health.thresholds"),
          value: t("targetGroups.health.thresholdSummary", {
            healthy: v.healthy_threshold,
            unhealthy: v.unhealthy_threshold,
          }),
        },
      ],
    },
  ]

  const onSubmit = (values: FormValues) => {
    create(values, { onSuccess: (tg) => void navigate(TG_ROUTES.detail(tg.id)) })
  }

  return (
    <>
      <PageHeader
        title={t("targetGroups.wizard.title")}
        description={t("targetGroups.wizard.subtitle")}
        breadcrumbs={[
          { label: t("targetGroups.title"), to: TG_ROUTES.ROOT },
          { label: t("targetGroups.wizard.title") },
        ]}
      />
      <CreateWizard
        steps={steps}
        form={form}
        onSubmit={onSubmit}
        submitLabel={t("targetGroups.actions.create")}
        isSubmitting={isPending}
        onCancel={() => void navigate(TG_ROUTES.ROOT)}
        fullWidth
      />
    </>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: Readonly<{ label: string; hint?: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

function BasicsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form
  const { data: vpcs = [] } = useVPCs()

  return (
    <div className="space-y-5">
      <Field label={t("targetGroups.columns.name")} error={errors.name?.message}>
        <Input {...register("name")} placeholder="web-servers" className="font-mono" />
      </Field>

      <Field label={t("vms.detail.vpc")} error={errors.vpc_id?.message}>
        <Select
          value={watch("vpc_id")}
          onValueChange={(v) => {
            setValue("vpc_id", v, { shouldValidate: true })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("vms.wizard.vpcPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {vpcs.map((vpc) => (
              <SelectItem key={vpc.id} value={vpc.id}>
                {vpc.name} ({vpc.cidr})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("targetGroups.columns.protocol")}
          hint={t("targetGroups.wizard.protocolHint")}
        >
          <Select
            value={watch("protocol")}
            onValueChange={(v) => {
              setValue("protocol", v as FormValues["protocol"], {
                shouldValidate: true,
              })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["HTTP", "TCP", "UDP"] as const).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label={t("targetGroups.wizard.port")}
          hint={t("targetGroups.wizard.portHint")}
          error={errors.port?.message}
        >
          <Input
            {...register("port")}
            inputMode="numeric"
            placeholder="8080"
            className="font-mono"
          />
        </Field>
      </div>

      <Field
        label={t("targetGroups.columns.algorithm")}
        hint={t("targetGroups.wizard.algorithmHint")}
      >
        <Select
          value={watch("algorithm")}
          onValueChange={(v) => {
            setValue("algorithm", v as FormValues["algorithm"], {
              shouldValidate: true,
            })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["round_robin", "least_connections", "ip_hash"] as const).map((a) => (
              <SelectItem key={a} value={a}>
                {t(`targetGroups.algorithms.${a}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

function HealthStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form
  const isHttp = watch("protocol") === "HTTP"

  return (
    <div className="space-y-5">
      {/* A TCP target group cannot do an HTTP health check — HAProxy would
                be in mode tcp, where `option httpchk` is meaningless. The path
                field only appears when it can actually be used. */}
      {isHttp ? (
        <Field
          label={t("targetGroups.health.path")}
          hint={t("targetGroups.wizard.pathHint")}
          error={errors.health_check_path?.message}
        >
          <Input {...register("health_check_path")} className="font-mono" />
        </Field>
      ) : (
        <p className="text-[12px] text-muted-foreground">{t("targetGroups.wizard.tcpCheckHint")}</p>
      )}

      <Field label={t("targetGroups.health.interval")} hint={t("targetGroups.wizard.intervalHint")}>
        <Select
          value={String(watch("health_check_interval_s"))}
          onValueChange={(v) => {
            setValue("health_check_interval_s", Number(v), { shouldValidate: true })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HEALTH_CHECK_INTERVALS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("targetGroups.health.healthyThreshold")}
          hint={t("targetGroups.wizard.healthyHint")}
          error={errors.healthy_threshold?.message}
        >
          <Input {...register("healthy_threshold")} inputMode="numeric" className="font-mono" />
        </Field>
        <Field
          label={t("targetGroups.health.unhealthyThreshold")}
          hint={t("targetGroups.wizard.unhealthyHint")}
          error={errors.unhealthy_threshold?.message}
        >
          <Input {...register("unhealthy_threshold")} inputMode="numeric" className="font-mono" />
        </Field>
      </div>
    </div>
  )
}
