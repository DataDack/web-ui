import type React from "react"

import { RefreshCw } from "lucide-react"

import { Button, cn, Label } from "@datadack/common-ui"

export function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

export function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

/**
 * Refetch control for a picker whose options are created elsewhere in the
 * console (a VPC, a security group). The wizard is long-lived — a user who
 * opens the VPC page in a second tab, creates one, and comes back would
 * otherwise be stuck with the list React Query cached on mount.
 */
export function ReloadButton({
  onClick,
  loading = false,
  label,
  className,
}: Readonly<{
  onClick: () => void
  loading?: boolean
  label: string
  className?: string
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-6 text-muted-foreground hover:text-foreground", className)}
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={label}
    >
      <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
    </Button>
  )
}
