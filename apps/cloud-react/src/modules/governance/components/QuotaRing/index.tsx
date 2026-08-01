import { useEffect, useState } from "react"

import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import { type QuotaTone, quotaTone } from "./quota-tone"

const STROKE_CLASSES: Record<QuotaTone, string> = {
  ok: "stroke-status-success",
  warn: "stroke-status-warning",
  full: "stroke-status-danger",
}

const TEXT_CLASSES: Record<QuotaTone, string> = {
  ok: "text-foreground",
  warn: "text-status-warning",
  full: "text-status-danger",
}

/** Fraction of the limit consumed — 0 for unlimited, clamped to 1. */
function usageRatio(used: number, limit: number): number {
  if (limit === -1) return 0
  if (limit <= 0) return used > 0 ? 1 : 0
  return Math.min(used / limit, 1)
}

export interface QuotaRingProps {
  used: number
  /** −1 = unlimited (renders the track only, with an ∞ center label). */
  limit: number
  size?: number
  strokeWidth?: number
  className?: string
}

/**
 * Mini donut showing quota consumption. The arc sweeps in from zero on mount
 * (pure CSS transition on stroke-dashoffset, disabled under reduced motion) and
 * colors by threshold: <70% ok · 70–99% warning · ≥100% danger.
 */
export function QuotaRing({
  used,
  limit,
  size = 40,
  strokeWidth = 4,
  className,
}: Readonly<QuotaRingProps>) {
  const { t } = useTranslation()
  // First paint renders the arc at zero; flipping this after a frame lets the
  // CSS transition carry it to the real value.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setEntered(true)
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  const unlimited = limit === -1
  const ratio = usageRatio(used, limit)
  const tone = quotaTone(used, limit)

  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (entered ? ratio : 0))
  const percent = Math.round(ratio * 100)

  return (
    <span
      role="img"
      aria-label={
        unlimited
          ? t("governance.quotas.unlimited")
          : t("governance.quotas.usageOf", { used, limit })
      }
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border/70"
        />
        {!unlimited && ratio > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none",
              STROKE_CLASSES[tone],
            )}
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
          unlimited ? "text-muted-foreground" : TEXT_CLASSES[tone],
        )}
        style={{ fontSize: Math.max(9, Math.round(size * 0.26)) }}
      >
        {unlimited ? "∞" : `${String(percent)}%`}
      </span>
    </span>
  )
}
