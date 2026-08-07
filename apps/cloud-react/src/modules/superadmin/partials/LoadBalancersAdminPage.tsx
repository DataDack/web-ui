import { Fragment, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  Activity,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  Server,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { PageHeader, Section } from "@/components/console"
import { TONE_CLASSES, TONE_DOT_CLASSES, type StatusTone } from "@/components/console/status-config"
import { useScreen } from "@/services/api/screen"

import {
  Badge,
  Button,
  cn,
  CopyButton,
  DataTable,
  Input,
  Switch,
  TableCell,
  TableRow,
} from "@datadack/common-ui"

import { Field } from "../components/form-fields"
import { SUPERADMIN_QUERY_KEYS } from "../superadmin.constants"
import {
  useAdminPVENodes,
  useGenerateAgentCredentials,
  useLBSettings,
  useManagerStatus,
  useUpdateLBSettings,
} from "../superadmin.hooks"
import type { AgentCredentials, LBSettings, ManagerStatusState, PVENode } from "../superadmin.types"

/* ── Fleet configuration form ──────────────────────────────────────────── */

const schema = z.object({
  trace_header: z.string().max(128),
  send_name: z.boolean(),
  name_header: z.string().max(128),
  agent_webhook_port: z.coerce.number().int().min(1).max(65535),
  manager_port: z.coerce.number().int().min(1).max(65535),
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
    manager_port: s.manager_port,
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
  manager_port: "LB_MANAGER_PORT",
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

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label={t("superAdmin.loadBalancers.fields.agentWebhookPort")}
            hint={ENV_VARS.agent_webhook_port}
            error={errors.agent_webhook_port?.message}
          >
            <Input type="number" min={1} max={65535} {...register("agent_webhook_port")} />
          </Field>
          <Field
            label={t("superAdmin.loadBalancers.fields.managerPort")}
            hint={ENV_VARS.manager_port}
            error={errors.manager_port?.message}
          >
            <Input type="number" min={1} max={65535} {...register("manager_port")} />
          </Field>
          <Field
            label={t("superAdmin.loadBalancers.fields.templateCtid")}
            hint={ENV_VARS.template_ctid}
            error={errors.template_ctid?.message}
          >
            <Input type="number" min={0} {...register("template_ctid")} />
          </Field>
        </div>

        <AuthenticationNote />

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

function AuthenticationNote() {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-status-info/30 bg-status-info-bg/40 p-4">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-status-info" />
      <div className="space-y-0.5">
        <p className="text-[13px] font-semibold text-foreground">
          {t("superAdmin.loadBalancers.auth.title")}
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {t("superAdmin.loadBalancers.auth.body")}
        </p>
      </div>
    </div>
  )
}

/* ── Node managers table ───────────────────────────────────────────────── */

const STATUS_TONE: Record<ManagerStatusState, StatusTone> = {
  healthy: "success",
  unreachable: "danger",
  no_manager: "warning",
}

function ManagerStatusPill({ state }: Readonly<{ state: ManagerStatusState }>) {
  const { t } = useTranslation()
  const tone = STATUS_TONE[state]
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] gap-1.5", TONE_CLASSES[tone])}>
      <span className={cn("size-1.5 rounded-full", TONE_DOT_CLASSES[tone])} />
      {t(`superAdmin.loadBalancers.managerStatus.${state}`)}
    </Badge>
  )
}

