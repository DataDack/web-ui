import { useMemo, useState } from "react"

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, KeyRound, Loader2, Server, ShieldCheck } from "lucide-react"
import { Controller, useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod/v4"

import {
  CopyButton,
  CreateWizard,
  PageHeader,
  Section,
  type WizardStep,
} from "@/components/console"
import { useScreen } from "@/services/api/screen"

import {
  useAdminAvailabilityZones,
  useAdminPVENode,
  useGenerateAgentCredentials,
  useSavePVENode,
} from "../superadmin.hooks"
import type {
  AgentCredentials,
  AvailabilityZone,
  CreatePVENodeRequest,
  PVENode,
  UpdatePVENodeRequest,
} from "../superadmin.types"

const LIST_PATH = "/admin/pve-nodes"
const STATUSES = ["online", "offline", "maintenance"] as const

const schema = z.object({
  availability_zone_id: z.string().min(1, "Required"),
  name: z.string().min(2, "Min 2 characters").max(128),
  ip_address: z.string().min(1, "Required").max(64),
  username: z.string().min(1, "Required").max(64),
  password: z.string().max(256),
  token: z.string().max(512),
  webhook_secret: z.string().max(512),
  status: z.enum(STATUSES),
  cpu_total: z.coerce.number().int().min(0),
  ram_total_mb: z.coerce.number().int().min(0),
  storage_total_gb: z.coerce.number().int().min(0),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  availability_zone_id: "",
  name: "",
  ip_address: "",
  username: "root",
  password: "",
  token: "",
  webhook_secret: "",
  status: "online",
  cpu_total: 0,
  ram_total_mb: 0,
  storage_total_gb: 0,
}

// Secrets are never read back from the API, so the review step can only report
// whether this submission sets a new value or leaves the stored one alone.
function secretReview(value: string, isEdit: boolean, unchanged: string) {
  if (value.length > 0) return "••••••••"
  return isEdit ? unchanged : "—"
}

// The node's stored values, as the form models them. Secrets are deliberately
// blank: the API never reads them back, and leaving a secret field empty means
// "keep the stored one" (see onSubmit).
function nodeToValues(node: PVENode): FormValues {
  return {
    availability_zone_id: node.availability_zone_id,
    name: node.name,
    ip_address: node.ip_address,
    username: node.username,
    password: "",
    token: "",
    webhook_secret: "",
    status: node.status,
    cpu_total: node.cpu_total,
    ram_total_mb: node.ram_total_mb,
    storage_total_gb: node.storage_total_gb,
  }
}

/**
 * Fetches what the form needs, then hands it to the form as DEFAULT VALUES.
 *
 * The form is only created once the node (and the AZ list) are in hand, so it is
 * never seeded by a reset() after mount. That ordering matters: the AZ <Select>
 * is a <Controller> nested inside the wizard's animated subtree, so it registers
 * a tick late and registration writes back the value it captured at mount. A
 * reset() that lands before that registration gets silently clobbered — the
 * zone falls back to the placeholder while the register()-bound inputs (which
 * reset() writes straight to the DOM) still look correct. Whether that race was
 * lost depended on which query resolved first, so the zone appeared blank
 * exactly when the AZ list arrived before the node.
 */
export function PVENodeFormPage() {
  useScreen("superadmin.p-v-e-node-form")
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { data: azs = [], isLoading: azsLoading } = useAdminAvailabilityZones()
  const { data: node = null, isLoading: nodeLoading } = useAdminPVENode(isEdit ? id : undefined)

  if (azsLoading || (isEdit && (nodeLoading || !node))) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return (
    <PVENodeForm
      key={node?.id ?? "new"}
      node={node}
      azs={azs}
      initialValues={node ? nodeToValues(node) : EMPTY}
    />
  )
}

function PVENodeForm({
  node,
  azs,
  initialValues,
}: Readonly<{ node: PVENode | null; azs: AvailabilityZone[]; initialValues: FormValues }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isEdit = !!node
  const id = node?.id

  const { mutate: save, isPending } = useSavePVENode()

  const back = () => void navigate(LIST_PATH)

  const form = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: "onTouched",
  })

  const azCode = useMemo(() => {
    const byId = new Map(azs.map((a) => [a.id, a.code]))
    return (azId: string) => byId.get(azId) ?? azId
  }, [azs])

  const steps = useMemo<WizardStep<FormValues>[]>(
    () => [
      {
        id: "placement",
        title: t("superAdmin.pveNodes.wizard.placement"),
        description: t("superAdmin.pveNodes.wizard.placementDesc"),
        fields: ["availability_zone_id", "name"],
        render: (f) => <PlacementStep form={f} azs={azs} />,
        reviewItems: (v) => [
          {
            label: t("superAdmin.pveNodes.fields.availabilityZone"),
            value: azCode(v.availability_zone_id),
            mono: true,
          },
          { label: t("superAdmin.pveNodes.fields.name"), value: v.name, mono: true },
        ],
      },
      {
        id: "connection",
        title: t("superAdmin.pveNodes.wizard.connection"),
        description: t("superAdmin.pveNodes.wizard.connectionDesc"),
        fields: ["ip_address", "username", "password", "webhook_secret", "status"],
        render: (f) => <ConnectionStep form={f} isEdit={isEdit} />,
        reviewItems: (v) => [
          {
            label: t("superAdmin.pveNodes.fields.ipAddress"),
            value: v.ip_address,
            mono: true,
          },
          {
            label: t("superAdmin.pveNodes.fields.username"),
            value: v.username,
            mono: true,
          },
          {
            label: t("superAdmin.pveNodes.fields.password"),
            value: secretReview(v.password, isEdit, t("superAdmin.pveNodes.fields.unchanged")),
          },
          {
            label: t("superAdmin.pveNodes.fields.token"),
            value: v.token.length > 0 ? "••••••••" : "—",
          },
          {
            label: t("superAdmin.pveNodes.fields.webhookSecret"),
            value: secretReview(
              v.webhook_secret,
              isEdit,
              t("superAdmin.pveNodes.fields.unchanged"),
            ),
          },
          {
            label: t("superAdmin.pveNodes.fields.status"),
            value: t(`superAdmin.pveNodes.status.${v.status}`),
          },
        ],
      },
      {
        id: "capacity",
        title: t("superAdmin.pveNodes.wizard.capacity"),
        description: t("superAdmin.pveNodes.wizard.capacityDesc"),
        fields: ["cpu_total", "ram_total_mb", "storage_total_gb"],
        render: (f) => <CapacityStep form={f} />,
        reviewItems: (v) => [
          {
            label: t("superAdmin.pveNodes.fields.cpuTotal"),
            value: String(v.cpu_total),
            mono: true,
          },
          {
            label: t("superAdmin.pveNodes.fields.ramTotal"),
            value: `${String(v.ram_total_mb)} MB`,
            mono: true,
          },
          {
            label: t("superAdmin.pveNodes.fields.storageTotal"),
            value: `${String(v.storage_total_gb)} GB`,
            mono: true,
          },
        ],
      },
    ],
    [t, isEdit, azCode, azs],
  )

  const onSubmit = (values: FormValues) => {
    const password = values.password.length > 0 ? values.password : undefined
    const token = values.token.length > 0 ? values.token : undefined
    // Omitted (not "") when blank — the API encrypts whatever it is sent, so an
    // empty string would overwrite the stored secret with an encrypted "".
    const webhookSecret = values.webhook_secret.length > 0 ? values.webhook_secret : undefined
    const body: CreatePVENodeRequest | UpdatePVENodeRequest = isEdit
      ? {
          availability_zone_id: values.availability_zone_id,
          name: values.name,
          ip_address: values.ip_address,
          username: values.username,
          password,
          token,
          webhook_secret: webhookSecret,
          status: values.status,
          cpu_total: values.cpu_total,
          ram_total_mb: values.ram_total_mb,
          storage_total_gb: values.storage_total_gb,
        }
      : {
          availability_zone_id: values.availability_zone_id,
          name: values.name,
          ip_address: values.ip_address,
          username: values.username,
          password: values.password,
          token,
          webhook_secret: webhookSecret,
          status: values.status,
          cpu_total: values.cpu_total,
          ram_total_mb: values.ram_total_mb,
          storage_total_gb: values.storage_total_gb,
        }
    save({ id, payload: body }, { onSuccess: back })
  }

  return (
    <div>
      <PageHeader
        icon={Server}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.pveNodes.title"), to: LIST_PATH },
          {
            label: isEdit
              ? t("superAdmin.pveNodes.editTitle")
              : t("superAdmin.pveNodes.createTitle"),
          },
        ]}
        title={isEdit ? t("superAdmin.pveNodes.editTitle") : t("superAdmin.pveNodes.createTitle")}
        description={t("superAdmin.pveNodes.formSubtitle")}
      />

      <CreateWizard<FormValues, z.input<typeof schema>>
        steps={steps}
        form={form}
        submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
        isSubmitting={isPending}
        onCancel={back}
        onSubmit={onSubmit}
      />

      {node && (
        <div className="mx-auto mt-6 max-w-2xl">
          <AgentCredentialsSection node={node} />
        </div>
      )}
    </div>
  )
}

