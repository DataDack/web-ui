import type { RouteObject } from "react-router-dom"

import { RequireAuth } from "@/modules/auth/components/RequireAuth"

export const onboardingRoutes: RouteObject[] = [
  {
    path: "onboarding",
    lazy: async () => {
      const { OnboardingPage } = await import("./partials/OnboardingPage")
      return {
        Component: () => (
          <RequireAuth requireOnboarded={false}>
            <OnboardingPage />
          </RequireAuth>
        ),
      }
    },
  },
  {
    // Skippable account verification (KYC / re-KYC) — separate from
    // onboarding; required only before creating billable resources.
    path: "onboarding/kyc",
    lazy: async () => {
      const { VerificationPage } = await import("./partials/VerificationPage")
      return {
        Component: () => (
          <RequireAuth>
            <VerificationPage />
          </RequireAuth>
        ),
      }
    },
  },
]
