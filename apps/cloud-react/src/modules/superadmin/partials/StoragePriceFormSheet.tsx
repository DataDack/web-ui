import { useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CurrencySelect } from "@/modules/countries/CurrencySelect"

import { Field, FormSheet } from "../components/form-fields"
import { useAdminAvailabilityZones, useSaveStoragePrice } from "../superadmin.hooks"
import type {
  CreateStoragePriceRequest,
  StoragePrice,
  UpdateStoragePriceRequest,
} from "../superadmin.types"

const STORAGE_TYPES = ["ssd", "hdd", "nvme"] as const
const VOLUME_TYPES = ["block", "object", "file"] as const
const REPLICATION_TYPES = ["local", "zonal", "regional"] as const
const BILLING_UNITS = ["second", "minute", "hour", "month"] as const

const schema = z.object({
  availability_zone_id: z.string().min(1, "Required"),
  sku: z.string().max(64),
  name: z.string().max(128),
  description: z.string().max(512),
  storage_type: z.enum(STORAGE_TYPES),
  volume_type: z.enum(VOLUME_TYPES),
  replication_type: z.enum(REPLICATION_TYPES),
  min_size_gb: z.coerce.number().int().min(1),
  max_size_gb: z.coerce.number().int().min(0),
  included_iops: z.coerce.number().int().min(0),
  max_iops: z.coerce.number().int().min(0),
  included_throughput_mbps: z.coerce.number().int().min(0),
  max_throughput_mbps: z.coerce.number().int().min(0),
  price_per_gb_month: z.coerce.number().min(0),
  price_per_iops: z.coerce.number().min(0),
  price_per_throughput_mbps: z.coerce.number().min(0),
  snapshot_price_per_gb_month: z.coerce.number().min(0),
  setup_fee: z.coerce.number().min(0),
  currency: z.string().max(8),
  billing_unit: z.enum(BILLING_UNITS),
  tax_inclusive: z.boolean(),
  features: z.string().refine((value) => value.trim() === "" || isJSON(value), {
    message: "Must be valid JSON",
  }),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  availability_zone_id: "",
  sku: "",
  name: "",
  description: "",
  storage_type: "ssd",
  volume_type: "block",
  replication_type: "zonal",
  min_size_gb: 1,
  max_size_gb: 0,
  included_iops: 0,
  max_iops: 0,
  included_throughput_mbps: 0,
  max_throughput_mbps: 0,
  price_per_gb_month: 0,
  price_per_iops: 0,
  price_per_throughput_mbps: 0,
  snapshot_price_per_gb_month: 0,
  setup_fee: 0,
  currency: "INR",
  billing_unit: "month",
  tax_inclusive: false,
  features: "",
  is_active: true,
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
  price?: StoragePrice | null
}

export function StoragePriceFormSheet({ open, onOpenChange, price }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveStoragePrice()
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
              description: price.description,
              storage_type: price.storage_type,
              volume_type: price.volume_type,
              replication_type: price.replication_type,
              min_size_gb: price.min_size_gb,
              max_size_gb: price.max_size_gb,
              included_iops: price.included_iops,
              max_iops: price.max_iops,
              included_throughput_mbps: price.included_throughput_mbps,
              max_throughput_mbps: price.max_throughput_mbps,
              price_per_gb_month: price.price_per_gb_month,
              price_per_iops: price.price_per_iops,
              price_per_throughput_mbps: price.price_per_throughput_mbps,
              snapshot_price_per_gb_month: price.snapshot_price_per_gb_month,
              setup_fee: price.setup_fee,
              currency: price.currency,
              billing_unit: price.billing_unit,
              tax_inclusive: price.tax_inclusive,
              features: price.features,
              is_active: price.is_active,
            }
          : EMPTY,
      )
    }
  }, [open, price, reset])

  const onSubmit = (values: FormValues) => {
    const payload: CreateStoragePriceRequest | UpdateStoragePriceRequest = {
      availability_zone_id: values.availability_zone_id,
      sku: optionalString(values.sku),
      name: optionalString(values.name),
      description: optionalString(values.description),
      storage_type: values.storage_type,
      volume_type: values.volume_type,
      replication_type: values.replication_type,
      min_size_gb: values.min_size_gb,
      max_size_gb: values.max_size_gb,
      included_iops: values.included_iops,
      max_iops: values.max_iops,
      included_throughput_mbps: values.included_throughput_mbps,
      max_throughput_mbps: values.max_throughput_mbps,
      price_per_gb_month: values.price_per_gb_month,
      price_per_iops: values.price_per_iops,
      price_per_throughput_mbps: values.price_per_throughput_mbps,
      snapshot_price_per_gb_month: values.snapshot_price_per_gb_month,
      setup_fee: values.setup_fee,
      currency: optionalString(values.currency),
      billing_unit: values.billing_unit,
      tax_inclusive: values.tax_inclusive,
      features: optionalString(values.features),
      is_active: values.is_active,
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
        isEdit ? t("superAdmin.storagePrices.editTitle") : t("superAdmin.storagePrices.createTitle")
      }
      description={t("superAdmin.storagePrices.formSubtitle")}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending}
      submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
    >
      <Field
        label={t("superAdmin.storagePrices.fields.availabilityZone")}
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
                  placeholder={t("superAdmin.storagePrices.fields.availabilityZonePlaceholder")}
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
        <Input {...register("sku")} placeholder="blk-ssd-zonal-in1a" className="font-mono" />
      </Field>
      <Field label="Name" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Zonal SSD block" />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea {...register("description")} rows={3} />
      </Field>
      <Field
        label={t("superAdmin.storagePrices.fields.storageType")}
        error={errors.storage_type?.message}
      >
        <Controller
          control={control}
          name="storage_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Volume type" error={errors.volume_type?.message}>
        <Controller
          control={control}
          name="volume_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOLUME_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Replication" error={errors.replication_type?.message}>
        <Controller
          control={control}
          name="replication_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPLICATION_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Min size GB" error={errors.min_size_gb?.message}>
        <Input type="number" min={1} {...register("min_size_gb")} />
      </Field>
      <Field label="Max size GB" error={errors.max_size_gb?.message}>
        <Input type="number" min={0} {...register("max_size_gb")} />
      </Field>
      <Field label="Included IOPS" error={errors.included_iops?.message}>
        <Input type="number" min={0} {...register("included_iops")} />
      </Field>
      <Field label="Max IOPS" error={errors.max_iops?.message}>
        <Input type="number" min={0} {...register("max_iops")} />
      </Field>
      <Field label="Included throughput MBps" error={errors.included_throughput_mbps?.message}>
        <Input type="number" min={0} {...register("included_throughput_mbps")} />
      </Field>
      <Field label="Max throughput MBps" error={errors.max_throughput_mbps?.message}>
        <Input type="number" min={0} {...register("max_throughput_mbps")} />
      </Field>
      <Field
        label={t("superAdmin.storagePrices.fields.pricePerGbMonth")}
        required
        error={errors.price_per_gb_month?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_per_gb_month")} />
      </Field>
      <Field
        label={t("superAdmin.storagePrices.fields.pricePerIops")}
        error={errors.price_per_iops?.message}
      >
        <Input type="number" min={0} step="any" {...register("price_per_iops")} />
      </Field>
      <Field label="Throughput price / MBps" error={errors.price_per_throughput_mbps?.message}>
        <Input type="number" min={0} step="any" {...register("price_per_throughput_mbps")} />
      </Field>
      <Field label="Snapshot price / GB month" error={errors.snapshot_price_per_gb_month?.message}>
        <Input type="number" min={0} step="any" {...register("snapshot_price_per_gb_month")} />
      </Field>
      <Field label="Setup fee" error={errors.setup_fee?.message}>
        <Input type="number" min={0} step="any" {...register("setup_fee")} />
      </Field>
      <Field label={t("superAdmin.storagePrices.fields.currency")} error={errors.currency?.message}>
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
                {BILLING_UNITS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
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
        <Textarea {...register("features")} rows={4} placeholder='{"encrypted":true}' />
      </Field>
      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-lg border border-border-glass px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">{t("superAdmin.fields.active")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("superAdmin.storagePrices.fields.activeHint")}
              </p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />
    </FormSheet>
  )
}
