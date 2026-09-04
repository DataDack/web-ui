import { useMemo } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, Webhook } from "lucide-react"
import { Controller, useFieldArray, useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { CreateWizard, PageHeader, SegmentedControl, type WizardStep } from "@/components/console"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import { useRegions } from "../vpc.hooks"
import {
  APIGW_ROUTES,
  ENDPOINT_TYPE_OPTIONS,
  HTTP_METHODS,
  INTEGRATION_TYPE_OPTIONS,
  PROTOCOL_OPTIONS,
} from "./apigw.constants"
import { useCreateAPI } from "./apigw.hooks"
const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    description: z.string().max(500),
    region: z.string().min(1, "Required"),
    protocol_type: z.enum(["HTTP", "WEBSOCKET", "REST"]),
    endpoint_type: z.enum(["REGIONAL", "EDGE", "PRIVATE"]),
    ip_address_type: z.enum(["ipv4", "dualstack"]),
    security_policy: z.enum(["TLS_1_0", "TLS_1_2"]),
    version: z.string(),
    disable_execute_api_endpoint: z.boolean(),
    route_selection_expression: z.string(),
    api_key_selection_expression: z.string(),
    routes: z.array(
      z.object({
        method: z.string(),
        path: z.string().refine((v) => v.startsWith("/"), "Path must start with /"),
        integration_target: z.string(),
        integration_type: z.enum(["HTTP_PROXY", "HTTP", "AWS_PROXY", "AWS", "MOCK"]),
      }),
    ),
    stages: z.array(z.object({ name: z.string().min(1, "Required"), auto_deploy: z.boolean() })),
  })
