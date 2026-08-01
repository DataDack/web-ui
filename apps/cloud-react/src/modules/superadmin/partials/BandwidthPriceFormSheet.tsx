import { useEffect } from "react"

import { Switch, Textarea } from "@DataDack/common-ui"
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
import { useAdminAvailabilityZones, useSaveBandwidthPrice } from "../superadmin.hooks"
import type {
  BandwidthPrice,
  CreateBandwidthPriceRequest,
  UpdateBandwidthPriceRequest,
} from "../superadmin.types"

const DIRECTIONS = ["egress", "ingress", "both"] as const
const BILLING_UNITS = ["gb"] as const

const schema = z.object({
  availability_zone_id: z.string().min(1, "Required"),
  sku: z.string().max(64),
  name: z.string().max(128),
  direction: z.enum(DIRECTIONS),
  included_gb: z.coerce.number().int().min(0),
  price_per_gb: z.coerce.number().min(0),
  currency: z.string().max(8),
  billing_unit: z.enum(BILLING_UNITS),
  tax_inclusive: z.boolean(),
  features: z.string().refine((value) => value.trim() === "" || isJSON(value), {
    message: "Must be valid JSON",
  }),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  availability_zone_id: "",
  sku: "",
  name: "",
  direction: "egress",
  included_gb: 0,
  price_per_gb: 0,
  currency: "INR",
  billing_unit: "gb",
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
  price?: BandwidthPrice | null
}

export function BandwidthPriceFormSheet({ open, onOpenChange, price }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveBandwidthPrice()
  const { data: azs = [] } = useAdminAvailabilityZones()
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
              availability_zone_id: price.availability_zone_id,
              sku: price.sku,
              name: price.name,
              direction: price.direction,
              included_gb: price.included_gb,
              price_per_gb: price.price_per_gb,
              currency: price.currency,
              billing_unit: price.billing_unit,
              tax_inclusive: price.tax_inclusive,
              features: price.features,
            }
          : EMPTY,
      )
    }
  }, [open, price, reset])

  const onSubmit = (values: FormValues) => {
    const payload: CreateBandwidthPriceRequest | UpdateBandwidthPriceRequest = {
      availability_zone_id: values.availability_zone_id,
      sku: optionalString(values.sku),
      name: optionalString(values.name),
      direction: values.direction,
      included_gb: values.included_gb,
      price_per_gb: values.price_per_gb,
      currency: optionalString(values.currency),
      billing_unit: values.billing_unit,
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
          ? t("superAdmin.bandwidthPrices.editTitle")
          : t("superAdmin.bandwidthPrices.createTitle")
      }
      description={t("superAdmin.bandwidthPrices.formSubtitle")}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending}
      submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
    >
      <Field
        label={t("superAdmin.bandwidthPrices.fields.availabilityZone")}
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
                  placeholder={t("superAdmin.bandwidthPrices.fields.availabilityZonePlaceholder")}
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
        <Input {...register("sku")} placeholder="bw-egress-in1a" className="font-mono" />
      </Field>
      <Field label="Name" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Egress data transfer" />
      </Field>
      <Field
        label={t("superAdmin.bandwidthPrices.fields.direction")}
        error={errors.direction?.message}
      >
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((value) => (
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
        label={t("superAdmin.bandwidthPrices.fields.includedGb")}
        error={errors.included_gb?.message}
      >
        <Input type="number" min={0} step={1} {...register("included_gb")} />
      </Field>
      <Field
        label={t("superAdmin.bandwidthPrices.fields.pricePerGb")}
        error={errors.price_per_gb?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_per_gb")} />
      </Field>
      <Field
        label={t("superAdmin.bandwidthPrices.fields.currency")}
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
      <Field label="Tax inclusive" error={errors.tax_inclusive?.message}>
        <Controller
          control={control}
          name="tax_inclusive"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>
      <Field label="Features JSON" error={errors.features?.message}>
        <Textarea {...register("features")} rows={4} placeholder='{"metered":true}' />
      </Field>
    </FormSheet>
  )
}
