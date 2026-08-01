import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { useCreateIAMUser } from "../iam.hooks"

// POST /auth/users accepts only the flat account role; richer IAM roles are
// granted afterwards on the user detail page.
const ACCOUNT_ROLES = ["admin", "user"] as const

const schema = z.object({
  name: z.string().min(2, "Minimum 2 characters").max(100, "Maximum 100 characters"),
  email: z.email("Must be a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.string().min(1, "Select a role"),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteUserSheet({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateIAMUser()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: "user" } })

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
          <SheetTitle>{t("iam.users.inviteForm.title")}</SheetTitle>
          <SheetDescription>{t("iam.users.inviteForm.subtitle")}</SheetDescription>
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
              <Input {...register("name")} placeholder="Jane Doe" />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("iam.columns.email")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input {...register("email")} placeholder="jane@company.com" className="font-mono" />
              {errors.email && (
                <p className="text-[11px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("iam.columns.password")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                {...register("password")}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-[11px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("iam.columns.primaryRole")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select
                value={watch("role")}
                onValueChange={(value) => {
                  setValue("role", value, { shouldValidate: true })
                }}
              >
                <SelectTrigger className="w-full font-mono text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_ROLES.map((role) => (
                    <SelectItem key={role} value={role} className="font-mono text-[13px]">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending ? t("iam.users.inviteForm.inviting") : t("iam.users.invite")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
