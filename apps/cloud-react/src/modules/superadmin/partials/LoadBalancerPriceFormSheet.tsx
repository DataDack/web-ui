import { useEffect } from "react"

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { CurrencySelect } from "@/modules/countries/CurrencySelect"

import { Field, FormSheet } from "../components/form-fields"
import { useAdminAvailabilityZones, useSaveLoadBalancerPrice } from "../superadmin.hooks"
import type {
  CreateLoadBalancerPriceRequest,
  LoadBalancerPrice,
  UpdateLoadBalancerPriceRequest,
} from "../superadmin.types"

const LB_TYPES = ["application", "network", "gateway", "classic"] as const
const SCHEMES = ["any", "internet_facing", "internal"] as const
const IP_VERSIONS = ["ipv4", "dualstack"] as const
const BILLING_UNITS = ["hour", "month", "minute", "second"] as const

/** What one capacity unit means per balancer type, mirroring the ELB model the
 *  rate card is derived from. Filling these on a create saves the operator
 *  re-typing four thresholds that are a property of the type, not of the price;
 *  they stay editable, and an edit never overwrites what is already stored. */
const TYPE_DEFAULTS: Record<
  (typeof LB_TYPES)[number],
  {
    capacity_unit_name: string
    lcu_new_connections_per_sec: number
    lcu_active_connections_per_min: number
    lcu_processed_gb_per_hour: number
    lcu_rule_evaluations_per_sec: number
  }
> = {
  application: {
    capacity_unit_name: "LCU",
    lcu_new_connections_per_sec: 25,
    lcu_active_connections_per_min: 3000,
    lcu_processed_gb_per_hour: 1,
    lcu_rule_evaluations_per_sec: 1000,
  },
  network: {
    capacity_unit_name: "NLCU",
    lcu_new_connections_per_sec: 800,
    lcu_active_connections_per_min: 100000,
    lcu_processed_gb_per_hour: 1,
    lcu_rule_evaluations_per_sec: 0,
  },
  gateway: {
    capacity_unit_name: "GLCU",
    lcu_new_connections_per_sec: 600,
    lcu_active_connections_per_min: 60000,
    lcu_processed_gb_per_hour: 1,
    lcu_rule_evaluations_per_sec: 0,
  },
  classic: {
    capacity_unit_name: "GB",
    lcu_new_connections_per_sec: 0,
    lcu_active_connections_per_min: 0,
    lcu_processed_gb_per_hour: 0,
    lcu_rule_evaluations_per_sec: 0,
  },
}

