import { api, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type {
  CreditBalance,
  CreditStatement,
  CreditPurchase,
  Invoice,
  LedgerApiEntry,
  PurchaseCreditsRequest,
  PurchaseCreditsResponse,
  SubscriptionApi,
  UsageRecordApi,
} from "./billing.types"

// Live cloud-be-go endpoints (mounted under /api/v1 by the axios baseURL):
//   balance   → GET  /billing/credits/balance
//   purchases → GET  /billing/credits/purchases
//   purchase  → POST /billing/credits/purchase   (returns the hosted checkout URL)
//
// Settlement is webhook-driven: after the customer pays on the gateway's hosted
// page, the gateway credits the wallet via the signed webhook and returns the
// browser to redirect_url. The page just refetches on return.
// The credit ledger (apps/billing/ledger) is account-scoped by path param; the
// account id comes from the balance response.
export const billingApi = {
  listStatements: () => apiGet<CreditStatement[]>("/billing/charge/statements"),
  downloadStatement: async (id: string, format: "excel" | "pdf" = "excel"): Promise<Blob> => {
    const res = await api.get(`/billing/charge/statements/${id}/${format}`, {
      responseType: "blob",
    })
    return res.data as Blob
  },
  topupInvoice: (id: string) =>
    apiGet<{ pdf: string; filename: string }>(`/billing/credits/purchases/${id}/invoice`),
  getBalance: () => apiGet<CreditBalance>("/billing/credits/balance"),
  listPurchases: () => apiGet<CreditPurchase[]>("/billing/credits/purchases"),
  purchaseCredits: (payload: PurchaseCreditsRequest) =>
    apiPost<PurchaseCreditsResponse>("/billing/credits/purchase", payload),
  listLedger: (accountId: string) => apiGet<LedgerApiEntry[]>(`/billing/ledger/${accountId}`),
  listInvoices: () => apiGet<Invoice[]>(`/billing/invoices${LIST_QUERY}`),
  listUsage: () => apiGet<UsageRecordApi[]>("/billing/charge/usage"),
  listSubscriptions: () => apiGet<SubscriptionApi[]>("/billing/charge/subscriptions"),
  // Invoice PDF is binary; fetch it via the raw axios instance (carries the
  // Bearer token + X-Account-Id) as a blob so the browser can download it.
  downloadInvoicePdf: async (id: string): Promise<Blob> => {
    const res = await api.get(`/billing/charge/invoices/${id}/pdf`, { responseType: "blob" })
    return res.data as Blob
  },
}
