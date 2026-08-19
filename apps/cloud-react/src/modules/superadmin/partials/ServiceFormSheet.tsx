import { useEffect } from "react"

import {
  Button,
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
import { Plus, Trash2 } from "lucide-react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { SERVICE_ICON_NAMES } from "@/modules/services/service-icons"

import { Field, FormSheet } from "../components/form-fields"
import { useSaveService, useServiceMetricSources } from "../superadmin.hooks"
import type {
  CatalogServiceAdmin,
  CreateServiceRequest,
  UpdateServiceRequest,
} from "../superadmin.types"

const CATEGORIES = ["compute", "network", "security", "storage", "management", "billing"] as const
const STATES = ["enabled", "coming_soon", "disabled"] as const
const STATUSES = ["operational", "degraded", "maintenance"] as const

const schema = z.object({
  key: z
    .string()
    .min(2, "Min 2 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  name: z.string().min(2, "Min 2 characters").max(80),
  short_name: z.string().max(24, "Max 24 characters").or(z.literal("")),
  description: z.string().max(300).or(z.literal("")),
  icon: z.string().min(1, "Pick an icon"),
  category: z.enum(CATEGORIES),
  path: z.string().max(120).or(z.literal("")),
  state: z.enum(STATES),
  status: z.enum(STATUSES),
  sort_order: z.number().int().min(0).max(9999),
  metrics: z.array(
    z.object({
      label: z.string().min(1, "Required").max(40),
      source: z.string().min(1, "Pick a source"),
      accent: z.boolean(),
    }),
  ),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  key: "",
  name: "",
  short_name: "",
  description: "",
  icon: "Box",
  category: "management",
  path: "",
  state: "enabled",
  status: "operational",
  sort_order: 0,
  metrics: [],
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: CatalogServiceAdmin | null
}

export function ServiceFormSheet({ open, onOpenChange, service }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveService()
  const { data: sources = [] } = useServiceMetricSources()
  const isEdit = !!service

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const { fields, append, remove } = useFieldArray({ control, name: "metrics" })

  useEffect(() => {
    if (open) {
      reset(
        service
          ? {
              key: service.key,
              name: service.name,
              short_name: service.short_name,
              description: service.description,
              icon: service.icon,
              category: service.category as FormValues["category"],
              path: service.path,
              state: service.state,
              status: service.status,
              sort_order: service.sort_order,
              metrics: service.metrics,
            }
          : EMPTY,
      )
    }
  }, [open, service, reset])

  const onSubmit = (values: FormValues) => {
    const common = {
      name: values.name,
      short_name: values.short_name,
      description: values.description,
      icon: values.icon,
      category: values.category,
      path: values.path,
      state: values.state,
      status: values.status,
      sort_order: values.sort_order,
      metrics: values.metrics,
    }
    const payload: CreateServiceRequest | UpdateServiceRequest = isEdit
      ? common
      : { key: values.key, ...common }
    save(
      { id: service?.id, payload },
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
      title={isEdit ? t("superAdmin.services.editTitle") : t("superAdmin.services.createTitle")}
      description={t("superAdmin.services.formSubtitle")}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending}
      submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
    >
      <Field
        label={t("superAdmin.services.fields.key")}
        required
        error={errors.key?.message}
        hint={isEdit ? t("superAdmin.services.fields.keyLocked") : undefined}
      >
        <Input
          {...register("key")}
          placeholder="compute"
          className="font-mono"
          readOnly={isEdit}
          aria-readonly={isEdit}
        />
      </Field>

      <Field label={t("superAdmin.services.fields.name")} required error={errors.name?.message}>
        <Input {...register("name")} placeholder={t("superAdmin.serviceFormSheet.computeEngine")} />
      </Field>

      <Field
        label={t("superAdmin.services.fields.shortName")}
        error={errors.short_name?.message}
        hint={t("superAdmin.services.fields.shortNameHint")}
      >
        <Input {...register("short_name")} placeholder="Compute" />
      </Field>

      <Field
        label={t("superAdmin.services.fields.description")}
        error={errors.description?.message}
      >
        <Textarea
          {...register("description")}
          rows={3}
          placeholder={t(
            "superadmin.serviceFormSheet.scalableHighPerformanceSovereignVirtualMachi",
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("superAdmin.services.fields.icon")} required error={errors.icon?.message}>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_ICON_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label={t("superAdmin.services.fields.category")}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field
        label={t("superAdmin.services.fields.path")}
        error={errors.path?.message}
        hint={t("superAdmin.services.fields.pathHint")}
      >
        <Input {...register("path")} placeholder="/compute" className="font-mono" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("superAdmin.services.fields.state")}>
          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`superAdmin.services.states.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label={t("superAdmin.services.fields.status")}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`superAdmin.services.statuses.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field
        label={t("superAdmin.services.fields.sortOrder")}
        error={errors.sort_order?.message}
        hint={t("superAdmin.services.fields.sortOrderHint")}
      >
        <Input type="number" {...register("sort_order", { valueAsNumber: true })} />
      </Field>

      {/* ── Live metric chips ───────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("superAdmin.services.fields.metrics")}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              append({ label: "", source: sources[0] ?? "", accent: false })
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("superAdmin.services.addMetric")}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("superAdmin.services.fields.metricsHint")}
        </p>

        {fields.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-glass px-3 py-3 text-center text-[11px] text-muted-foreground">
            {t("superAdmin.services.noMetrics")}
          </p>
        )}

        {fields.map((f, index) => (
          <div key={f.id} className="space-y-2 rounded-lg border border-border-glass p-2.5">
            <div className="flex gap-2">
              <Input
                {...register(`metrics.${String(index)}.label` as `metrics.${number}.label`)}
                placeholder={t("superAdmin.services.fields.metricLabel")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  remove(index)
                }}
                aria-label={t("superAdmin.services.removeMetric")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name={`metrics.${String(index)}.source` as `metrics.${number}.source`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("superAdmin.services.fields.metricSource")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((src) => (
                        <SelectItem key={src} value={src}>
                          {src}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name={`metrics.${String(index)}.accent` as `metrics.${number}.accent`}
                render={({ field }) => (
                  <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    {t("superAdmin.services.fields.accent")}
                  </label>
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </FormSheet>
  )
}
