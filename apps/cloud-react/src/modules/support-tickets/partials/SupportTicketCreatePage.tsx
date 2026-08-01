import { useEffect, type ReactNode } from "react"

import { Label, Textarea } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlignLeft, ArrowLeft, Check, Compass, LifeBuoy, PenLine, Send } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { type StatusTone, PageHeader, Section } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useScreen } from "@/services/api/screen"

import { PriorityBadge } from "../components/PriorityBadge"
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  defaultPriorityForCategory,
  priorityMeta,
} from "../support-tickets.constants"
import { useCreateSupportTicket } from "../support-tickets.hooks"
import type { TicketCategory, TicketPriority } from "../support-tickets.types"

const CATEGORY_VALUES = TICKET_CATEGORIES.map((c) => c.value) as [
  TicketCategory,
  ...TicketCategory[],
]
const PRIORITY_VALUES = TICKET_PRIORITIES.map((p) => p.value) as [
  TicketPriority,
  ...TicketPriority[],
]

const SUBJECT_MAX = 200
const DESCRIPTION_MAX = 5000

// Priority dot color per tone — kept static so Tailwind can see the classes.
const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-status-success",
  neutral: "bg-status-neutral",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
  info: "bg-status-info",
}

const schema = z.object({
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(SUBJECT_MAX, `Maximum ${String(SUBJECT_MAX)} characters`),
  // Category is required — an empty selection fails here, blocking submit.
  category: z.enum(CATEGORY_VALUES, { message: "Please choose a category" }),
  priority: z.enum(PRIORITY_VALUES),
  description: z
    .string()
    .min(1, "Please describe the issue")
    .max(DESCRIPTION_MAX, `Maximum ${String(DESCRIPTION_MAX)} characters`),
})

type FormValues = z.infer<typeof schema>

// Shared uppercase micro-label used by every field on this form.
function FieldLabel({
  icon: Icon,
  children,
  required,
  trailing,
}: Readonly<{
  icon?: typeof PenLine
  children: ReactNode
  required?: boolean
  trailing?: ReactNode
}>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {children}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {trailing}
    </div>
  )
}

