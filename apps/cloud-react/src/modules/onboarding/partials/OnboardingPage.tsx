import { useMemo, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { OnboardingStepSkeleton } from "@/components/console/feedback/Skeletons"
import { AUTH_QUERY_KEYS } from "@/modules/auth/auth.constants"
import { extractError } from "@/services/api/client"
import { useScreen } from "@/services/api/screen"

import { OnboardingLayout } from "./OnboardingLayout"
import { onboardingApi } from "../onboarding.api"
import { OnboardingFlowProvider, type OnboardingFlow } from "../onboarding.flow"
import {
  ONBOARDING_QUERY_KEYS,
  useCompleteOnboarding,
  useOnboardingStatus,
} from "../onboarding.hooks"
import { AccountTypeStep } from "./steps/AccountTypeStep"
import { BasicDetailsStep } from "./steps/BasicDetailsStep"
import { ReviewStep } from "./steps/ReviewStep"

// Signup-first onboarding: confirm the basic details (display name + required
// mobile number — the backend rejects /complete without a phone), pick the
// account type (plus the organization name for organization accounts), preview,
// and create. KYC verification is a separate, skippable flow (/onboarding/kyc)
// — required only before creating billable resources.
const STEP_META = [
  {
    id: "details",
    titleKey: "onboarding.steps.details",
    descKey: "onboarding.steps.detailsDesc",
  },
  { id: "type", titleKey: "onboarding.steps.type", descKey: "onboarding.steps.typeDesc" },
  { id: "review", titleKey: "onboarding.steps.review", descKey: "onboarding.steps.reviewDesc" },
]

type Choice = "individual" | "business"

export function OnboardingPage() {
  useScreen("onboarding")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: status, isLoading } = useOnboardingStatus()
  const complete = useCompleteOnboarding()
  const qc = useQueryClient()

  // The primary (per-user) flow implementation the shared steps call into.
  const flow = useMemo<OnboardingFlow>(() => {
    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEYS.status })
      void qc.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session })
    }
    return {
      setAccountType: async (t) => {
        await onboardingApi.setAccountType(t)
        invalidate()
      },
    }
  }, [qc])

  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<Choice | "">("")
  const [orgName, setOrgName] = useState("")

  const steps = useMemo(
    () => STEP_META.map((s) => ({ id: s.id, title: t(s.titleKey), description: t(s.descKey) })),
    [t],
  )

  // Already onboarded → straight to the console.
  if (status?.onboarding_status === "completed") {
    return <Navigate to="/" replace />
  }

  // Provision the tenancy, then go straight to the console — verification is
  // offered there, whenever the user chooses.
  const provision = async (type: Choice, name?: string) => {
    try {
      await complete.mutateAsync({
        account_type: type,
        organization_name: type === "business" ? name : undefined,
        // Consent was captured on the signup panel; stamp it onto the
        // account created here.
        accept_terms: true,
      })
      toast.success(t("onboarding.success.title"))
      void navigate("/", { replace: true })
    } catch (e) {
      // Fallback for the backend's own gate ("mobile number is required to
      // sign up") and any other provisioning failure.
      toast.error(extractError(e, t("onboarding.review.failed")))
    }
  }

  const onComplete = async () => {
    if (!choice) return
    await provision(choice, orgName)
  }

  // Skip: the rest of onboarding is optional — one click provisions a default
  // individual account; every detail (type, org, verification) can be filled
  // in later. Only reachable after the (required) basic-details step.
  const onSkip = () => void provision("individual")

  const renderStep = () => {
    if (isLoading || !status) return <OnboardingStepSkeleton />
    switch (STEP_META[step].id) {
      case "details":
        return (
          <BasicDetailsStep
            onNext={() => {
              setStep(step + 1)
            }}
          />
        )
      case "type":
        return (
          <AccountTypeStep
            current={choice || status.user_type}
            orgName={orgName}
            askOrgName
            onSkip={complete.isPending ? undefined : onSkip}
            onNext={(c, name) => {
              setChoice(c)
              setOrgName(name)
              setStep(step + 1)
            }}
          />
        )
      default:
        return (
          <ReviewStep
            status={status}
            accountType={choice || "individual"}
            orgName={orgName}
            isCompleting={complete.isPending}
            onBack={() => {
              setStep(step - 1)
            }}
            onComplete={() => void onComplete()}
          />
        )
    }
  }

  return (
    <OnboardingLayout
      steps={steps}
      currentIndex={step}
      maxVisitedIndex={step}
      onStepClick={(i) => {
        if (i <= step) setStep(i)
      }}
      title={t(STEP_META[step].titleKey)}
      description={t(STEP_META[step].descKey)}
    >
      <OnboardingFlowProvider value={flow}>{renderStep()}</OnboardingFlowProvider>
    </OnboardingLayout>
  )
}
