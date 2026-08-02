import { useEffect, useMemo } from "react"

import { Button } from "@datadack/common-ui"
import { ExternalLink, Loader2, ShieldAlert, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { OnboardingStepSkeleton } from "@/components/console/feedback/Skeletons"
import { useAuth } from "@/modules/auth/auth.context"
import { useScreen } from "@/services/api/screen"

import { OnboardingLayout } from "./OnboardingLayout"
import { clearKycSkip, skipKycForNow } from "../kyc-skip"
import { useOnboardingStatus, useStartKyc } from "../onboarding.hooks"
import { verificationErrorMessage } from "../start-verification"

// Account verification (KYC) is handled by an external microservice; this page
// shows the completed state (version + date) or a "verification required" state
// that hands the user off to the KYC service. The handoff goes through POST
// /kyc/start — the provider's consent URL is minted per session, so there is no
// fixed page to link to (see ../start-verification). When the platform has no
// KYC service configured (kyc.enabled === false or no kyc block) there is
// nothing to do.
//
// It is also where RequireKyc lands every unverified user: verification is
// mandatory, and the ONLY way past it is the explicit "Skip for now" button,
// which records a per-session skip (kyc-skip) and drops the user into the
// console. Resource creation stays blocked by the backend kycguard either way.
const STEP_META = [
  {
    id: "verify",
    titleKey: "onboarding.verification.title",
    descKey: "onboarding.verification.desc",
  },
]

export function VerificationPage() {
  useScreen("kyc")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { data: status, isLoading, refetch } = useOnboardingStatus()
  const startKyc = useStartKyc()

  // Where RequireKyc pulled the user away from, so verifying/skipping resumes
  // the original destination instead of always dumping them on the dashboard.
  const from = (location.state as { from?: string } | null)?.from ?? "/"

  const leave = () => void navigate(from, { replace: true })

  const onSkip = () => {
    skipKycForNow(user?.id ?? "")
    leave()
  }

  const steps = useMemo(
    () => STEP_META.map((s) => ({ id: s.id, title: t(s.titleKey), description: t(s.descKey) })),
    [t],
  )

  const kyc = status?.kyc
  const enabled = kyc?.enabled === true
  const verified = enabled && kyc.completed && !kyc.need_actions
  // A completed round that got re-flagged means a re-verification, not a first one.
  const rekyc = enabled && kyc.completed && kyc.need_actions

  // Verification landed (webhook applied, status refetched) — drop any stale
  // skip so a later re-KYC flag gates the console again.
  useEffect(() => {
    if (verified) clearKycSkip(user?.id ?? "")
  }, [verified, user?.id])

  // The verdict arrives out-of-band on the KYC webhook, so this page can be
  // stale through no action of the user's: they finish the provider flow in
  // another tab, or the webhook lands while they sit here. Re-read the status
  // whenever the tab becomes visible again — cheap, and it turns "verified but
  // still showing the wall" into a self-correcting state instead of a reload
  // the user has to think of. Only while unverified; there is nothing to watch
  // for once it has landed.
  useEffect(() => {
    if (!enabled || verified) return
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [enabled, verified, refetch])

  const renderContent = () => {
    if (isLoading || !status) return <OnboardingStepSkeleton />

    // No KYC service configured — verification simply isn't required.
    if (!enabled) {
      return (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-border-glass bg-accent/10 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-gold" />
            <div>
              <p className="font-semibold">{t("onboarding.verification.notRequiredTitle")}</p>
              <p className="mt-0.5 text-muted-foreground">
                {t("onboarding.verification.notRequiredDesc")}
              </p>
            </div>
          </div>
          <Button onClick={leave} className="btn-gold rounded-full font-bold">
            {t("onboarding.success.cta")}
          </Button>
        </div>
      )
    }

    if (verified) {
      return (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-status-success/40 bg-status-success-bg p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-status-success" />
            <div>
              <p className="font-semibold">{t("onboarding.verification.verifiedTitle")}</p>
              <p className="mt-0.5 text-muted-foreground">
                {t("onboarding.verification.verifiedDesc")}
              </p>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {kyc.completed_at &&
                  t("onboarding.verification.verifiedAt", {
                    date: new Date(kyc.completed_at).toLocaleDateString(),
                  })}
                {kyc.version != null &&
                  ` · ${t("onboarding.verification.version", { version: kyc.version })}`}
              </p>
            </div>
          </div>
          <Button onClick={leave} className="btn-gold rounded-full font-bold">
            {t("onboarding.success.cta")}
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-xl border border-status-warning/40 bg-status-warning-bg p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-status-warning" />
          <div>
            <p className="font-semibold">
              {t(
                rekyc
                  ? "onboarding.verification.rekycTitle"
                  : "onboarding.verification.requiredTitle",
              )}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {t(
                rekyc
                  ? "onboarding.verification.rekycDesc"
                  : "onboarding.verification.requiredDesc",
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Opens a verification session server-side, then redirects to
                        the provider URL it returns. Stays disabled once pending:
                        the success path navigates away, so re-enabling would only
                        ever let the user open a second session by mistake. */}
          <Button
            onClick={() => {
              startKyc.mutate()
            }}
            disabled={startKyc.isPending}
            className="btn-gold rounded-full font-bold"
          >
            {startKyc.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ExternalLink className="size-4" />
            )}
            {t(
              startKyc.isPending
                ? "onboarding.verification.starting"
                : "onboarding.verification.startVerification",
            )}
          </Button>
          {/* The one way past the gate. Explicit, never automatic —
                        and it only buys this session; resource creation stays
                        blocked by the backend until verification lands. */}
          <Button variant="ghost" onClick={onSkip} disabled={startKyc.isPending}>
            {t("onboarding.verification.skipForNow")}
          </Button>
        </div>
        {startKyc.isError && (
          <p className="text-[13px] text-status-danger">
            {verificationErrorMessage(startKyc.error)}
          </p>
        )}
        <p className="text-[13px] text-muted-foreground">{t("onboarding.verification.skipHint")}</p>
      </div>
    )
  }

  return (
    <OnboardingLayout
      steps={steps}
      currentIndex={0}
      maxVisitedIndex={0}
      onStepClick={() => undefined}
      title={t(STEP_META[0].titleKey)}
      description={t(STEP_META[0].descKey)}
    >
      {renderContent()}
    </OnboardingLayout>
  )
}