type Values = z.infer<ReturnType<typeof makeSchema>>
const LABEL = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"
export function APIGatewayCreatePage() {
  useScreen("vpc.api-gateway-create")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { rule } = useNamingRule("api-gateway")
  const schema = useMemo(() => makeSchema(rule), [rule])
  const { mutateAsync: create, isPending } = useCreateAPI()
  const quotaBlocked = useQuotaBlocked("vpc.api_gateways")
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      region: "",
      protocol_type: "HTTP",
      endpoint_type: "REGIONAL",
      ip_address_type: "ipv4",
      security_policy: "TLS_1_2",
      version: "1.0",
      disable_execute_api_endpoint: false,
      route_selection_expression: "$request.method $request.path",
      api_key_selection_expression: "$request.header.x-api-key",
      routes: [],
      stages: [{ name: "$default", auto_deploy: true }],
    },
    mode: "onTouched",
  })
  const values = form.watch()
  const steps = useMemo<WizardStep<Values>[]>(
    () => [
      {
        id: "configure",
        title: t("apiGateway.wizard.configure.title"),
        description: t("apiGateway.wizard.configure.description"),
        fields: [
          "name",
          "description",
          "region",
          "protocol_type",
          "endpoint_type",
          "ip_address_type",
          "security_policy",
          "version",
          "disable_execute_api_endpoint",
          "route_selection_expression",
          "api_key_selection_expression",
        ],
        render: (f) => <Configure form={f} />,
        reviewItems: (v) => [
          { label: t("apiGateway.fields.name"), value: v.name, mono: true },
          { label: t("apiGateway.fields.region"), value: v.region, mono: true },
          { label: t("apiGateway.fields.protocol"), value: v.protocol_type },
        ],
      },
      {
        id: "routes",
        title: t("apiGateway.wizard.routes.title"),
        description: t("apiGateway.wizard.routes.description"),
        fields: ["routes"],
        render: (f) => <Routes form={f} />,
        reviewItems: (v) => [
          {
            label: t("apiGateway.wizard.routes.title"),
            value: v.routes.length ? `${v.routes.length}` : t("apiGateway.wizard.routes.none"),
          },
        ],
      },
      {
        id: "stages",
        title: t("apiGateway.wizard.stages.title"),
        description: t("apiGateway.wizard.stages.description"),
        fields: ["stages"],
        render: (f) => <Stages form={f} />,
        reviewItems: (v) => [
          {
            label: t("apiGateway.wizard.stages.title"),
            value: v.stages.length
              ? `${v.stages.length}`
              : t("apiGateway.wizard.stages.defaultCreated"),
          },
        ],
      },
    ],
    [t],
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        icon={Webhook}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("apiGateway.title"), to: APIGW_ROUTES.LIST },
          { label: t("apiGateway.create.action") },
        ]}
        title={t("apiGateway.create.title")}
        description={t("apiGateway.create.description")}
      />
      <CreateWizard
        steps={steps}
        form={form}
        submitLabel={t("apiGateway.create.submit")}
        isSubmitting={isPending}
        submitDisabled={quotaBlocked}
        onCancel={() => void navigate(APIGW_ROUTES.LIST)}
        onSubmit={async (v) => {
          const api = await create({
            ...v,
            routes: v.routes.map((r) => ({
              ...r,
              integration_target: r.integration_target || undefined,
            })),
            stages: v.stages,
          })
          void navigate(APIGW_ROUTES.detail(api.id))
        }}
        aside={({ stepIndex }) => <Preview values={values} step={stepIndex} />}
      />
    </div>
  )
}
function Configure({ form }: Readonly<{ form: UseFormReturn<Values> }>) {
  const { t } = useTranslation()
  const { data: regions = [] } = useRegions()
  const protocol = form.watch("protocol_type")
  return (
    <div className="space-y-5">
      <QuotaNotice code="vpc.api_gateways" />
      <Field label={t("apiGateway.fields.name")} error={form.formState.errors.name?.message}>
        <Input className="font-mono" {...form.register("name")} />
      </Field>
      <Field label={t("apiGateway.fields.description")}>
        <Textarea rows={3} {...form.register("description")} />
      </Field>
      <Field label={t("apiGateway.fields.region")} error={form.formState.errors.region?.message}>
        <Controller
          name="region"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("apiGateway.fields.regionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <div className="space-y-2">
        <Label className={LABEL}>{t("apiGateway.fields.protocol")}</Label>
        <Controller
          name="protocol_type"
          control={form.control}
          render={({ field }) => (
            <SegmentedControl
              value={field.value}
              onChange={(v) => {
                field.onChange(v)
              }}
              options={PROTOCOL_OPTIONS}
              ariaLabel={t("apiGateway.fields.protocol")}
              showLabels
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          {PROTOCOL_OPTIONS.find((o) => o.value === protocol)?.description}
        </p>
      </div>
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced">
          <AccordionTrigger>{t("apiGateway.wizard.advanced")}</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-3">
            <Field label={t("apiGateway.fields.endpointType")}>
              <Controller
                name="endpoint_type"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENDPOINT_TYPE_OPTIONS.map((o) => (
                        <SelectItem value={o.value} key={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("apiGateway.fields.ipType")}>
                <Controller
                  name="ip_address_type"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ipv4">IPv4</SelectItem>
                        <SelectItem value="dualstack">Dual-stack</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label={t("apiGateway.fields.tlsPolicy")}>
                <Controller
                  name="security_policy"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TLS_1_2">TLS 1.2</SelectItem>
                        <SelectItem value="TLS_1_0">TLS 1.0</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <Field label={t("apiGateway.fields.version")}>
              <Input {...form.register("version")} />
            </Field>
            <Field label={t("apiGateway.fields.routeExpression")}>
              <Input className="font-mono" {...form.register("route_selection_expression")} />
            </Field>
            <Field label={t("apiGateway.fields.keyExpression")}>
              <Input className="font-mono" {...form.register("api_key_selection_expression")} />
            </Field>
            <Controller
              name="disable_execute_api_endpoint"
              control={form.control}
              render={({ field }) => (
                <div className="flex justify-between rounded-md border p-3">
                  <Label>{t("apiGateway.fields.disableEndpoint")}</Label>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
function Routes({ form }: Readonly<{ form: UseFormReturn<Values> }>) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "routes" })
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("apiGateway.wizard.routes.later")}</p>
      {fields.map((row, i) => (
        <Card className="glass-1 p-3" key={row.id}>
          <div className="grid gap-3 lg:grid-cols-[110px_1fr_1fr_170px_auto]">
            <Controller
              name={`routes.${i}.method`}
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <div>
              <Input
                className="font-mono"
                placeholder="/some/path/parts"
                {...form.register(`routes.${i}.path`)}
              />
              <Err message={form.formState.errors.routes?.[i]?.path?.message} />
            </div>
            <Input
              className="font-mono"
              placeholder="https://api.example.com"
              {...form.register(`routes.${i}.integration_target`)}
            />
            <Controller
              name={`routes.${i}.integration_type`}
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("apiGateway.wizard.routes.remove")}
              onClick={() => {
                remove(i)
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          append({
            method: "ANY",
            path: "/",
            integration_target: "",
            integration_type: "HTTP_PROXY",
          })
        }}
      >
        <Plus className="size-4" />
        {t("apiGateway.wizard.routes.add")}
      </Button>
    </div>
  )
}
function Stages({ form }: Readonly<{ form: UseFormReturn<Values> }>) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "stages" })
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t("apiGateway.wizard.stages.autoDeployHelp")}
      </p>
      {fields.map((row, i) => (
        <div className="flex items-center gap-3 rounded-md border p-3" key={row.id}>
          <Input className="font-mono" {...form.register(`stages.${i}.name`)} />
          <Controller
            name={`stages.${i}.auto_deploy`}
            control={form.control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {t("apiGateway.wizard.stages.autoDeploy")}
              </label>
            )}
          />
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("apiGateway.wizard.stages.remove")}
            onClick={() => {
              remove(i)
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("apiGateway.wizard.stages.defaultCreated")}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          append({ name: "", auto_deploy: true })
        }}
      >
        <Plus className="size-4" />
        {t("apiGateway.wizard.stages.add")}
      </Button>
    </div>
  )
}
function Preview({ values, step }: Readonly<{ values: Values; step: number }>) {
  const { t } = useTranslation()
  return (
    <Card className="glass-3 w-full p-4 lg:w-80">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("apiGateway.preview.title")}
      </p>
      <div className={`mt-4 rounded-md p-2 ${step === 0 ? "bg-primary/10" : ""}`}>
        <p className="font-semibold">{values.name || t("apiGateway.preview.unnamed")}</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
          https://{values.name || "api"}.{values.region || "region"}.gateway.example.com
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("apiGateway.preview.routingInactive")}
        </p>
      </div>
      <div className={`mt-2 rounded-md p-2 ${step === 1 ? "bg-primary/10" : ""}`}>
        <p className="text-xs font-semibold">{t("apiGateway.preview.routes")}</p>
        {values.routes.map((r, i) => (
          <p className="mt-1 truncate font-mono text-[11px]" key={i}>
            {r.method} {r.path} → {r.integration_target || "—"}
          </p>
        ))}
      </div>
      <div className={`mt-2 rounded-md p-2 ${step === 2 ? "bg-primary/10" : ""}`}>
        <p className="text-xs font-semibold">{t("apiGateway.preview.stages")}</p>
        {values.stages.map((s, i) => (
          <Badge variant="secondary" className="mr-1 mt-1" key={i}>
            {s.name === "$default" ? t("apiGateway.defaultStage") : s.name || "—"}
          </Badge>
        ))}
      </div>
    </Card>
  )
}
function Field({
  label,
  error,
  children,
}: Readonly<{
  label: string
  error?: string
  children: React.ReactNode
}>) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL}>{label}</Label>
      {children}
      <Err message={error} />
    </div>
  )
}
function Err({ message }: { message?: string }) {
  return message ? <p className="text-[11px] text-destructive">{message}</p> : null
}
