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
import { useHostNodes } from "../components/host-nodes"
import { HostNodeSelect } from "../components/HostNodeSelect"
import { useSaveIPPool } from "../superadmin.hooks"
import type { IpPool, UpdateIPPoolRequest } from "../superadmin.types"

const STATUSES = ["active", "disabled", "depleted"] as const

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/

const schema = z
  .object({
    name: z.string().max(100),
    description: z.string().max(255),
    gateway: z.string().refine((v) => v === "" || IPV4.test(v), "Enter an IPv4 address"),
    prefix_length: z.string(),
    status: z.enum(STATUSES),
    is_active: z.boolean(),
    pve_node_id: z.string(),
  })
  .refine((v) => (v.gateway === "") === (v.prefix_length === ""), {
    message: "Enter both the gateway and its prefix, or neither",
    path: ["prefix_length"],
  })
  .refine((v) => v.prefix_length === "" || /^(?:[89]|[12]\d|3[0-2])$/.test(v.prefix_length), {
    message: "Prefix must be between 8 and 32",
    path: ["prefix_length"],
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
    defaultValues: {
      name: "",
      description: "",
      gateway: "",
      prefix_length: "",
      status: "active",
      is_active: true,
      pve_node_id: "",
    },
  })
  const hostNodes = useHostNodes(pool?.availability_zone_id)

  useEffect(() => {
    if (!pool) return
    reset({
      name: pool.name,
      description: pool.description,
      gateway: pool.gateway,
      prefix_length: pool.prefix_length ? String(pool.prefix_length) : "",
      status: pool.status,
      is_active: pool.is_active,
      pve_node_id: pool.pve_node_id ?? "",
    })
  }, [pool, reset])

  const onSubmit = (values: FormValues) => {
    if (!pool) return
    const payload: UpdateIPPoolRequest = {
      name: values.name.trim(),
      description: values.description,
      gateway: values.gateway,
      prefix_length: values.prefix_length === "" ? 0 : Number(values.prefix_length),
      status: values.status,
      is_active: values.is_active,
    }
    // Placement is only sent when it changes; both ids travel together.
    const host = hostNodes.find((n) => n.id === values.pve_node_id)
    if (host?.cluster_id && values.pve_node_id !== (pool.pve_node_id ?? "")) {
      payload.cluster_id = host.cluster_id
      payload.pve_node_id = host.id
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

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Gateway" error={errors.gateway?.message}>
          <Input
            {...register("gateway")}
            // eslint-disable-next-line sonarjs/no-hardcoded-ip -- illustrative placeholder in an empty form field, never dialled
            placeholder="185.67.20.1"
            className="font-mono"
          />
        </Field>
        <Field label="Prefix" error={errors.prefix_length?.message}>
          <Input
            {...register("prefix_length")}
            inputMode="numeric"
            placeholder="24"
            className="font-mono"
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Applies to guests configured after this change, not to running ones. Blank means the
        addresses are reached through the gateway on the node&apos;s public bridge.
      </p>

      <Field
        label="Host node"
        hint={
          pool?.pve_node_id
            ? "Only guests on this node get these addresses. A pool with addresses in use cannot be moved."
            : "This pool has no host node, so none of its addresses can be assigned until one is set."
        }
      >
        <Controller
          control={control}
          name="pve_node_id"
          render={({ field }) => (
            <HostNodeSelect
              value={field.value}
              onChange={field.onChange}
              availabilityZoneId={pool?.availability_zone_id}
            />
          )}
        />
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
