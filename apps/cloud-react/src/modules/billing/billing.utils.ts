// Shared formatting + analytics helpers for the billing section.
//
// Money conventions (mirror billing.types.ts):
//   • `credits` and the wallet `balance` are in whole credits (₹).
//   • payment amounts (base/gst/total on a CreditPurchase) are in paise.
//   • ledger / usage / invoice amounts are in ₹ (numeric, 2dp).

import type { LedgerEntry, UsageRecordApi } from "./billing.types"

/** Format a whole-rupee amount as INR currency. */
export function inr(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees)
}

/** Format a paise amount (gateway smallest unit) as INR currency. */
export function paiseToInr(paise: number): string {
  return inr(paise / 100)
}

/** Compact INR for tight spots (₹1.2L, ₹12k) — used on hero/chart labels. */
export function inrCompact(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(rupees)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** UTC calendar-day key (YYYY-MM-DD) for grouping time series. */
function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * Daily debit (spend) totals over the trailing `days` window, oldest → newest.
 * Days with no debit are zero-filled so the series is evenly spaced for the
 * chart. Ledger debits are the authoritative spend signal (usage + invoice
 * postings both land here). Returns whole-₹ amounts.
 */
export function spendSeries(ledger: LedgerEntry[], days = 30, now = Date.now()): number[] {
  const totals = new Map<string, number>()
  for (const entry of ledger) {
    if (entry.kind !== "debit") continue
    totals.set(dayKey(entry.created_at), (totals.get(dayKey(entry.created_at)) ?? 0) + entry.amount)
  }
  const series: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now - i * DAY_MS).toISOString().slice(0, 10)
    series.push(Math.round((totals.get(key) ?? 0) * 100) / 100)
  }
  return series
}

/**
 * Running wallet balance over the trailing window, oldest → newest, sampled from
 * ledger `balance_after`. Falls back to the current balance when the window has
 * no entries so the sparkline still renders a flat line.
 */
export function balanceSeries(
  ledger: LedgerEntry[],
  current: number,
  days = 30,
  now = Date.now(),
): number[] {
  const cutoff = now - days * DAY_MS
  const recent = [...ledger]
    .filter((e) => new Date(e.created_at).getTime() >= cutoff)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  if (recent.length === 0) return [current, current]
  return recent.map((e) => e.balance)
}

export interface BurnSummary {
  /** Average daily spend over the window, in ₹. */
  perDay: number
  /** Days of wallet runway at the current burn, or null when burn is zero. */
  runwayDays: number | null
}

/**
 * Estimate daily burn from usage cost over the trailing window and derive
 * runway from the current balance. GST is paid when credits are purchased, so
 * resource usage consumes only its recorded cost.
 */
export function burnSummary(
  usage: UsageRecordApi[],
  balance: number,
  _gstRate = 18,
  days = 30,
): BurnSummary {
  const total = usage.reduce((sum, r) => sum + r.cost, 0)
  const perDay = total / days
  const runwayDays = perDay > 0 ? Math.floor(balance / perDay) : null
  return { perDay: Math.round(perDay * 100) / 100, runwayDays }
}

export interface ServiceSlice {
  service: string
  cost: number
  /** Share of total spend, 0..1. */
  fraction: number
}

/** Usage cost grouped by service, largest first, with each slice's share. */
export function costByService(usage: UsageRecordApi[]): ServiceSlice[] {
  const totals = new Map<string, number>()
  for (const r of usage) totals.set(r.service, (totals.get(r.service) ?? 0) + r.cost)
  const grand = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .map(([service, cost]) => ({ service, cost, fraction: grand > 0 ? cost / grand : 0 }))
    .sort((a, b) => b.cost - a.cost)
}