// One node row. Owns its own manager-status query (enabled on mount so the pill
// populates); the "Health" button refetches it, and the parent's "Re-check all"
// invalidates the shared manager-status key which refetches every mounted row.
function NodeManagerRow({ node }: Readonly<{ node: PVENode }>) {
  const { t } = useTranslation()
  const status = useManagerStatus(node.id, true)
  const { mutate: generate, isPending: generating } = useGenerateAgentCredentials()
  const [issued, setIssued] = useState<AgentCredentials | null>(null)

  const hasSecret = !!node.has_agent_secret
  const clientId = issued?.client_id ?? node.agent_client_id

  const onGenerate = () => {
    generate(
      { id: node.id },
      {
        onSuccess: (creds) => {
          setIssued(creds)
        },
      },
    )
  }

  return (
    <Fragment>
      <TableRow>
        <TableCell>
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-[14px] font-semibold leading-tight text-foreground">
              <Server className="size-4 text-muted-foreground" />
              {node.name}
            </span>
            <span className="ml-6 mt-0.5 font-mono text-[11px] text-muted-foreground">
              {node.ip_address}
            </span>
          </div>
        </TableCell>
        <TableCell>
          {(() => {
            if (status.isLoading || status.isFetching) {
              return (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("superAdmin.loadBalancers.table.checking")}
                </span>
              )
            }
            if (status.isError || !status.data) {
              return (
                <span className="text-[12px] text-muted-foreground">
                  {t("superAdmin.loadBalancers.table.noStatus")}
                </span>
              )
            }
            return (
              <div className="flex flex-col gap-1">
                <ManagerStatusPill state={status.data.status} />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {status.data.manager_url}
                  {status.data.status === "healthy" && ` · ${String(status.data.latency_ms)}ms`}
                </span>
              </div>
            )
          })()}
        </TableCell>
        <TableCell>
          {clientId ? (
            <CopyButton value={clientId} className="text-[12px]" />
          ) : (
            <span className="text-[12px] text-muted-foreground">
              {t("superAdmin.loadBalancers.table.noClientId")}
            </span>
          )}
        </TableCell>
        <TableCell>
          {hasSecret ? (
            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", TONE_CLASSES.success)}>
              <ShieldCheck className="size-3" />
              {t("superAdmin.loadBalancers.table.secretSet")}
            </Badge>
          ) : (
            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", TONE_CLASSES.neutral)}>
              <ShieldQuestion className="size-3" />
              {t("superAdmin.loadBalancers.table.secretMissing")}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void status.refetch()}
              disabled={status.isFetching}
            >
              <Activity className={cn("size-4", status.isFetching && "animate-pulse")} />
              {t("superAdmin.loadBalancers.actions.health")}
            </Button>
            <Button
              type="button"
              variant={hasSecret ? "outline" : "default"}
              size="sm"
              onClick={onGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              {hasSecret
                ? t("superAdmin.loadBalancers.actions.regenerate")
                : t("superAdmin.loadBalancers.actions.generate")}
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {issued && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="py-3">
            <div className="space-y-3 rounded-md border border-status-warning/40 bg-status-warning/10 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-foreground">
                    {t("superAdmin.loadBalancers.creds.shownOnceTitle")}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {t("superAdmin.loadBalancers.creds.shownOnceBody")}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("superAdmin.loadBalancers.creds.clientId")}
                  </p>
                  <CopyButton value={issued.client_id} className="text-[12px]" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("superAdmin.loadBalancers.creds.secret")}
                  </p>
                  <CopyButton value={issued.secret} className="text-[12px] break-all" />
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}

function NodeManagers() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const {
    data: nodes = [],
    isLoading,
    isError: adminPVENodesError,
    refetch: refetchAdminPVENodes,
  } = useAdminPVENodes()

  // Refetch every mounted row's manager-status query at once.
  const recheckAll = () =>
    void queryClient.invalidateQueries({ queryKey: SUPERADMIN_QUERY_KEYS.managerStatus })

  // Headers only — renderRow below supplies every cell.
  const columns = useMemo<ColumnDef<PVENode>[]>(
    () => [
      { id: "node", header: t("superAdmin.loadBalancers.table.node") },
      { id: "manager", header: t("superAdmin.loadBalancers.table.manager") },
      { id: "clientId", header: t("superAdmin.loadBalancers.table.clientId") },
      { id: "secret", header: t("superAdmin.loadBalancers.table.secret") },
      { id: "actions", header: t("superAdmin.loadBalancers.table.actions") },
    ],
    [t],
  )

  return (
    <Section
      variant="panel"
      title={t("superAdmin.loadBalancers.nodes.title")}
      description={t("superAdmin.loadBalancers.nodes.subtitle")}
    >
      <DataTable<PVENode>
        data={nodes}
        columns={columns}
        loading={isLoading}
        getRowId={(node) => node.id}
        // Every row is a NodeManagerRow: it runs its own manager-status query and
        // holds the credentials it just issued, so it has to be a component. The
        // columns above exist for their headers.
        renderRow={(node) => <NodeManagerRow node={node} />}
        empty={
          <span className="text-[13px] text-muted-foreground">
            {t("superAdmin.loadBalancers.nodes.empty")}
          </span>
        }
        onRefresh={recheckAll}
        refreshLabel={t("superAdmin.loadBalancers.actions.recheckAll")}
        error={adminPVENodesError ? t("console.table.error") : undefined}
        onRetry={() => void refetchAdminPVENodes()}
        retryLabel={t("console.table.retry")}
      />
    </Section>
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

      <NodeManagers />
    </div>
  )
}
