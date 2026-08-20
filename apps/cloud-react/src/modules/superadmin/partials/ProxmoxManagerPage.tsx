import { Fragment, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Activity,
  AlertTriangle,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ServerCog,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react"
import { useForm } from "react-hook-form"
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

/* ── Manager connection ────────────────────────────────────────────────── */

// The manager's port is the one field on this page that is fleet configuration
// rather than per-node state, and it is the field that decides whether every
// row in the table below reads "Healthy" or "Unreachable": the console builds
// http://<node-ip>:<manager_port>/healthz from it. It rides in the lb_settings
// singleton for historical reasons — the manager started life as the load
// balancer's manager — so it is saved through that endpoint, on its own: the
// PUT is a partial update, and this page has no business touching the fields
// the load-balancer page owns.
const schema = z.object({
  manager_port: z.coerce.number().int().min(1).max(65535),
})

type FormValues = z.infer<typeof schema>

// The port the manager binds by default (LB_MANAGER_LISTEN_ADDR=:8080 in
// proxmox-manager). Shown as a placeholder rather than enforced, because a
// deployment is free to move it — but the two ends have to agree, and a
// mismatch here presents as every node being "Unreachable" while the manager is
// perfectly healthy.
const MANAGER_DEFAULT_PORT = 8080

function ManagerConnection({ settings }: Readonly<{ settings: LBSettings }>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useUpdateLBSettings()

  const form = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { manager_port: settings.manager_port },
    mode: "onTouched",
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form

  const onSubmit = (values: FormValues) => {
    save(values, {
      onSuccess: (updated) => {
        reset({ manager_port: updated.manager_port })
      },
    })
  }

  return (
    <Section
      variant="panel"
      title={t("superAdmin.proxmoxManager.connection.title")}
      description={t("superAdmin.proxmoxManager.connection.subtitle")}
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("superAdmin.proxmoxManager.fields.managerPort")}
            hint={t("superAdmin.proxmoxManager.fields.managerPortHint", {
              port: MANAGER_DEFAULT_PORT,
            })}
            error={errors.manager_port?.message}
          >
            <Input
              type="number"
              min={1}
              max={65535}
              placeholder={String(MANAGER_DEFAULT_PORT)}
              {...register("manager_port")}
            />
          </Field>
        </div>

        <AuthenticationNote />

        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-end gap-3 border-t border-border/60 bg-background/80 px-5 py-3 backdrop-blur">
          <span className="mr-auto text-[12px] text-muted-foreground">
            {isDirty
              ? t("superAdmin.proxmoxManager.connection.unsaved")
              : t("superAdmin.proxmoxManager.connection.saved")}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset({ manager_port: settings.manager_port })
            }}
            disabled={!isDirty || isPending}
          >
            <RotateCcw className="size-4" />
            {t("superAdmin.proxmoxManager.actions.reset")}
          </Button>
          <Button type="submit" variant="gold" disabled={!isDirty || isPending} loading={isPending}>
            <Save className="size-4" />
            {t("superAdmin.proxmoxManager.actions.save")}
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
          {t("superAdmin.proxmoxManager.auth.title")}
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {t("superAdmin.proxmoxManager.auth.body")}
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
      {t(`superAdmin.proxmoxManager.managerStatus.${state}`)}
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
                  {t("superAdmin.proxmoxManager.table.checking")}
                </span>
              )
            }
            if (status.isError || !status.data) {
              return (
                <span className="text-[12px] text-muted-foreground">
                  {t("superAdmin.proxmoxManager.table.noStatus")}
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
              {t("superAdmin.proxmoxManager.table.noClientId")}
            </span>
          )}
        </TableCell>
        <TableCell>
          {hasSecret ? (
            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", TONE_CLASSES.success)}>
              <ShieldCheck className="size-3" />
              {t("superAdmin.proxmoxManager.table.secretSet")}
            </Badge>
          ) : (
            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", TONE_CLASSES.neutral)}>
              <ShieldQuestion className="size-3" />
              {t("superAdmin.proxmoxManager.table.secretMissing")}
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
              {t("superAdmin.proxmoxManager.actions.health")}
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
                ? t("superAdmin.proxmoxManager.actions.regenerate")
                : t("superAdmin.proxmoxManager.actions.generate")}
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
                    {t("superAdmin.proxmoxManager.creds.shownOnceTitle")}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {t("superAdmin.proxmoxManager.creds.shownOnceBody")}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("superAdmin.proxmoxManager.creds.clientId")}
                  </p>
                  <CopyButton value={issued.client_id} className="text-[12px]" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("superAdmin.proxmoxManager.creds.secret")}
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
      { id: "node", header: t("superAdmin.proxmoxManager.table.node") },
      { id: "manager", header: t("superAdmin.proxmoxManager.table.manager") },
      { id: "clientId", header: t("superAdmin.proxmoxManager.table.clientId") },
      { id: "secret", header: t("superAdmin.proxmoxManager.table.secret") },
      { id: "actions", header: t("superAdmin.proxmoxManager.table.actions") },
    ],
    [t],
  )

  return (
    <Section
      variant="panel"
      title={t("superAdmin.proxmoxManager.nodes.title")}
      description={t("superAdmin.proxmoxManager.nodes.subtitle")}
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
            {t("superAdmin.proxmoxManager.nodes.empty")}
          </span>
        }
        onRefresh={recheckAll}
        refreshLabel={t("superAdmin.proxmoxManager.actions.recheckAll")}
        error={adminPVENodesError ? t("console.table.error") : undefined}
        onRetry={() => void refetchAdminPVENodes()}
        retryLabel={t("console.table.retry")}
      />
    </Section>
  )
}

