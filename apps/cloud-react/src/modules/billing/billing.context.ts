import { useOutletContext } from "react-router-dom"

/** Shared context so nested billing pages can open the top-up dialog. */
export interface BillingOutletContext {
    openTopup: (credits?: number) => void
}

export function useBillingOutlet(): BillingOutletContext {
    return useOutletContext<BillingOutletContext>()
}