/* ── Agent credentials ─────────────────────────────────────────────────── */

// Per-node lbagent credential (client_id + secret). The secret is only ever
// returned once, at generate/regenerate time, so this panel captures it into
// local state and renders it in a copyable, warned callout; refetches never
// re-expose it. Editing a node is the only place this makes sense (it needs the
// node id), so the parent only mounts it in edit mode.
function AgentCredentialsSection({ node }: Readonly<{ node: PVENode }>) {
  const { t } = useTranslation()
  const { mutate: generate, isPending } = useGenerateAgentCredentials()
  // The freshly-minted pair, shown once. Cleared on unmount / navigation.
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
    <Section
      variant="panel"
      title={t("superAdmin.pveNodes.agentCredentials.title")}
      description={t("superAdmin.pveNodes.agentCredentials.subtitle")}
      actions={
        <Button
          type="button"
          variant={hasSecret ? "outline" : "default"}
          size="sm"
          onClick={onGenerate}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" />
          )}
          {hasSecret
            ? t("superAdmin.pveNodes.agentCredentials.regenerate")
            : t("superAdmin.pveNodes.agentCredentials.generate")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>{t("superAdmin.pveNodes.agentCredentials.clientId")}</FieldLabel>
            {clientId ? (
              <CopyButton value={clientId} className="text-[13px]" />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {t("superAdmin.pveNodes.agentCredentials.noClientId")}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <FieldLabel>{t("superAdmin.pveNodes.agentCredentials.secretState")}</FieldLabel>
            <div className="flex items-center gap-1.5 text-[13px]">
              {hasSecret ? (
                <>
                  <ShieldCheck className="size-4 text-status-success" />
                  <span className="text-foreground">
                    {t("superAdmin.pveNodes.agentCredentials.secretSet")}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  {t("superAdmin.pveNodes.agentCredentials.secretUnset")}
                </span>
              )}
            </div>
          </div>
        </div>

        {issued ? (
          <div className="space-y-3 rounded-md border border-status-warning/40 bg-status-warning/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
              <div className="space-y-0.5">
                <p className="text-[13px] font-semibold text-foreground">
                  {t("superAdmin.pveNodes.agentCredentials.shownOnceTitle")}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t("superAdmin.pveNodes.agentCredentials.shownOnceBody")}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>{t("superAdmin.pveNodes.agentCredentials.clientId")}</FieldLabel>
              <CopyButton value={issued.client_id} className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>{t("superAdmin.pveNodes.agentCredentials.secret")}</FieldLabel>
              <CopyButton value={issued.secret} className="text-[13px] break-all" />
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {hasSecret
              ? t("superAdmin.pveNodes.agentCredentials.regenerateHint")
              : t("superAdmin.pveNodes.agentCredentials.generateHint")}
          </p>
        )}
      </div>
    </Section>
  )
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

// The AZ list is already loaded by the time this renders (the page holds the
// spinner until it is), so there is no loading state to model here.
function PlacementStep({
  form,
  azs,
}: Readonly<{
  form: UseFormReturn<FormValues>
  azs: AvailabilityZone[]
}>) {
  const { t } = useTranslation()
  const noAZs = azs.length === 0

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.pveNodes.fields.availabilityZone")} *</FieldLabel>
        <Controller
          control={form.control}
          name="availability_zone_id"
          render={({ field }) => {
            // Render the label ourselves: Radix <SelectValue> only learns an
            // item's text once it has been mounted (items mount lazily on open),
            // so a value set via reset() wouldn't display until first opened.
            const value = field.value ? field.value : ""
            const selected = azs.find((a) => a.id === value)
            const label = selected?.code ?? value
            return (
              <Select value={value || undefined} onValueChange={field.onChange} disabled={noAZs}>
                <SelectTrigger className="w-full">
                  {label ? (
                    <span className={selected ? undefined : "font-mono text-muted-foreground"}>
                      {label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("superAdmin.pveNodes.fields.availabilityZonePlaceholder")}
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {azs.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {t("superAdmin.pveNodes.fields.noAZs")}
                    </div>
                  ) : (
                    azs.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )
          }}
        />
        <FieldError message={form.formState.errors.availability_zone_id?.message} />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.pveNodes.fields.name")} *</FieldLabel>
        <Input {...form.register("name")} placeholder="pve-node-01" className="font-mono" />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
    </div>
  )
}

function ConnectionStep({
  form,
  isEdit,
}: Readonly<{ form: UseFormReturn<FormValues>; isEdit: boolean }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FieldLabel>{t("superAdmin.pveNodes.fields.ipAddress")} *</FieldLabel>
          <Input
            {...form.register("ip_address")}
            // eslint-disable-next-line sonarjs/no-hardcoded-ip -- illustrative placeholder in an empty form field, never dialled
            placeholder="10.0.0.1"
            className="font-mono"
          />
          <FieldError message={form.formState.errors.ip_address?.message} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>{t("superAdmin.pveNodes.fields.username")} *</FieldLabel>
          <Input {...form.register("username")} placeholder="root" className="font-mono" />
          <FieldError message={form.formState.errors.username?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>
          {t("superAdmin.pveNodes.fields.password")}
          {!isEdit && " *"}
        </FieldLabel>
        <Input type="password" {...form.register("password")} autoComplete="new-password" />
        {isEdit && (
          <p className="text-[11px] text-muted-foreground">
            {t("superAdmin.pveNodes.fields.passwordEditHint")}
          </p>
        )}
        <FieldError message={form.formState.errors.password?.message} />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.pveNodes.fields.token")}</FieldLabel>
        <Input {...form.register("token")} className="font-mono" />
        <p className="text-[11px] text-muted-foreground">
          {t("superAdmin.pveNodes.fields.tokenHint")}
        </p>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.pveNodes.fields.webhookSecret")}</FieldLabel>
        <Input type="password" {...form.register("webhook_secret")} autoComplete="new-password" />
        <p className="text-[11px] text-muted-foreground">
          {isEdit
            ? t("superAdmin.pveNodes.fields.webhookSecretEditHint")
            : t("superAdmin.pveNodes.fields.webhookSecretHint")}
        </p>
        <FieldError message={form.formState.errors.webhook_secret?.message} />
      </div>

      <div className="space-y-1.5 max-w-xs">
        <FieldLabel>{t("superAdmin.pveNodes.fields.status")}</FieldLabel>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <span>{t(`superAdmin.pveNodes.status.${field.value}`)}</span>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`superAdmin.pveNodes.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  )
}

function CapacityStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.pveNodes.fields.cpuTotal")}</FieldLabel>
        <Input type="number" min={0} {...form.register("cpu_total")} />
        <FieldError message={form.formState.errors.cpu_total?.message} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.pveNodes.fields.ramTotal")}</FieldLabel>
        <Input type="number" min={0} {...form.register("ram_total_mb")} />
        <FieldError message={form.formState.errors.ram_total_mb?.message} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{t("superAdmin.pveNodes.fields.storageTotal")}</FieldLabel>
        <Input type="number" min={0} {...form.register("storage_total_gb")} />
        <FieldError message={form.formState.errors.storage_total_gb?.message} />
      </div>
    </div>
  )
}
