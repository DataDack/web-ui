import type { RouteObject } from "react-router-dom"

export const billingRoutes: RouteObject[] = [
    {
        path: "billing",
        lazy: async () => {
            const { BillingLayout } = await import("./partials/BillingLayout")
            return { Component: BillingLayout }
        },
        children: [
            {
                index: true,
                lazy: async () => {
                    const { BillingOverviewPage } = await import("./partials/BillingOverviewPage")
                    return { Component: BillingOverviewPage }
                },
            },
            {
                path: "invoices",
                lazy: async () => {
                    const { InvoicesPage } = await import("./partials/InvoicesPage")
                    return { Component: InvoicesPage }
                },
            },
            {
                path: "usage",
                lazy: async () => {
                    const { UsagePage } = await import("./partials/UsagePage")
                    return { Component: UsagePage }
                },
            },
            {
                path: "ledger",
                lazy: async () => {
                    const { LedgerPage } = await import("./partials/LedgerPage")
                    return { Component: LedgerPage }
                },
            },
            {
                path: "payment-methods",
                lazy: async () => {
                    const { PaymentMethodsPage } = await import("./partials/PaymentMethodsPage")
                    return { Component: PaymentMethodsPage }
                },
            },
            {
                path: "budgets",
                lazy: async () => {
                    const { BudgetsPage } = await import("./partials/BudgetsPage")
                    return { Component: BudgetsPage }
                },
            },
        ],
    },
]