const schema = z.object({
  availability_zone_id: z.string().min(1, "Required"),
  sku: z.string().max(64),
  name: z.string().max(128),
  description: z.string().max(512),
  lb_type: z.enum(LB_TYPES),
  scheme: z.enum(SCHEMES),
  ip_version: z.enum(IP_VERSIONS),
  engine: z.string().max(32),
  capacity_unit_name: z.string().max(16),
  lcu_new_connections_per_sec: z.coerce.number().int().min(0),
  lcu_active_connections_per_min: z.coerce.number().int().min(0),
  lcu_processed_gb_per_hour: z.coerce.number().min(0),
  lcu_rule_evaluations_per_sec: z.coerce.number().int().min(0),
  included_lcu_hours: z.coerce.number().min(0),
  included_processed_gb: z.coerce.number().int().min(0),
  included_listeners: z.coerce.number().int().min(0),
  included_rules: z.coerce.number().int().min(0),
  included_certificates: z.coerce.number().int().min(0),
  max_targets: z.coerce.number().int().min(0),
  max_target_groups: z.coerce.number().int().min(0),
  tls_termination: z.boolean(),
  sticky_sessions: z.boolean(),
  http2_support: z.boolean(),
  websocket_support: z.boolean(),
  health_checks: z.boolean(),
  access_logs: z.boolean(),
  cross_zone: z.boolean(),
  price_hourly: z.coerce.number().min(0),
  price_monthly: z.coerce.number().min(0),
  price_per_lcu_hour: z.coerce.number().min(0),
  price_per_gb_processed: z.coerce.number().min(0),
  price_tls_termination_hourly: z.coerce.number().min(0),
  setup_fee: z.coerce.number().min(0),
  currency: z.string().max(8),
  billing_unit: z.enum(BILLING_UNITS),
  billing_increment_seconds: z.coerce.number().int().min(1),
  sort_order: z.coerce.number().int().min(0),
  tax_inclusive: z.boolean(),
  is_active: z.boolean(),
  features: z.string().refine((value) => value.trim() === "" || isJSON(value), {
    message: "Must be valid JSON",
  }),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  availability_zone_id: "",
  sku: "",
  name: "",
  description: "",
  lb_type: "application",
  scheme: "any",
  ip_version: "ipv4",
  engine: "haproxy",
  ...TYPE_DEFAULTS.application,
  included_lcu_hours: 0,
  included_processed_gb: 0,
  included_listeners: 0,
  included_rules: 0,
  included_certificates: 0,
  max_targets: 0,
  max_target_groups: 0,
  tls_termination: true,
  sticky_sessions: true,
  http2_support: true,
  websocket_support: true,
  health_checks: true,
  access_logs: false,
  cross_zone: false,
  price_hourly: 0,
  price_monthly: 0,
  price_per_lcu_hour: 0,
  price_per_gb_processed: 0,
  price_tls_termination_hourly: 0,
  setup_fee: 0,
  currency: "INR",
  billing_unit: "hour",
  billing_increment_seconds: 3600,
  sort_order: 0,
  tax_inclusive: false,
  is_active: true,
  features: "",
}

function isJSON(value: string) {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function optionalString(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Guards a stored value against the options this form knows. A row written
 *  before an option existed — or by hand, straight into the catalog file —
 *  still opens in the sheet instead of failing enum validation on load. */
function pick<T extends string>(options: readonly T[], value: string, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

/** Sub-heading inside the sheet — the form carries four distinct groups of
 *  fields and reads as a wall of inputs without them. */
function Section({ title, hint }: Readonly<{ title: string; hint?: string }>) {
  return (
    <div className="pt-2 first:pt-0">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
        {title}
      </h4>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  price?: LoadBalancerPrice | null
}

export function LoadBalancerPriceFormSheet({ open, onOpenChange, price }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveLoadBalancerPrice()
  const { data: azs = [] } = useAdminAvailabilityZones()
  const isEdit = !!price

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      reset(
        price
          ? {
              availability_zone_id: price.availability_zone_id,
              sku: price.sku,
              name: price.name,
              description: price.description,
              lb_type: pick(LB_TYPES, price.lb_type, "application"),
              scheme: pick(SCHEMES, price.scheme, "any"),
              ip_version: pick(IP_VERSIONS, price.ip_version, "ipv4"),
              engine: price.engine,
              capacity_unit_name: price.capacity_unit_name,
              lcu_new_connections_per_sec: price.lcu_new_connections_per_sec,
              lcu_active_connections_per_min: price.lcu_active_connections_per_min,
              lcu_processed_gb_per_hour: price.lcu_processed_gb_per_hour,
              lcu_rule_evaluations_per_sec: price.lcu_rule_evaluations_per_sec,
              included_lcu_hours: price.included_lcu_hours,
              included_processed_gb: price.included_processed_gb,
              included_listeners: price.included_listeners,
              included_rules: price.included_rules,
              included_certificates: price.included_certificates,
              max_targets: price.max_targets,
              max_target_groups: price.max_target_groups,
              tls_termination: price.tls_termination,
              sticky_sessions: price.sticky_sessions,
              http2_support: price.http2_support,
              websocket_support: price.websocket_support,
              health_checks: price.health_checks,
              access_logs: price.access_logs,
              cross_zone: price.cross_zone,
              price_hourly: price.price_hourly,
              price_monthly: price.price_monthly,
              price_per_lcu_hour: price.price_per_lcu_hour,
              price_per_gb_processed: price.price_per_gb_processed,
              price_tls_termination_hourly: price.price_tls_termination_hourly,
              setup_fee: price.setup_fee,
              currency: price.currency,
              billing_unit: pick(BILLING_UNITS, price.billing_unit, "hour"),
              billing_increment_seconds: price.billing_increment_seconds,
              sort_order: price.sort_order,
              tax_inclusive: price.tax_inclusive,
              is_active: price.is_active,
              features: price.features,
            }
          : EMPTY,
      )
    }
  }, [open, price, reset])

  // Picking a type on a NEW row fills the capacity-unit definition for it. On an
  // edit the stored thresholds win — they may have been tuned deliberately, and
  // silently resetting them would reprice every existing balancer.
  const applyTypeDefaults = (next: (typeof LB_TYPES)[number]) => {
    if (isEdit) return
    const d = TYPE_DEFAULTS[next]
    setValue("capacity_unit_name", d.capacity_unit_name)
    setValue("lcu_new_connections_per_sec", d.lcu_new_connections_per_sec)
    setValue("lcu_active_connections_per_min", d.lcu_active_connections_per_min)
    setValue("lcu_processed_gb_per_hour", d.lcu_processed_gb_per_hour)
    setValue("lcu_rule_evaluations_per_sec", d.lcu_rule_evaluations_per_sec)
  }

  const onSubmit = (values: FormValues) => {
    const payload: CreateLoadBalancerPriceRequest | UpdateLoadBalancerPriceRequest = {
      availability_zone_id: values.availability_zone_id,
      sku: optionalString(values.sku),
      name: optionalString(values.name),
      description: optionalString(values.description),
      lb_type: values.lb_type,
      scheme: values.scheme,
      ip_version: values.ip_version,
      engine: optionalString(values.engine),
      capacity_unit_name: optionalString(values.capacity_unit_name),
      lcu_new_connections_per_sec: values.lcu_new_connections_per_sec,
      lcu_active_connections_per_min: values.lcu_active_connections_per_min,
      lcu_processed_gb_per_hour: values.lcu_processed_gb_per_hour,
      lcu_rule_evaluations_per_sec: values.lcu_rule_evaluations_per_sec,
      included_lcu_hours: values.included_lcu_hours,
      included_processed_gb: values.included_processed_gb,
      included_listeners: values.included_listeners,
      included_rules: values.included_rules,
      included_certificates: values.included_certificates,
      max_targets: values.max_targets,
      max_target_groups: values.max_target_groups,
      tls_termination: values.tls_termination,
      sticky_sessions: values.sticky_sessions,
      http2_support: values.http2_support,
      websocket_support: values.websocket_support,
      health_checks: values.health_checks,
      access_logs: values.access_logs,
      cross_zone: values.cross_zone,
      price_hourly: values.price_hourly,
      price_monthly: values.price_monthly,
      price_per_lcu_hour: values.price_per_lcu_hour,
      price_per_gb_processed: values.price_per_gb_processed,
      price_tls_termination_hourly: values.price_tls_termination_hourly,
      setup_fee: values.setup_fee,
      currency: optionalString(values.currency),
      billing_unit: values.billing_unit,
      billing_increment_seconds: values.billing_increment_seconds,
      sort_order: values.sort_order,
      tax_inclusive: values.tax_inclusive,
      features: optionalString(values.features),
    }
    // is_active only exists on the update request — a create is always active.
    if (isEdit) (payload as UpdateLoadBalancerPriceRequest).is_active = values.is_active
    save(
      { id: price?.id, payload },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("superAdmin.lbPrices.editTitle") : t("superAdmin.lbPrices.createTitle")}
      description={t("superAdmin.lbPrices.formSubtitle")}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending}
      submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
    >
      <Section title={t("superAdmin.lbPrices.sections.identity")} />

      <Field
        label={t("superAdmin.lbPrices.fields.availabilityZone")}
        required
        error={errors.availability_zone_id?.message}
      >
        <Controller
          control={control}
          name="availability_zone_id"
          render={({ field }) => (
            <Select
              value={field.value === "" ? undefined : field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("superAdmin.lbPrices.fields.availabilityZonePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {azs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="SKU" error={errors.sku?.message}>
        <Input {...register("sku")} placeholder="dd.lb.application" className="font-mono" />
      </Field>

      <Field label="Name" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Application Load Balancer" />
      </Field>

      <Field label="Description" error={errors.description?.message}>
        <Input {...register("description")} placeholder="Layer 7 HTTP/HTTPS load balancing" />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.lbType")}
        required
        error={errors.lb_type?.message}
      >
        <Controller
          control={control}
          name="lb_type"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(next) => {
                field.onChange(next)
                applyTypeDefaults(next as (typeof LB_TYPES)[number])
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LB_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.scheme")} error={errors.scheme?.message}>
        <Controller
          control={control}
          name="scheme"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEMES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.ipVersion")} error={errors.ip_version?.message}>
        <Controller
          control={control}
          name="ip_version"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IP_VERSIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.engine")} error={errors.engine?.message}>
        <Input {...register("engine")} placeholder="haproxy" className="font-mono" />
      </Field>

      <Section
        title={t("superAdmin.lbPrices.sections.capacityUnit")}
        hint={t("superAdmin.lbPrices.sections.capacityUnitHint")}
      />

      <Field
        label={t("superAdmin.lbPrices.fields.capacityUnitName")}
        error={errors.capacity_unit_name?.message}
      >
        <Input {...register("capacity_unit_name")} placeholder="LCU" className="font-mono" />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.newConnectionsPerSec")}
        error={errors.lcu_new_connections_per_sec?.message}
      >
        <Input type="number" min={0} step={1} {...register("lcu_new_connections_per_sec")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.activeConnectionsPerMin")}
        error={errors.lcu_active_connections_per_min?.message}
      >
        <Input type="number" min={0} step={1} {...register("lcu_active_connections_per_min")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.processedGbPerHour")}
        error={errors.lcu_processed_gb_per_hour?.message}
      >
        <Input type="number" min={0} step="any" {...register("lcu_processed_gb_per_hour")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.ruleEvaluationsPerSec")}
        hint={t("superAdmin.lbPrices.fields.ruleEvaluationsHint")}
        error={errors.lcu_rule_evaluations_per_sec?.message}
      >
        <Input type="number" min={0} step={1} {...register("lcu_rule_evaluations_per_sec")} />
      </Field>

      <Section title={t("superAdmin.lbPrices.sections.pricing")} />

      <Field
        label={t("superAdmin.lbPrices.fields.priceHourly")}
        required
        error={errors.price_hourly?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_hourly")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.priceMonthly")}
        error={errors.price_monthly?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_monthly")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.pricePerCapacityUnit")}
        error={errors.price_per_lcu_hour?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_per_lcu_hour")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.pricePerGbProcessed")}
        hint={t("superAdmin.lbPrices.fields.pricePerGbProcessedHint")}
        error={errors.price_per_gb_processed?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_per_gb_processed")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.priceTlsHourly")}
        error={errors.price_tls_termination_hourly?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_tls_termination_hourly")} />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.setupFee")} error={errors.setup_fee?.message}>
        <Input type="number" min={0} step="any" {...register("setup_fee")} />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.currency")} error={errors.currency?.message}>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <CurrencySelect value={field.value} onValueChange={field.onChange} className="w-full" />
          )}
        />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.billingUnit")}
        error={errors.billing_unit?.message}
      >
        <Controller
          control={control}
          name="billing_unit"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_UNITS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.billingIncrement")}
        error={errors.billing_increment_seconds?.message}
      >
        <Input type="number" min={1} step={1} {...register("billing_increment_seconds")} />
      </Field>

      <Section
        title={t("superAdmin.lbPrices.sections.allowances")}
        hint={t("superAdmin.lbPrices.sections.allowancesHint")}
      />

      <Field
        label={t("superAdmin.lbPrices.fields.includedCapacityUnitHours")}
        error={errors.included_lcu_hours?.message}
      >
        <Input type="number" min={0} step="any" {...register("included_lcu_hours")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.includedProcessedGb")}
        error={errors.included_processed_gb?.message}
      >
        <Input type="number" min={0} step={1} {...register("included_processed_gb")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.includedListeners")}
        error={errors.included_listeners?.message}
      >
        <Input type="number" min={0} step={1} {...register("included_listeners")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.includedRules")}
        error={errors.included_rules?.message}
      >
        <Input type="number" min={0} step={1} {...register("included_rules")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.includedCertificates")}
        error={errors.included_certificates?.message}
      >
        <Input type="number" min={0} step={1} {...register("included_certificates")} />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.maxTargets")} error={errors.max_targets?.message}>
        <Input type="number" min={0} step={1} {...register("max_targets")} />
      </Field>

      <Field
        label={t("superAdmin.lbPrices.fields.maxTargetGroups")}
        error={errors.max_target_groups?.message}
      >
        <Input type="number" min={0} step={1} {...register("max_target_groups")} />
      </Field>

      <Section title={t("superAdmin.lbPrices.sections.features")} />

      <Field label={t("superAdmin.lbPrices.fields.tlsTermination")}>
        <Controller
          control={control}
          name="tls_termination"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.stickySessions")}>
        <Controller
          control={control}
          name="sticky_sessions"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.http2")}>
        <Controller
          control={control}
          name="http2_support"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.websockets")}>
        <Controller
          control={control}
          name="websocket_support"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.healthChecks")}>
        <Controller
          control={control}
          name="health_checks"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.accessLogs")}>
        <Controller
          control={control}
          name="access_logs"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.crossZone")}>
        <Controller
          control={control}
          name="cross_zone"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      <Section title={t("superAdmin.lbPrices.sections.catalog")} />

      <Field label={t("superAdmin.lbPrices.fields.sortOrder")} error={errors.sort_order?.message}>
        <Input type="number" min={0} step={1} {...register("sort_order")} />
      </Field>

      <Field label={t("superAdmin.lbPrices.fields.taxInclusive")}>
        <Controller
          control={control}
          name="tax_inclusive"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>

      {isEdit && (
        <Field label={t("superAdmin.fields.active")}>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>
      )}

      <Field label={t("superAdmin.lbPrices.fields.featuresJson")} error={errors.features?.message}>
        <Textarea {...register("features")} rows={4} placeholder='{"waf":false}' />
      </Field>
    </FormSheet>
  )
}
