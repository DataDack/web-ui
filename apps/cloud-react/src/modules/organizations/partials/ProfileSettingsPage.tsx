import { useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { BadgeCheck, Save, ShieldCheck, UserCog } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { KeyValueGrid, PageHeader, Section } from "@/components/console"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/modules/auth/auth.context"
import { useCountries } from "@/modules/countries/countries.hooks"
import { useScreen } from "@/services/api/screen"

import { useUpdateProfile } from "../organizations.hooks"

const schema = z.object({
  name: z.string().min(2, "Minimum 2 characters").max(100, "Maximum 100 characters"),
})

type FormValues = z.infer<typeof schema>

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "U"
}

export function ProfileSettingsPage() {
  useScreen("organizations.profile-settings")
  const { t } = useTranslation()
  const { user, isLoading } = useAuth()
  const { mutate: save, isPending } = useUpdateProfile()
  const { data: countries } = useCountries()

  // Resolve the stored ISO code (e.g. "IN") to a flagged name; fall back to the
  // raw code while the list loads or for an unknown code.
  const country = countries?.find((c) => c.iso2 === user?.country)
  const countryLabel = country ? `${country.flag} ${country.name}` : (user?.country ?? "") || "—"

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })

  useEffect(() => {
    if (user) reset({ name: user.name })
  }, [user, reset])

  const watchedName = useWatch({ control, name: "name" })
  const previewName = watchedName.trim() ? watchedName : (user?.name ?? "")

  const onSubmit = (values: FormValues) => {
    save(values.name)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={UserCog}
        breadcrumbs={[{ label: t("console.nav.groups.governance") }, { label: t("profile.title") }]}
        title={t("profile.title")}
        description={t("profile.subtitle")}
      />

      {isLoading || !user ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <>
          <Section
            variant="panel"
            title={t("profile.account")}
            description={t("profile.accountDescription")}
          >
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-xl space-y-5">
              {/* Avatar — derived from the display name (initials). */}
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarFallback className="bg-brand-gold text-lg font-bold text-brand-gold-foreground">
                    {initialsOf(previewName || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{previewName || "—"}</p>
                  <p className="text-[12px] text-muted-foreground">{t("profile.avatarHint")}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  {t("profile.name")}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input {...register("name")} placeholder="Jane Doe" />
                {errors.name && (
                  <p className="text-[11px] text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  {t("profile.email")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input value={user.email} disabled readOnly className="font-mono" />
                  {user.email_verified && (
                    <Badge variant="outline" className="gap-1 shrink-0">
                      <BadgeCheck className="size-3 text-status-success" />
                      {t("profile.verified")}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{t("profile.emailHint")}</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  type="submit"
                  variant="gold"
                  className="gap-1.5"
                  disabled={isPending || !isDirty}
                >
                  <Save className="size-3.5" />
                  {isPending ? t("profile.saving") : t("profile.save")}
                </Button>
              </div>
            </form>
          </Section>

          <Section
            variant="panel"
            title={t("profile.details")}
            actions={<ShieldCheck className="size-4 text-muted-foreground" />}
          >
            <KeyValueGrid
              columns={2}
              items={[
                { label: t("profile.role"), value: user.role, mono: true },
                {
                  label: t("profile.accountType"),
                  value: user.user_type ? t(`onboarding.type.${user.user_type}`) : "—",
                },
                {
                  label: t("profile.country"),
                  value: countryLabel,
                },
                {
                  label: t("profile.userId"),
                  value: user.id,
                  mono: true,
                  copyable: true,
                },
              ]}
            />
          </Section>
        </>
      )}
    </div>
  )
}
