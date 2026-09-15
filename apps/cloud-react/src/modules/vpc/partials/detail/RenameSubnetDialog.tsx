import { useEffect, useMemo } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { useRenameSubnet } from "../../vpc.hooks"
import type { Subnet } from "../../vpc.types"

const makeSchema = (rule: NamingRule) => z.object({ name: namingNameSchema(rule) })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

interface Props {
  /** The subnet being renamed; the dialog is open while this is set. */
  subnet: Subnet | null
  onClose: () => void
}

/**
 * Renames a subnet — the one field the backend lets change after create. The
 * CIDR and zone are realized into the SDN, so they are shown nowhere here as
 * editable, rather than offered and then refused.
 */
export function RenameSubnetDialog({ subnet, onClose }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: rename, isPending } = useRenameSubnet()
  const { rule } = useNamingRule("subnet")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } })

  // Re-seed on every open so the field shows the subnet being renamed, not the
  // last one.
  useEffect(() => {
    if (subnet) reset({ name: subnet.name })
  }, [subnet, reset])

  const onSubmit = (values: FormValues) => {
    if (!subnet) return
    rename({ id: subnet.id, name: values.name }, { onSuccess: onClose })
  }

  return (
    <Dialog
      open={subnet !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("vpc.subnetRename.title")}</DialogTitle>
          <DialogDescription>{t("vpc.subnetRename.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("vpc.subnetRename.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input {...register("name")} className="font-mono" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            {subnet && <p className="font-mono text-[11px] text-muted-foreground">{subnet.cidr}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("console.wizard.cancel")}
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={isPending || !isDirty}
              loading={isPending}
            >
              {isPending ? t("vpc.subnetRename.saving") : t("vpc.subnetRename.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