export function SupportTicketCreatePage() {
  useScreen("support-tickets.support-ticket-create")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateSupportTicket()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", description: "" },
  })

  // The chosen category seeds the priority (mirrors the backend). The user can
  // still override it before filing. Re-derive whenever the category changes.
  // Typed as possibly-undefined on purpose: zod infers `category` as always
  // present because submission requires it, but there is no defaultValue, so
  // until the user picks one the runtime value really is undefined.
  const category = watch("category") as FormValues["category"] | undefined
  const priority = watch("priority")
  const subject = watch("subject")
  const description = watch("description")

  useEffect(() => {
    if (category) {
      setValue("priority", defaultPriorityForCategory(category))
    }
  }, [category, setValue])

  const selectedCat = TICKET_CATEGORIES.find((c) => c.value === category)
  const isDefaultPriority = category ? priority === defaultPriorityForCategory(category) : true

  const onSubmit = (values: FormValues) => {
    create(
      {
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority,
      },
      { onSuccess: (ticket) => void navigate(`/support/tickets/${ticket.id}`) },
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LifeBuoy}
        breadcrumbs={[
          { label: t("console.nav.groups.support") },
          { label: t("supportTickets.title"), to: "/support/tickets" },
          { label: t("supportTickets.create") },
        ]}
        title={t("supportTickets.createForm.title")}
        description={t("supportTickets.createForm.subtitle")}
        actions={
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => void navigate("/support/tickets")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("supportTickets.title")}
          </Button>
        }
      />

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mx-auto space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── Left: the details ─────────────────────────────────── */}
          <Section variant="panel" className="space-y-6">
            {/* Category — required, rendered as a selectable card grid */}
            <div className="space-y-2">
              <FieldLabel required>{t("supportTickets.columns.category")}</FieldLabel>
              <p className="text-[11px] text-muted-foreground">
                {t("supportTickets.createForm.categoryHint")}
              </p>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <div
                    role="radiogroup"
                    aria-label={t("supportTickets.columns.category")}
                    className="grid gap-2.5 sm:grid-cols-2"
                  >
                    {TICKET_CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      const selected = field.value === cat.value
                      return (
                        <button
                          type="button"
                          key={cat.value}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            field.onChange(cat.value)
                          }}
                          className={cn(
                            "group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40",
                            selected
                              ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold/30"
                              : "border-border hover:border-brand-gold/40 hover:bg-muted/30",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                              selected
                                ? "bg-brand-gold/15 text-brand-gold"
                                : "bg-muted text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            <Icon className="size-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-foreground">
                                {t(cat.labelKey)}
                              </span>
                            </span>
                            <span className="line-clamp-1 block text-[11px] text-muted-foreground">
                              {t(cat.descKey)}
                            </span>
                            <PriorityBadge priority={cat.defaultPriority} className="mt-0.5" />
                          </span>
                          {selected && (
                            <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-brand-gold text-brand-gold-foreground">
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              {errors.category && (
                <p className="text-[11px] text-destructive">{errors.category.message}</p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <FieldLabel
                icon={PenLine}
                required
                trailing={
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {subject.length}/{SUBJECT_MAX}
                  </span>
                }
              >
                {t("supportTickets.columns.subject")}
              </FieldLabel>
              <Input
                {...register("subject")}
                maxLength={SUBJECT_MAX}
                placeholder={t("supportTickets.createForm.subjectPlaceholder")}
              />
              {errors.subject && (
                <p className="text-[11px] text-destructive">{errors.subject.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <FieldLabel
                icon={AlignLeft}
                required
                trailing={
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                }
              >
                {t("supportTickets.columns.description")}
              </FieldLabel>
              <Textarea
                {...register("description")}
                maxLength={DESCRIPTION_MAX}
                placeholder={t("supportTickets.createForm.descriptionPlaceholder")}
                rows={7}
                className="resize-none"
              />
              {errors.description && (
                <p className="text-[11px] text-destructive">{errors.description.message}</p>
              )}
            </div>
          </Section>

          {/* ── Right: routing summary + priority ─────────────────── */}
          <Section variant="panel" className="space-y-5 lg:sticky lg:top-4">
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-brand-gold" />
              <h3 className="text-sm font-semibold text-foreground">
                {t("supportTickets.createForm.routingTitle", {
                  defaultValue: "Routing",
                })}
              </h3>
            </div>

            {/* Selected category preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("supportTickets.columns.category")}
              </span>
              {selectedCat ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-border-glass bg-muted/20 p-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-gold/15 text-brand-gold">
                    <selectedCat.icon className="size-4" />
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {t(selectedCat.labelKey)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t(selectedCat.descKey)}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-2.5 py-3 text-[12px] text-muted-foreground">
                  {t("supportTickets.createForm.categoryPlaceholder")}
                </p>
              )}
            </div>

            {/* Priority — seeded from category, editable via chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("supportTickets.columns.priority")}
                </span>
                {category && isDefaultPriority && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t("supportTickets.createForm.autoLabel", {
                      defaultValue: "Auto",
                    })}
                  </span>
                )}
              </div>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-1.5">
                    {TICKET_PRIORITIES.map((p) => {
                      const selected = field.value === p.value
                      return (
                        <button
                          type="button"
                          key={p.value}
                          aria-pressed={selected}
                          disabled={!category}
                          onClick={() => {
                            field.onChange(p.value)
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
                            selected
                              ? "border-brand-gold bg-brand-gold/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-brand-gold/40 hover:text-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              TONE_DOT[priorityMeta(p.value).tone],
                            )}
                          />
                          {t(p.labelKey)}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              <p className="text-[11px] text-muted-foreground">
                {category
                  ? t("supportTickets.createForm.priorityHint")
                  : t("supportTickets.createForm.priorityPlaceholder")}
              </p>
            </div>
          </Section>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => void navigate("/support/tickets")}>
            {t("console.wizard.cancel")}
          </Button>
          <Button type="submit" variant="gold" className="gap-2" disabled={isPending}>
            <Send className="h-4 w-4" />
            {isPending ? t("supportTickets.createForm.creating") : t("supportTickets.create")}
          </Button>
        </div>
      </form>
    </div>
  )
}
