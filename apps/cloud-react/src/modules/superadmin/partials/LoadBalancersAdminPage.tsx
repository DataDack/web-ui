import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2, RefreshCw, RotateCcw, Save, Scale, ServerCog } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { z } from "zod/v4"

import { PageHeader, Section } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { Button, Input, Switch } from "@datadack/common-ui"

import { Field } from "../components/form-fields"
import { useLBSettings, useUpdateLBSettings } from "../superadmin.hooks"
import type { LBSettings } from "../superadmin.types"

/* ── Fleet configuration form ──────────────────────────────────────────── */

const schema = z.object({
  trace_header: z.string().max(128),
  send_name: z.boolean(),
  name_header: z.string().max(128),
  agent_webhook_port: z.coerce.number().int().min(1).max(65535),
  template_ctid: z.coerce.number().int().min(0),
  control_plane_cidr: z.string().min(1, "Required").max(64),
})

type FormValues = z.infer<typeof schema>

function settingsToValues(s: LBSettings): FormValues {
  return {
    trace_header: s.trace_header,
    send_name: s.send_name,
    name_header: s.name_header,
    agent_webhook_port: s.agent_webhook_port,
    template_ctid: s.template_ctid,
    control_plane_cidr: s.control_plane_cidr,
  }
}

// The backing environment variable each field maps to, surfaced as a subtle
// caption so operators can trace a value back to the process config.
const ENV_VARS = {
  trace_header: "LB_TRACE_HEADER",
  send_name: "LB_SEND_NAME",
  name_header: "LB_NAME_HEADER",
  agent_webhook_port: "LB_AGENT_WEBHOOK_PORT",
  template_ctid: "LB_TEMPLATE_CTID",
  control_plane_cidr: "LB_CONTROL_PLANE_CIDR",
} as const

function EnvCaption({ name }: Readonly<{ name: string }>) {
  return <span className="font-mono text-muted-foreground/70">{name}</span>
}

function FleetConfiguration({ settings }: Readonly<{ settings: LBSettings }>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useUpdateLBSettings()

  const form = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: settingsToValues(settings),
    mode: "onTouched",
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = form

  const sendName = watch("send_name")

  const onSubmit = (values: FormValues) => {
    save(values, {
      onSuccess: (updated) => {
        reset(settingsToValues(updated))
      },
    })
  }

  const onReset = () => {
    reset(settingsToValues(settings))
  }

  return (
    <Section
      variant="panel"
      title={t("superAdmin.loadBalancers.fleet.title")}
      description={t("superAdmin.loadBalancers.fleet.subtitle")}
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("superAdmin.loadBalancers.fields.traceHeader")}
            hint={ENV_VARS.trace_header}
            error={errors.trace_header?.message}
          >
            <Input {...register("trace_header")} placeholder="X-Request-Id" className="font-mono" />
          </Field>

          <Field
            label={t("superAdmin.loadBalancers.fields.controlPlaneCidr")}
            required
            hint={ENV_VARS.control_plane_cidr}
            error={errors.control_plane_cidr?.message}
          >
            <Input
              {...register("control_plane_cidr")}
              // eslint-disable-next-line sonarjs/no-hardcoded-ip -- illustrative placeholder in an empty form field, never dialled
              placeholder="10.10.0.0/24"
              className="font-mono"
            />
          </Field>
        </div>

        {/* send_name toggle gates the name_header input. */}
        <div className="rounded-md border border-border/60 p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-[13px] font-semibold text-foreground">
                {t("superAdmin.loadBalancers.fields.sendName")}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {t("superAdmin.loadBalancers.fields.sendNameHint")}
              </p>
              <EnvCaption name={ENV_VARS.send_name} />
            </div>
            <Controller
              control={control}
              name="send_name"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t("superAdmin.loadBalancers.fields.sendName")}
                />
              )}
            />
          </div>
          <Field
            label={t("superAdmin.loadBalancers.fields.nameHeader")}
            hint={ENV_VARS.name_header}
            error={errors.name_header?.message}
          >
            <Input
              {...register("name_header")}
              placeholder="X-LB-Name"
              className="font-mono"
              disabled={!sendName}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("superAdmin.loadBalancers.fields.agentWebhookPort")}
            hint={ENV_VARS.agent_webhook_port}
            error={errors.agent_webhook_port?.message}
          >
            <Input type="number" min={1} max={65535} {...register("agent_webhook_port")} />
          </Field>
          <Field
            label={t("superAdmin.loadBalancers.fields.templateCtid")}
            hint={ENV_VARS.template_ctid}
            error={errors.template_ctid?.message}
          >
            <Input type="number" min={0} {...register("template_ctid")} />
          </Field>
        </div>

        {/* Sticky save bar — stays in reach while the form scrolls. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-end gap-3 border-t border-border/60 bg-background/80 px-5 py-3 backdrop-blur">
          <span className="mr-auto text-[12px] text-muted-foreground">
            {isDirty
              ? t("superAdmin.loadBalancers.fleet.unsaved")
              : t("superAdmin.loadBalancers.fleet.saved")}
          </span>
          <Button type="button" variant="ghost" onClick={onReset} disabled={!isDirty || isPending}>
            <RotateCcw className="size-4" />
            {t("superAdmin.loadBalancers.actions.reset")}
          </Button>
          <Button type="submit" variant="gold" disabled={!isDirty || isPending} loading={isPending}>
            <Save className="size-4" />
            {t("superAdmin.loadBalancers.actions.save")}
          </Button>
        </div>
      </form>
    </Section>
  )
}

// The manager that serves each node — its port, its health and the credential
// each node authenticates with — used to be administered from this page, back
// when it was the load balancer's manager. It manages every LXC workload the
// platform places on a node now, so it has a page of its own; this points at it
// rather than leaving an operator to find it.
function ManagerLink() {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-status-info/30 bg-status-info-bg/40 p-4">
      <ServerCog className="mt-0.5 size-4 shrink-0 text-status-info" />
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-foreground">
          {t("superAdmin.loadBalancers.managerMoved.title")}
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {t("superAdmin.loadBalancers.managerMoved.body")}
        </p>
        <Link
          to="/admin/proxmox-manager"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-status-info hover:underline"
        >
          {t("superAdmin.proxmoxManager.title")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function LoadBalancersAdminPage() {
  useScreen("superadmin.load-balancers")
  const { t } = useTranslation()
  const { data: settings, isLoading, isError, refetch } = useLBSettings()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Scale}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.loadBalancers.title") },
        ]}
        title={t("superAdmin.loadBalancers.title")}
        description={t("superAdmin.loadBalancers.subtitle")}
      />

      {(() => {
        if (isLoading) {
          return (
            <div className="grid place-items-center py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )
        }
        if (isError || !settings) {
          return (
            <Section variant="panel" title={t("superAdmin.loadBalancers.fleet.title")}>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-[13px] text-muted-foreground">
                  {t("superAdmin.loadBalancers.fleet.loadError")}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  <RefreshCw className="size-4" />
                  {t("common.refresh")}
                </Button>
              </div>
            </Section>
          )
        }
        return <FleetConfiguration settings={settings} />
      })()}

      <ManagerLink />
    </div>
  )
}
