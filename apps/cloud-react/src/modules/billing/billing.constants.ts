export const BILLING_ROUTES = {
    ROOT: "/billing",
    OVERVIEW: "/billing",
    INVOICES: "/billing/invoices",
    USAGE: "/billing/usage",
    LEDGER: "/billing/ledger",
    PAYMENT_METHODS: "/billing/payment-methods",
    BUDGETS: "/billing/budgets",
} as const

export const BILLING_QUERY_KEYS = {
    balance: ["billing", "credits", "balance"] as const,
    purchases: ["billing", "credits", "purchases"] as const,
    ledger: (accountId: string) => ["billing", "ledger", accountId] as const,
    invoices: ["billing", "invoices"] as const,
    usage: ["billing", "usage"] as const,
    subscriptions: ["billing", "subscriptions"] as const,
}

// GST percentage used for the live purchase preview. The authoritative figure is
// computed server-side (GST_RATE env); this only drives the client-side estimate.
export const GST_RATE = 18
