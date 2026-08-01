import { useMemo } from "react"

import { Label, Separator, Textarea } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { useCreateIAMPolicy } from "../iam.hooks"

const DEFAULT_DOCUMENT = `{
    "version": "2026-01-01",
    "statement": [
        {
            "effect": "allow",
            "action": ["vm:get", "vm:list"],
            "resource": ["*"]
        }
    ]
}`

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    description: z.string().min(1, "Required").max(300, "Maximum 300 characters"),
    document: z.string().refine(
      (value) => {
        try {
          JSON.parse(value)
          return true
        } catch {
          return false
        }
      },
      { message: "Must be valid JSON" },
    ),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePolicySheet({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateIAMPolicy()
  const { rule } = useNamingRule("iam-policy")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { document: DEFAULT_DOCUMENT },
  })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: FormValues) => {
    create(
      { ...values, document: JSON.stringify(JSON.parse(values.document)) },
      { onSuccess: close },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[560px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("iam.policies.createForm.title")}</SheetTitle>
          <SheetDescription>{t("iam.policies.createForm.subtitle")}</SheetDescription>
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
              <Input {...register("name")} placeholder="DeployReadOnly" className="font-mono" />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("iam.columns.description")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                {...register("description")}
                placeholder={t("iam.policies.createForm.descriptionPlaceholder")}
              />
              {errors.description && (
                <p className="text-[11px] text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("iam.policies.createForm.document")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                {...register("document")}
                rows={14}
                spellCheck={false}
                className="font-mono text-[12px] leading-relaxed resize-none"
              />
              {errors.document && (
                <p className="text-[11px] text-destructive">{errors.document.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t("iam.policies.createForm.documentHint")}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending ? t("iam.policies.createForm.creating") : t("iam.policies.create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