/* ── Release token ─────────────────────────────────────────────────────── */

// The GitHub token nodes install their own releases with.
//
// It is write-only by design: the API stores it encrypted and reports only
// whether one exists, so this form can never render the credential back. That is
// also why there is no "current value" to diff against — saving always sends a
// new token, and clearing sends an empty string.
//
// It lives centrally because the alternative is a copy in every cluster's
// /etc/pve/datadack/proxmox-manager.conf, which pmxcfs replicates to every node
// and forces to root:www-data 0640 — readable by pveproxy, and impossible to
// rotate without editing each cluster by hand.
function ReleaseToken({ settings }: Readonly<{ settings: LBSettings }>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useUpdateLBSettings()
  const [token, setToken] = useState("")

  const configured = settings.manager_update_token_set

  const onSave = () => {
    const trimmed = token.trim()
    if (!trimmed) return
    save({ manager_update_token: trimmed }, { onSuccess: () => setToken("") })
  }

  const onClear = () => {
    if (!globalThis.confirm(t("superAdmin.proxmoxManager.updateToken.clearConfirm"))) return
    save({ manager_update_token: "" }, { onSuccess: () => setToken("") })
  }

  return (
    <Section
      variant="panel"
      title={t("superAdmin.proxmoxManager.updateToken.title")}
      description={t("superAdmin.proxmoxManager.updateToken.subtitle")}
    >
      <div className="space-y-5">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border p-3 text-[12px]",
            configured ? TONE_CLASSES.success : TONE_CLASSES.warning,
          )}
        >
          {configured ? (
            <ShieldCheck className="size-4 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          <span>
            {configured
              ? t("superAdmin.proxmoxManager.updateToken.configured")
              : t("superAdmin.proxmoxManager.updateToken.notConfigured")}
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("superAdmin.proxmoxManager.updateToken.label")}
            hint={t("superAdmin.proxmoxManager.updateToken.hint")}
          >
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("superAdmin.proxmoxManager.updateToken.placeholder")}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-4">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {t("superAdmin.proxmoxManager.updateToken.why")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
          {configured ? (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              onClick={onClear}
              disabled={isPending}
            >
              {t("superAdmin.proxmoxManager.updateToken.clear")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="gold"
            onClick={onSave}
            disabled={!token.trim() || isPending}
            loading={isPending}
          >
            <Save className="size-4" />
            {t("superAdmin.proxmoxManager.updateToken.save")}
          </Button>
        </div>
      </div>
    </Section>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

// The management plane that runs ON each Proxmox node. It began as the load
// balancer's manager and was administered from the load-balancer page; it is
// now the node's manager for every LXC workload the platform places there, so it
// gets a page of its own rather than a section inside one product's settings.
export function ProxmoxManagerPage() {
  useScreen("superadmin.proxmox-manager")
  const { t } = useTranslation()
  const { data: settings, isLoading, isError, refetch } = useLBSettings()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ServerCog}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.proxmoxManager.title") },
        ]}
        title={t("superAdmin.proxmoxManager.title")}
        description={t("superAdmin.proxmoxManager.subtitle")}
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
            <Section variant="panel" title={t("superAdmin.proxmoxManager.connection.title")}>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-[13px] text-muted-foreground">
                  {t("superAdmin.proxmoxManager.connection.loadError")}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  <RefreshCw className="size-4" />
                  {t("common.refresh")}
                </Button>
              </div>
            </Section>
          )
        }
        return (
          <Fragment>
            <ManagerConnection settings={settings} />
            <ReleaseToken settings={settings} />
          </Fragment>
        )
      })()}

      <NodeManagers />
    </div>
  )
}
