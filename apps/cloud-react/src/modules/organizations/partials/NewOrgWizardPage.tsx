import { useState } from "react"

import { Button, Input, Label } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Check, Loader2, User } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import type { WizardStepMeta } from "@/components/console/wizard/WizardStepper"
import { cn } from "@/lib/utils"
import { PolicyConsent } from "@/modules/auth/components/PolicyConsent"
import { CountrySelect } from "@/modules/countries/CountrySelect"
import { OnboardingLayout } from "@/modules/onboarding/partials/OnboardingLayout"
import { useScreen } from "@/services/api/screen"

import { useCreateOrganization } from "../organizations.hooks"
import type { ProvisionOrganizationPayload } from "../organizations.types"

// Creating an additional organization is a single provision call now (no draft
// flow): name + account type, optional tax ids / billing address, consent, go.
const STEP_META = [
  { id: "create", titleKey: "org.newOrg.steps.name", descKey: "org.newOrg.steps.nameDesc" },
]

type AccountType = "individual" | "business"

const TYPE_OPTIONS: { value: AccountType; icon: typeof User; titleKey: string; descKey: string }[] =
  [
    {
      value: "individual",
      icon: User,
      titleKey: "onboarding.type.individual",
      descKey: "onboarding.type.individualDesc",
    },
    {
      value: "business",
      icon: Building2,
      titleKey: "onboarding.type.business",
      descKey: "onboarding.type.businessDesc",
    },
  ]

export function NewOrgWizardPage() {
  useScreen("organizations.new-org-wizard")
  const { t } = useTranslation()
  const create = useCreateOrganization()
  const [consent, setConsent] = useState(false)

  const k = (key: string) => `org.settings.billingAddress.${key}`
  const required = t(k("errors.required"))
  const schema = z
    .object({
      name: z.string().trim().min(2, t("org.newOrg.steps.nameError")).max(100),
      user_type: z.enum(["individual", "business"]),
      billing_email: z.union([z.email(), z.literal("")]).optional(),
      gstin: z.string().trim().optional(),
      tan: z.string().trim().optional(),
      line1: z.string().trim().optional(),
      line2: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      postal_code: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    // The billing address is optional as a whole, but once any part is
    // entered the required fields must all be present.
    .superRefine((v, ctx) => {
      const parts = [v.line1, v.line2, v.city, v.state, v.postal_code, v.country]
      if (parts.every((p) => !p)) return
      for (const field of ["line1", "city", "state", "postal_code", "country"] as const) {
        if (!v[field]) ctx.addIssue({ code: "custom", message: required, path: [field] })
      }
    })
  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      user_type: "individual",
      billing_email: "",
      gstin: "",
      tan: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
    },
  })

  const isBusiness = watch("user_type") === "business"

  const onSubmit = (v: Values) => {
    const hasAddress = !!v.line1
    const payload: ProvisionOrganizationPayload = {
      name: v.name,
      user_type: v.user_type,
      billing_email: v.billing_email || undefined,
      accept_terms: consent,
      gstin: (isBusiness && v.gstin) || undefined,
      tan: (isBusiness && v.tan) || undefined,
      billing_address: hasAddress
        ? {
            line1: v.line1 ?? "",
            line2: v.line2 || undefined,
            city: v.city ?? "",
            state: v.state ?? "",
            postal_code: v.postal_code ?? "",
            country: v.country ?? "",
          }
        : undefined,
    }
    create.mutate(payload)
  }

  const steps: WizardStepMeta[] = STEP_META.map((s) => ({
    id: s.id,
    title: t(s.titleKey),
    description: t(s.descKey),
  }))

  return (
    <OnboardingLayout
      steps={steps}
      currentIndex={0}
      maxVisitedIndex={0}
      onStepClick={() => undefined}
      title={t(STEP_META[0].titleKey)}
      description={t(STEP_META[0].descKey)}
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-xl space-y-6">
        <Field
          label={t("org.newOrg.name")}
          required
          hint={t("org.newOrg.nameHint")}
          error={errors.name?.message}
        >
          <Input {...register("name")} placeholder="Acme Inc." />
        </Field>

        {/* Account type — individual or business (unlocks GSTIN/TAN). */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("onboarding.steps.type")}
          </Label>
          <Controller
            control={control}
            name="user_type"
            render={({ field }) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {TYPE_OPTIONS.map(({ value, icon: Icon, titleKey, descKey }) => {
                  const active = field.value === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        field.onChange(value)
                      }}
                      aria-pressed={active}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-gold/50",
                        active
                          ? "border-brand-gold bg-brand-gold-soft shadow-sm"
                          : "border-border-glass hover:border-brand-gold/50 hover:bg-accent/30",
                      )}
                    >
                      {active && (
                        <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-brand-gold text-brand-gold-foreground">
                          <Check className="size-3.5" />
                        </span>
                      )}
                      <Icon className="size-5" />
                      <span>
                        <span className="block text-sm font-semibold">{t(titleKey)}</span>
                        <span className="mt-0.5 block text-[12px] text-muted-foreground">
                          {t(descKey)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          />
        </div>

        <Field
          label={t("org.settings.billingEmail")}
          hint={t(k("optional"))}
          error={errors.billing_email?.message}
        >
          <Input
            {...register("billing_email")}
            type="email"
            placeholder="billing@acme.com"
            className="font-mono"
          />
        </Field>

        {isBusiness && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="GSTIN" hint={t(k("optional"))}>
              <Input
                {...register("gstin")}
                placeholder="22AAAAA9999A1Z5"
                className="font-mono uppercase"
              />
            </Field>
            <Field label="TAN" hint={t(k("optional"))}>
              <Input
                {...register("tan")}
                placeholder="AAAA99999A"
                className="font-mono uppercase"
              />
            </Field>
          </div>
        )}

        {/* Billing address — optional; complete it or leave it entirely empty. */}
        <div className="space-y-5 rounded-xl border border-border-glass p-4">
          <div>
            <p className="text-sm font-semibold">{t(k("title"))}</p>
            <p className="text-[12px] text-muted-foreground">{t(k("optional"))}</p>
          </div>
          <Field label={t(k("line1"))} error={errors.line1?.message}>
            <Input {...register("line1")} placeholder={t(k("placeholders.line1"))} />
          </Field>
          <Field label={t(k("line2"))} hint={t(k("optional"))}>
            <Input {...register("line2")} placeholder={t(k("placeholders.line2"))} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t(k("city"))} error={errors.city?.message}>
              <Input {...register("city")} placeholder={t(k("placeholders.city"))} />
            </Field>
            <Field label={t(k("state"))} error={errors.state?.message}>
              <Input {...register("state")} placeholder={t(k("placeholders.state"))} />
            </Field>
            <Field label={t(k("postalCode"))} error={errors.postal_code?.message}>
              <Input {...register("postal_code")} placeholder={t(k("placeholders.postalCode"))} />
            </Field>
            <Field label={t(k("country"))} error={errors.country?.message}>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <CountrySelect
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder={t(k("selectCountry"))}
                    invalid={!!errors.country}
                  />
                )}
              />
            </Field>
          </div>
        </div>

        <PolicyConsent checked={consent} onCheckedChange={setConsent} disabled={create.isPending} />

        <Button
          type="submit"
          disabled={!consent || create.isPending}
          className="btn-gold rounded-full font-bold"
          loading={create.isPending}
        >
          {create.isPending && <Loader2 className="size-4 animate-spin" />}
          {t("org.newOrg.submit")}
        </Button>
      </form>
    </OnboardingLayout>
  )
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: Readonly<{
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
