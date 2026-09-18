import { useState, type ReactNode } from "react"

import { Boxes, Cloud, Layers3, Trash2, Zap, type LucideIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Skeleton,
  cn,
} from "@datadack/common-ui"

import type { Integration } from "../../data/schemas"

export const DEFAULT_STAGE = "$default"

/**
 * Where a stage answers. The edge reads the stage from the first path
 * segment, except $default, which is served at the root of the endpoint.
 */
export function stageUrl(endpoint: string, stageName: string): string {
  return stageName === DEFAULT_STAGE ? endpoint : `${endpoint}/${stageName}`
}

/** "GET /pets" → ["GET", "/pets"]; "$default" → ["ANY", "$default"]. */
export function splitRouteKey(routeKey: string): [method: string, path: string] {
  const at = routeKey.indexOf(" ")
  return at === -1 ? ["ANY", routeKey] : [routeKey.slice(0, at), routeKey.slice(at + 1)]
}

/** "integrations/abc" → "abc". */
export const integrationIdOf = (target: string) => target.replace(/^integrations\//, "")

interface TargetKind {
  label: string
  icon: LucideIcon
}

/**
 * What an integration points at, in the words an operator uses. Read from the
 * platform's targetKind: integrationType alone cannot tell a function from a
 * load balancer, since both are reached over HTTP.
 */
const HTTP_KIND: TargetKind = { label: "HTTP URL", icon: Cloud }
const MOCK_KIND: TargetKind = { label: "Mock", icon: Boxes }
const TARGET_KINDS: Partial<Record<string, TargetKind>> = {
  LAMBDA: { label: "Function", icon: Zap },
  LOAD_BALANCER: { label: "Load balancer", icon: Layers3 },
  MOCK: MOCK_KIND,
  HTTP: HTTP_KIND,
}

export function targetKindOf(integration: Integration): TargetKind {
  const kind = integration["x-datadack-targetKind"]
  const fallback: TargetKind = integration.integrationType === "MOCK" ? MOCK_KIND : HTTP_KIND
  return TARGET_KINDS[kind] ?? fallback
}

export function integrationTarget(integration: Integration): string {
  return (
    integration.integrationUri || (integration.integrationType === "MOCK" ? "Mock response" : "—")
  )
}

/** A method, set in mono. ANY is outlined so a catch-all reads differently from a verb. */
export function MethodTag({ method }: Readonly<{ method: string }>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-14 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold tracking-wide",
        method === "ANY"
          ? "border-border text-muted-foreground border border-dashed"
          : "bg-brand-gold/12 text-brand-gold",
      )}
    >
      {method}
    </span>
  )
}

/** The heading row above each tab's table: what it is, how many, and the one action. */
export function TabToolbar({
  title,
  count,
  description,
  action,
}: Readonly<{ title: string; count?: number; description: string; action?: ReactNode }>) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-foreground text-base font-semibold">
          {title}
          {count === undefined ? null : (
            <span className="text-muted-foreground ml-1.5 font-normal">({count})</span>
          )}
        </h2>
        <p className="text-muted-foreground mt-0.5 max-w-2xl text-[13px]">{description}</p>
      </div>
      {action}
    </div>
  )
}

/** A bordered list of rows. Tables were too wide for the few columns each tab has on a phone. */
export function RowList({ children }: Readonly<{ children: ReactNode }>) {
  return <ul className="border-border divide-border divide-y rounded-xl border">{children}</ul>
}

export function ListSkeleton() {
  return (
    <div className="border-border flex flex-col gap-3 rounded-xl border p-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-5 w-3/5" />
    </div>
  )
}

export function InlineError({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p role="alert" className="text-status-danger mb-3 text-xs">
      {children}
    </p>
  )
}

/**
 * A trash button that asks first. Deletes here are immediate and cannot be
 * undone, and a row's trash icon sits close enough to the next row's to misfire.
 */
export function DeleteButton({
  label,
  title,
  description,
  disabledReason,
  onConfirm,
}: Readonly<{
  label: string
  title: string
  description: string
  /** Set when the row cannot be deleted; shown as the button's tooltip. */
  disabledReason?: string
  onConfirm: () => void
}>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        title={disabledReason ?? label}
        disabled={Boolean(disabledReason)}
        onClick={() => {
          setOpen(true)
        }}
        className="text-muted-foreground hover:text-status-danger"
      >
        <Trash2 className="size-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
