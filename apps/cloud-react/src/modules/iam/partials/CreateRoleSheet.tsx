import { useMemo } from "react"

import {
  Button,
  Input,
  Label,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { useCreateIAMRole } from "../iam.hooks"

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    description: z.string().min(1, "Required").max(300, "Maximum 300 characters"),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRoleSheet({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateIAMRole()
  const { rule } = useNamingRule("iam-role")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: FormValues) => {
    create(values, { onSuccess: close })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("iam.roles.createForm.title")}</SheetTitle>
          <SheetDescription>{t("iam.roles.createForm.subtitle")}</SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("iam.columns.name")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input {...register("name")} placeholder="deploy-operator" className="font-mono" />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("iam.columns.description")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                {...register("description")}
                placeholder={t("iam.roles.createForm.descriptionPlaceholder")}
                rows={3}
                className="resize-none"
              />
              {errors.description && (
                <p className="text-[11px] text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending ? t("iam.roles.createForm.creating") : t("iam.roles.create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
