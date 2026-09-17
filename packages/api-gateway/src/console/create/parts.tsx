import { useId, type KeyboardEvent, type ReactNode } from "react"

import { Check, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { Button, Label, cn } from "@datadack/common-ui"

/**
 * The building blocks every create screen is made of.
 *
 * Modelled on the AWS console's create flow on purpose — a step rail on the
 * left, bordered sections on the right, a footer that always offers the way
 * back — because that is the layout an operator arriving from AWS already
 * knows how to read. Only the visual language is this console's own.
 */

/**
 * Where the API Gateway console is mounted.
 *
 * serverless-web mounts it at /apigateway and cloud-react at .../api-gateway,
 * so no create screen may hard-code either. Every create route lives under a
 * "/create" segment, which makes the mount point everything before it.
 */
export function useGatewayBase(): string {
  const { pathname } = useLocation()
  const at = pathname.lastIndexOf("/create")
  return at === -1 ? pathname.replace(/\/$/, "") : pathname.slice(0, at)
}

/** Breadcrumb links for PageHeader. A router Link, passed in — see ApiDetailPage. */
export const crumbLink = (crumb: { to?: string }, children: ReactNode) => (
  <Link to={crumb.to ?? "#"}>{children}</Link>
)

// ── Step rail ──────────────────────────────────────────────────────────────

export interface WizardStep {
  title: string
  optional?: boolean
}

/**
 * The vertical step list. Steps already visited can be jumped back to; steps
 * ahead cannot, because skipping forward would skip the validation that
 * guards the step being left.
 */
export function StepRail({
  steps,
  current,
  furthest,
  onSelect,
}: Readonly<{
  steps: WizardStep[]
  current: number
  furthest: number
  onSelect: (index: number) => void
}>) {
  return (
    <>
      {/* Narrow screens: one line, not a rail that pushes the form off-screen. */}
      <div className="text-muted-foreground mb-4 text-xs lg:hidden">
        Step {current + 1} of {steps.length}
        <span className="text-foreground ml-2 font-medium">{steps[current]?.title}</span>
      </div>
      <ol className="hidden lg:block" aria-label="Create steps">
        {steps.map((step, index) => {
          const done = index < current
          const active = index === current
          const reachable = index <= furthest && !active
          const last = index === steps.length - 1
          return (
            <li key={step.title} className="relative flex gap-3 pb-6 last:pb-0">
              {last ? null : (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-6 bottom-0 left-[9px] w-px",
                    done ? "bg-brand-gold/60" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-[1] mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border",
                  active && "border-brand-gold bg-brand-gold/15",
                  done && "border-brand-gold bg-brand-gold text-brand-gold-foreground",
                  !active && !done && "border-border bg-background",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : null}
                {active ? <span className="bg-brand-gold size-2 rounded-full" /> : null}
              </span>
              <button
                type="button"
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                onClick={() => {
                  onSelect(index)
                }}
                className={cn(
                  "min-w-0 text-left",
                  reachable && "cursor-pointer hover:underline",
                  !reachable && "cursor-default",
                )}
              >
                <span className="text-muted-foreground block text-[11px] tracking-wide uppercase">
                  Step {index + 1}
                  {step.optional ? <span className="normal-case italic"> · optional</span> : null}
                </span>
                <span
                  className={cn(
                    "block text-sm",
                    active ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}

/** Rail on the left, the step's content on the right. */
export function WizardLayout({
  rail,
  children,
}: Readonly<{ rail: ReactNode; children: ReactNode }>) {
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">{rail}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ── Sections and fields ────────────────────────────────────────────────────

/** A bordered group of fields, the AWS "container". */
export function Section({
  title,
  count,
  description,
  actions,
  children,
  className,
}: Readonly<{
  title: string
  /** Shown as "(n)" after the title, the way AWS counts a repeatable list. */
  count?: number
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}>) {
  return (
    <section className={cn("border-border bg-card/40 mb-5 rounded-xl border", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="text-foreground text-base font-semibold">
            {title}
            {count === undefined ? null : (
              <span className="text-muted-foreground ml-1 font-normal">({count})</span>
            )}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-1 max-w-3xl text-[13px] leading-5">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="flex flex-col gap-5 px-5 pt-4 pb-5">{children}</div>
    </section>
  )
}

/**
 * A label, its explanation, the control and its error — in that order, which
 * is AWS's: the hint sits ABOVE the control so it is read before typing.
 */
export function Field({
  label,
  hint,
  optional,
  error,
  footnote,
  children,
  htmlFor,
  className,
}: Readonly<{
  label: string
  hint?: ReactNode
  optional?: boolean
  error?: string
  footnote?: ReactNode
  children: ReactNode
  htmlFor?: string
  className?: string
}>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div>
        <Label htmlFor={htmlFor} className="text-foreground text-[13px] font-semibold">
          {label}
          {optional ? (
            <span className="text-muted-foreground ml-1 font-normal italic">– optional</span>
          ) : null}
        </Label>
        {hint ? <p className="text-muted-foreground mt-0.5 text-xs leading-5">{hint}</p> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-status-danger text-xs">
          {error}
        </p>
      ) : null}
      {!error && footnote ? <p className="text-muted-foreground text-xs">{footnote}</p> : null}
    </div>
  )
}

// ── Choice cards ───────────────────────────────────────────────────────────

export interface Choice<T extends string> {
  value: T
  label: string
  description?: string
  icon?: LucideIcon
  disabled?: boolean
  /** Why it is disabled — shown in place of the description. */
  disabledReason?: string
}

/**
 * A radio group drawn as cards. Real radio semantics: one tab stop, arrow keys
 * move the selection, and a screen reader announces "n of m".
 */
export function ChoiceCards<T extends string>({
  label,
  choices,
  value,
  onChange,
  columns = 2,
}: Readonly<{
  label: string
  choices: Choice<T>[]
  value: T
  onChange: (value: T) => void
  columns?: 1 | 2 | 4
}>) {
  const name = useId()
  const enabled = choices.filter((choice) => !choice.disabled)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    if (!step || enabled.length === 0) return
    event.preventDefault()
    const at = enabled.findIndex((choice) => choice.value === value)
    const next = enabled[(at + step + enabled.length) % enabled.length]
    if (!next) return
    onChange(next.value)
    document.getElementById(`${name}-${next.value}`)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      // The group is not a tab stop itself — the selected card is — but the
      // role still needs the element to be focusable programmatically.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn(
        "grid gap-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 4 && "sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {choices.map((choice) => {
        const selected = choice.value === value
        const Icon = choice.icon
        return (
          <button
            key={choice.value}
            id={`${name}-${choice.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={choice.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onChange(choice.value)
            }}
            className={cn(
              "focus-visible:ring-brand-gold/50 flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2",
              selected
                ? "border-brand-gold bg-brand-gold/10"
                : "border-border hover:border-foreground/30 hover:bg-muted/30",
              choice.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-brand-gold" : "border-muted-foreground/60",
              )}
            >
              {selected ? <span className="bg-brand-gold size-2 rounded-full" /> : null}
            </span>
            <span className="min-w-0">
              <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                {Icon ? <Icon className="text-muted-foreground size-3.5" /> : null}
                {choice.label}
              </span>
              {choiceNote(choice) ? (
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {choiceNote(choice)}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function choiceNote<T extends string>(choice: Choice<T>): string | undefined {
  return choice.disabled && choice.disabledReason ? choice.disabledReason : choice.description
}

// ── Empty list, footer, review ─────────────────────────────────────────────

/** What a repeatable list says before anything is in it. */
export function EmptyList({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-[13px]">
      {children}
    </div>
  )
}

/**
 * Cancel on its own, then the way back and the way forward. "Review and
 * create" appears once the review has been reached, the AWS shortcut for an
 * operator who went back to change one field.
 */
export function WizardFooter({
  onCancel,
  onPrevious,
  onReview,
  primaryLabel,
  onPrimary,
  primaryLoading,
  primaryDisabled,
}: Readonly<{
  onCancel: () => void
  onPrevious?: () => void
  onReview?: () => void
  primaryLabel: string
  onPrimary: () => void
  primaryLoading?: boolean
  primaryDisabled?: boolean
}>) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      {onPrevious ? (
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
      ) : null}
      {onReview ? (
        <Button variant="outline" onClick={onReview}>
          Review and create
        </Button>
      ) : null}
      <Button
        variant="gold"
        loading={primaryLoading}
        disabled={primaryDisabled}
        onClick={onPrimary}
      >
        {primaryLabel}
      </Button>
    </div>
  )
}

/** One label/value pair of the review screen. */
export function ReviewItem({
  label,
  children,
  mono,
}: Readonly<{ label: string; children: ReactNode; mono?: boolean }>) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "text-foreground mt-0.5 text-sm break-words",
          mono && "font-mono text-[13px]",
        )}
      >
        {children}
      </dd>
    </div>
  )
}

/** A failure the whole form is blocked on, shown where the eye already is. */
export function FormError({ title, message }: Readonly<{ title: string; message: string }>) {
  return (
    <div
      role="alert"
      className="border-status-danger/40 bg-status-danger-bg mb-5 rounded-lg border px-4 py-3"
    >
      <p className="text-status-danger text-sm font-semibold">{title}</p>
      <p className="text-foreground mt-0.5 text-[13px]">{message}</p>
    </div>
  )
}
