import { useState } from "react"

import { Label } from "@datadack/common-ui"
import { useMutation } from "@tanstack/react-query"
import { Building2, Check, Loader2, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button, Input } from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { extractError } from "@/services/api/client"

import { useOnboardingFlow } from "../../onboarding.flow"

type Choice = "individual" | "business"

const OPTIONS: { value: Choice; icon: typeof User; titleKey: string; descKey: string }[] = [
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

export function AccountTypeStep({
  current,
  orgName: initialOrgName = "",
  askOrgName = false,
  onSkip,
  onNext,
}: Readonly<{
  current: Choice | ""
  orgName?: string
  /** Signup flow: collect the organization name inline when "business" is
   *  picked. The new-org wizard collects the name in its own step instead. */
  askOrgName?: boolean
  /** Signup flow: onboarding is optional — when provided, a "Skip for now"
   *  action provisions a default individual account immediately. */
  onSkip?: () => void
  onNext: (choice: Choice, orgName: string) => void
}>) {
  const { t } = useTranslation()
  const flow = useOnboardingFlow()
  const setType = useMutation({ mutationFn: (c: Choice) => flow.setAccountType(c) })
  const [choice, setChoice] = useState<Choice | "">(current)
  const [orgName, setOrgName] = useState(initialOrgName)

  // Organization accounts need exactly one extra detail up front: the name.
  const orgNameMissing = askOrgName && choice === "business" && orgName.trim().length < 2

  const onContinue = async () => {
    if (!choice || orgNameMissing) return
    try {
      await setType.mutateAsync(choice)
      onNext(choice, orgName.trim())
    } catch (e) {
      toast.error(extractError(e, t("onboarding.type.failed")))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value, icon: Icon, titleKey, descKey }) => {
          const active = choice === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setChoice(value)
              }}
              aria-pressed={active}
              className={cn(
                "relative flex flex-col items-start gap-3 rounded-xl border p-5 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-gold/50",
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
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-lg",
                  active ? "bg-brand-gold text-brand-gold-foreground" : "bg-accent text-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{t(titleKey)}</span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">{t(descKey)}</span>
              </span>
            </button>
          )
        })}
      </div>

      {askOrgName && choice === "business" && (
        <div className="space-y-1.5">
          <Label htmlFor="org-name">{t("onboarding.type.orgName")}</Label>
          <Input
            id="org-name"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value)
            }}
            placeholder={t("onboarding.type.orgNamePlaceholder")}
            maxLength={200}
          />
          <p className="text-[12px] text-muted-foreground">{t("onboarding.type.orgNameDesc")}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={() => void onContinue()}
          disabled={!choice || orgNameMissing || setType.isPending}
          className="btn-gold rounded-full font-bold"
        >
          {setType.isPending && <Loader2 className="size-4 animate-spin" />}
          {t("onboarding.continue")}
        </Button>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip} disabled={setType.isPending}>
            {t("onboarding.type.skip")}
          </Button>
        )}
      </div>
    </div>
  )
}
