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

import { Field, FormSheet } from "../components/form-fields"
import { useSaveIPPool } from "../superadmin.hooks"
import type { IpPool, UpdateIPPoolRequest } from "../superadmin.types"

const STATUSES = ["active", "disabled", "depleted"] as const

const schema = z.object({
  name: z.string().max(100),
  description: z.string().max(255),
  status: z.enum(STATUSES),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  pool: IpPool | null
  onOpenChange: (open: boolean) => void
}

export function EditIPPoolDialog({ pool, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveIPPool()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", status: "active", is_active: true },
  })

  useEffect(() => {
    if (!pool) return
    reset({
      name: pool.name,
      description: pool.description,
      status: pool.status,
      is_active: pool.is_active,
    })
  }, [pool, reset])

  const onSubmit = (values: FormValues) => {
    if (!pool) return
    const payload: UpdateIPPoolRequest = {
      name: values.name.trim(),
      description: values.description,
      status: values.status,
      is_active: values.is_active,
    }
    save(
      { id: pool.id, payload },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <FormSheet
      open={!!pool}
      onOpenChange={onOpenChange}
      title={t("superAdmin.staticIps.pools.editTitle")}
      description={pool ? `${String(pool.total_count)} public/associated mappings` : ""}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending}
      submitLabel={t("superAdmin.staticIps.pools.save")}
    >
      <Field label={t("superAdmin.staticIps.dialog.name")} error={errors.name?.message}>
        <Input {...register("name")} className="font-mono" />
      </Field>

      <Field
        label={t("superAdmin.staticIps.dialog.description")}
        error={errors.description?.message}
      >
        <Textarea {...register("description")} rows={2} />
      </Field>

      <Field label={t("superAdmin.staticIps.pools.columns.status")}>
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
                    {t(`superAdmin.staticIps.pools.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label={t("superAdmin.fields.active")}
        hint={t("superAdmin.staticIps.pools.activeHint")}
      >
        <Controller
          control={control}
          name="is_active"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </Field>
    </FormSheet>
  )
}
