import { useEffect } from "react"

import { Switch, Textarea } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { CurrencySelect } from "@/modules/countries/CurrencySelect"

import { Field, FormSheet } from "../components/form-fields"
import { useSaveStaticIPPrice } from "../superadmin.hooks"
import type {
  CreateStaticIPPriceRequest,
  StaticIPPrice,
  UpdateStaticIPPriceRequest,
} from "../superadmin.types"

const IP_VERSIONS = ["ipv4", "ipv6"] as const
const ADDRESS_TYPES = ["static", "ephemeral"] as const
const BILLING_UNITS = ["second", "minute", "hour", "month"] as const

const schema = z.object({
  sku: z.string().max(64),
  name: z.string().max(128),
  ip_version: z.enum(IP_VERSIONS),
  address_type: z.enum(ADDRESS_TYPES),
  network_tier: z.string().max(64),
  price_hourly: z.coerce.number().min(0),
  price_idle_hourly: z.coerce.number().min(0),
  price_monthly: z.coerce.number().min(0),
  setup_fee: z.coerce.number().min(0),
  currency: z.string().max(8),
  billing_unit: z.enum(BILLING_UNITS),
  billing_increment_seconds: z.coerce.number().int().min(1),
  tax_inclusive: z.boolean(),
  features: z.string().refine((value) => value.trim() === "" || isJSON(value), {
    message: "Must be valid JSON",
  }),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  sku: "",
  name: "",
  ip_version: "ipv4",
  address_type: "static",
  network_tier: "",
  price_hourly: 0,
  price_idle_hourly: 0,
  price_monthly: 0,
  setup_fee: 0,
  currency: "INR",
  billing_unit: "hour",
  billing_increment_seconds: 3600,
  tax_inclusive: false,
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  price?: StaticIPPrice | null
}

export function StaticIPPriceFormSheet({ open, onOpenChange, price }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveStaticIPPrice()
  const isEdit = !!price

  const {
    register,
    handleSubmit,
    control,
    reset,
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
              sku: price.sku,
              name: price.name,
              ip_version: price.ip_version,
              address_type: price.address_type,
              network_tier: price.network_tier,
              price_hourly: price.price_hourly,
              price_idle_hourly: price.price_idle_hourly,
              price_monthly: price.price_monthly,
              setup_fee: price.setup_fee,
              currency: price.currency,
              billing_unit: price.billing_unit,
              billing_increment_seconds: price.billing_increment_seconds,
              tax_inclusive: price.tax_inclusive,
              features: price.features,
            }
          : EMPTY,
      )
    }
  }, [open, price, reset])

  const onSubmit = (values: FormValues) => {
    const payload: CreateStaticIPPriceRequest | UpdateStaticIPPriceRequest = {
      sku: optionalString(values.sku),
      name: optionalString(values.name),
      ip_version: values.ip_version,
      address_type: values.address_type,
      network_tier: optionalString(values.network_tier),
      price_hourly: values.price_hourly,
      price_idle_hourly: values.price_idle_hourly,
      price_monthly: values.price_monthly,
      setup_fee: values.setup_fee,
      currency: optionalString(values.currency),
      billing_unit: values.billing_unit,
      billing_increment_seconds: values.billing_increment_seconds,
      tax_inclusive: values.tax_inclusive,
      features: optionalString(values.features),
    }
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
      title={
        isEdit
          ? t("superAdmin.staticIpPrices.editTitle")
          : t("superAdmin.staticIpPrices.createTitle")
      }
      description={t("superAdmin.staticIpPrices.formSubtitle")}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending}
      submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
    >
      <Field label="SKU" error={errors.sku?.message}>
        <Input {...register("sku")} placeholder="ip-static-premium-in1a" className="font-mono" />
      </Field>
      <Field label="Name" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Static IPv4 premium" />
      </Field>
      <Field label="IP version" error={errors.ip_version?.message}>
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
                    {value.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Address type" error={errors.address_type?.message}>
        <Controller
          control={control}
          name="address_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDRESS_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Network tier" error={errors.network_tier?.message}>
        <Input {...register("network_tier")} placeholder="premium" />
      </Field>
      <Field
        label={t("superAdmin.staticIpPrices.fields.priceHourly")}
        required
        error={errors.price_hourly?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_hourly")} />
      </Field>
      <Field label="Idle hourly" error={errors.price_idle_hourly?.message}>
        <Input type="number" min={0} step="any" {...register("price_idle_hourly")} />
      </Field>
      <Field
        label={t("superAdmin.staticIpPrices.fields.priceMonthly")}
        error={errors.price_monthly?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_monthly")} />
      </Field>
      <Field label="Setup fee" error={errors.setup_fee?.message}>
        <Input type="number" min={0} step="any" {...register("setup_fee")} />
      </Field>
      <Field
        label={t("superAdmin.staticIpPrices.fields.currency")}
        error={errors.currency?.message}
      >
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <CurrencySelect value={field.value} onValueChange={field.onChange} className="w-full" />
          )}
        />
      </Field>
      <Field label="Billing unit" error={errors.billing_unit?.message}>
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
      <Field label="Billing increment seconds" error={errors.billing_increment_seconds?.message}>
        <Input type="number" min={1} {...register("billing_increment_seconds")} />
      </Field>
      <Field label="Tax inclusive" error={errors.tax_inclusive?.message}>
        <Controller
          control={control}
          name="tax_inclusive"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>
      <Field label="Features JSON" error={errors.features?.message}>
        <Textarea {...register("features")} rows={4} placeholder='{"attachable":true}' />
      </Field>
    </FormSheet>
  )
}
