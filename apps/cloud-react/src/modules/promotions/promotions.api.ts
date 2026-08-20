import axios from "axios"

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/services/api/client"

import type {
  CreatePromoCodeRequest,
  MyPromotion,
  PromoCode,
  PromoRedemption,
  PromoStats,
  RedeemFailureReason,
  RedeemResult,
  UpdatePromoCodeRequest,
  WalletSplit,
} from "./promotions.types"

const BASE = "/billing/promo"
const ADMIN = `${BASE}/admin`

export const promotionsApi = {
  /* ── Operator ─────────────────────────────────────────────────────────── */
  listCodes: () => apiGet<PromoCode[]>(`${ADMIN}/`),
  stats: () => apiGet<PromoStats>(`${ADMIN}/stats`),
  getCode: (id: string) => apiGet<PromoCode>(`${ADMIN}/${id}`),
  createCode: (payload: CreatePromoCodeRequest) => apiPost<PromoCode>(`${ADMIN}/`, payload),
  updateCode: (id: string, payload: UpdatePromoCodeRequest) =>
    apiPut<PromoCode>(`${ADMIN}/${id}`, payload),
  setCodeStatus: (id: string, status: "active" | "paused") =>
    apiPatch<PromoCode>(`${ADMIN}/${id}/status`, { status }),
  deleteCode: (id: string) => apiDelete(`${ADMIN}/${id}`),
  listRedemptions: (id: string) => apiGet<PromoRedemption[]>(`${ADMIN}/${id}/redemptions`),
  revokeRedemption: (redemptionId: string, reason: string) =>
    apiPost(`${ADMIN}/redemptions/${redemptionId}/revoke`, { reason }),

  /* ── Tenant ───────────────────────────────────────────────────────────── */
  // Preview is the dry run behind the redeem box: it runs the same eligibility
  // check the real redeem does, so what the customer is shown before they commit
  // is what they will actually get.
  preview: (code: string) => apiPost<RedeemResult>(`${BASE}/preview`, { code }),
  redeem: (code: string) => apiPost<RedeemResult>(`${BASE}/redeem`, { code }),
  mine: () => apiGet<MyPromotion[]>(`${BASE}/mine`),
  wallet: () => apiGet<WalletSplit>(`${BASE}/wallet`),
}

/**
 * Pull the machine-readable refusal reason off a rejected redeem/preview.
 *
 * The server sends both a translated-in-English message and a stable `reason`
 * key; the console prefers the key so it can say the same thing in the user's
 * language. Returns null for anything that isn't a structured refusal (a network
 * failure, a 500) — those get the generic error path instead, because "that code
 * isn't recognised" would be a lie about what went wrong.
 */
export function redeemFailureReason(e: unknown): RedeemFailureReason | null {
  if (!axios.isAxiosError(e)) return null
  const body = e.response?.data as { data?: { reason?: string } } | undefined
  const reason = body?.data?.reason
  return reason ? (reason as RedeemFailureReason) : null
}
