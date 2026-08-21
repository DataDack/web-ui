import { useEffect, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Network } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Field } from "../components/form-fields"
import { useAdminAvailabilityZones, useSaveIPPool } from "../superadmin.hooks"
import type { CreateIPPoolRequest } from "../superadmin.types"

const schema = z.object({
  availability_zone_id: z.string().min(1, "Required"),
  name: z.string().max(100),
  description: z.string().max(255),
})

type FormValues = z.infer<typeof schema>
interface AddressPair {
  public_ip: string
  associated_ip: string
}

const EMPTY: FormValues = { availability_zone_id: "", name: "", description: "" }

function optional(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddIPPoolDialog({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveIPPool()
  const { data: azs = [] } = useAdminAvailabilityZones()
  const [pairText, setPairText] = useState("")
  const [pairError, setPairError] = useState("")
  const pairs = parsePairs(pairText)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) {
      reset(EMPTY)
      setPairText("")
      setPairError("")
    }
  }, [open, reset])

  const onSubmit = (values: FormValues) => {
    if (pairs.length === 0) {
      setPairError("Enter at least one valid public and associated IPv4 pair")
      return
    }
    const payload: CreateIPPoolRequest = {
      pairs,
      availability_zone_id: values.availability_zone_id,
      name: optional(values.name),
      description: optional(values.description),
    }
    save(
      { payload },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <Network className="size-4" />
            Register static IP mappings
          </DialogTitle>
          <DialogDescription>
            Enter each customer-facing public IP with the address associated by your provider.
          </DialogDescription>
        </DialogHeader>

        <div className="grid border-t border-border-glass md:grid-cols-2">
          <form
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
            className="flex flex-col gap-5 border-border-glass p-6 md:border-r"
          >
            <Field label="Public and associated IP pairs" required error={pairError || undefined}>
              <Textarea
                value={pairText}
                onChange={(event) => {
                  setPairText(event.target.value)
                  setPairError("")
                }}
                rows={8}
                className="font-mono"
                placeholder={"103.228.151.132, 10.100.105.2\n103.228.151.134, 10.100.105.3"}
                aria-describedby="mapped-pairs-help"
              />
              <p id="mapped-pairs-help" className="text-xs text-muted-foreground">
                One pair per line. The first address is shown to customers; the second is used
                internally with Proxmox.
              </p>
            </Field>

            <Field
              label={t("superAdmin.staticIps.dialog.az")}
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
                      <SelectValue placeholder={t("superAdmin.staticIps.dialog.azPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {azs.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Group name" error={errors.name?.message}>
              <Input {...register("name")} placeholder="Noida provider mappings" />
            </Field>

            <Field
              label={t("superAdmin.staticIps.dialog.description")}
              error={errors.description?.message}
            >
              <Textarea {...register("description")} rows={2} />
            </Field>

            <Button type="submit" disabled={isPending} className="mt-1 gap-2" loading={isPending}>
              Register mappings
            </Button>
          </form>

          <div className="flex flex-col bg-muted/30">
            <div className="border-b border-border-glass px-6 py-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Mapping preview
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {pairs.length} valid mappings
              </p>
            </div>
            <div className="max-h-96 flex-1 overflow-y-auto px-6 py-3">
              <MappingPreview pairs={pairs} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function parsePairs(value: string): AddressPair[] {
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [publicIP = "", associatedIP = ""] = line.split(/\s*(?:,|↔|--|\s+)\s*/)
      return { public_ip: publicIP, associated_ip: associatedIP }
    })
    .filter((pair) => ipv4.test(pair.public_ip) && ipv4.test(pair.associated_ip))
}

function MappingPreview({ pairs }: Readonly<{ pairs: AddressPair[] }>) {
  if (pairs.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center text-center text-xs text-muted-foreground">
        Enter mappings to preview the inventory rows.
      </div>
    )
  }
  return (
    <ul className="space-y-1.5">
      {pairs.map((pair) => (
        <li
          key={pair.public_ip}
          className="rounded-md border border-border-glass bg-background/60 px-3 py-2 font-mono text-xs"
        >
          <span>{pair.public_ip}</span>
          <span className="mx-2 text-muted-foreground">↔</span>
          <span>{pair.associated_ip}</span>
        </li>
      ))}
    </ul>
  )
}
