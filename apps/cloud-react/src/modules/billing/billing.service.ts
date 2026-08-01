import { billingApi } from "./billing.api"
import type { LedgerEntry, PurchaseCreditsRequest } from "./billing.types"

export const billingService = {
  fetchBalance: () => billingApi.getBalance(),
  fetchPurchases: () => billingApi.listPurchases(),
  purchaseCredits: (payload: PurchaseCreditsRequest) => billingApi.purchaseCredits(payload),
  /** Fetch the account's credit ledger and map it to the table view shape. */
  fetchLedger: async (accountId: string): Promise<LedgerEntry[]> => {
    const rows = await billingApi.listLedger(accountId)
    return rows.map((e) => ({
      id: e.id,
      created_at: e.created_at,
      description: e.description,
      kind: e.entry_type,
      amount: e.amount,
      balance: e.balance_after,
      ref_type: e.ref_type,
    }))
  },
  fetchInvoices: () => billingApi.listInvoices(),
  fetchUsage: () => billingApi.listUsage(),
  fetchSubscriptions: () => billingApi.listSubscriptions(),
  /** Download an invoice PDF and trigger a browser save. */
  downloadInvoicePdf: async (id: string, invoiceNumber: string) => {
    const blob = await billingApi.downloadInvoicePdf(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${invoiceNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
