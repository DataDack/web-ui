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
import { useHostNodes } from "../components/host-nodes"
import { HostNodeSelect } from "../components/HostNodeSelect"
import { useAdminAvailabilityZones, useSaveIPPool } from "../superadmin.hooks"
import type { CreateIPPoolRequest } from "../superadmin.types"

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/

const schema = z
  .object({
    availability_zone_id: z.string().min(1, "Required"),
    // The node whose uplink carries the block. Nodes in one cluster may sit on
    // different upstreams, so a block belongs to one node, not the whole cluster.
    pve_node_id: z.string().min(1, "Required"),
    // The gateway is what the guest gets as its default route. Optional only
    // because blocks registered before it existed are reached through the PVE
    // node's own uplink; for anything else, leaving it blank is how a VM comes
    // up addressed and unroutable.
    gateway: z.string().refine((v) => v === "" || IPV4.test(v), "Enter an IPv4 address"),
    prefix_length: z.string(),
    name: z.string().max(100),
    description: z.string().max(255),
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
interface AddressPair {
  public_ip: string
  associated_ip: string
}

const EMPTY: FormValues = {
  availability_zone_id: "",
  pve_node_id: "",
  gateway: "",
  prefix_length: "",
  name: "",
  description: "",
}

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
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const azId = watch("availability_zone_id")
  const nodeId = watch("pve_node_id")
  const hostNodes = useHostNodes(azId)

  // A node from another zone is not a valid host for this block.
  useEffect(() => {
    if (nodeId !== "" && !hostNodes.some((n) => n.id === nodeId)) {
      setValue("pve_node_id", "")
    }
  }, [hostNodes, nodeId, setValue])

  useEffect(() => {
    if (open) {
      reset(EMPTY)
      setPairText("")
      setPairError("")
    }
  }, [open, reset])

  const onSubmit = (values: FormValues) => {
    const cidrPattern = /^(?:\d{1,3}\.){3}\d{1,3}\/(?:[89]|[12]\d|3[0-2])$/
    const isCidr = cidrPattern.test(pairText.trim())

    if (pairs.length === 0 && !isCidr) {
      setPairError(
        "Enter at least one valid IPv4 address/pair, or a valid CIDR pool block (e.g. 157.15.98.180/30)",
      )
      return
    }
    const host = hostNodes.find((n) => n.id === values.pve_node_id)
    if (!host?.cluster_id) return
    const payload: CreateIPPoolRequest = {
      availability_zone_id: values.availability_zone_id,
      cluster_id: host.cluster_id,
      pve_node_id: host.id,
      gateway: optional(values.gateway),
      prefix_length: values.prefix_length === "" ? undefined : Number(values.prefix_length),
      name: optional(values.name),
      description: optional(values.description),
      ...(isCidr ? { cidr: pairText.trim() } : { pairs }),
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
            <Field
              label="IP Addresses, CIDR Block, or Mappings"
              required
              error={pairError || undefined}
            >
              <Textarea
                value={pairText}
                onChange={(event) => {
                  setPairText(event.target.value)
                  setPairError("")
                }}
                rows={8}
                className="font-mono"
                placeholder={
                  "157.15.98.180/30\n\nOR one IP per line:\n185.67.20.52\n185.67.20.103\n\nOR public, associated pair per line:\n103.228.151.132, 10.100.105.2"
                }
                aria-describedby="mapped-pairs-help"
              />
              <p id="mapped-pairs-help" className="text-xs text-muted-foreground">
                Enter a full CIDR block (e.g. 157.15.98.180/30), individual IP addresses, or
                public/associated pairs.
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

            <Field
              label="Host node"
              required
              error={errors.pve_node_id?.message}
              hint="Only guests on this node get these addresses."
            >
              <Controller
                control={control}
                name="pve_node_id"
                render={({ field }) => (
                  <HostNodeSelect
                    value={field.value}
                    onChange={field.onChange}
                    availabilityZoneId={azId}
                    placeholder={azId === "" ? "Choose an availability zone first" : undefined}
                  />
                )}
              />
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
              The default route these addresses are handed at boot. Leave both blank only if the
              block is reached through the node&apos;s own uplink — otherwise guests come up
              addressed but with no route off the machine.
            </p>

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
      const parts = line.split(/\s*(?:,|↔|--|\s+)\s*/)
      const publicIP = parts[0] || ""
      const associatedIP = parts[1] || publicIP
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
