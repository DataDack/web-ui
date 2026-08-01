import { createContext, useContext, type ReactNode } from "react"

/**
 * The onboarding step components consume their mutation functions from this
 * context instead of importing flow-specific hooks, so a step stays reusable by
 * any flow that supplies an implementation targeting its own endpoints and
 * refreshing its own queries.
 */
export interface OnboardingFlow {
    setAccountType: (userType: "individual" | "business") => Promise<unknown>
}

const FlowContext = createContext<OnboardingFlow | null>(null)

export function OnboardingFlowProvider({
    value,
    children,
}: Readonly<{ value: OnboardingFlow; children: ReactNode }>) {
    return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useOnboardingFlow(): OnboardingFlow {
    const ctx = useContext(FlowContext)
    if (!ctx) {
        throw new Error("useOnboardingFlow must be used within an OnboardingFlowProvider")
    }
    return ctx
}
