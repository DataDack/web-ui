import { Label, Separator } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { useProvisionAccount } from "../accounts.hooks"

const schema = z.object({
  name: z.string().min(2, "Minimum 2 characters").max(100, "Maximum 100 characters"),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAccountSheet({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: provision, isPending } = useProvisionAccount()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: FormValues) => {
    provision({ name: values.name }, { onSuccess: close })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("accounts.form.title")}</SheetTitle>
          <SheetDescription>{t("accounts.form.subtitle")}</SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("accounts.form.name")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input {...register("name")} placeholder={t("accounts.form.namePlaceholder")} />
              {errors.name ? (
                <p className="text-[11px] text-destructive">{errors.name.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t("accounts.form.nameHint")}</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("accounts.form.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending ? t("accounts.form.creating") : t("accounts.form.create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
