import { useEffect } from "react"

import {
  Checkbox,
  Input,
  Label,
  Switch,
  Textarea,
  cn,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Coins, Percent, Shuffle } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import {
  PROMO_SCOPES,
  type CreatePromoCodeRequest,
  type PromoCode,
  type PromoScope,
  type UpdatePromoCodeRequest,
  useSavePromoCode,
} from "@/modules/promotions"

import { formatRupees, useScopeLabels } from "./promo-format"
import { Field, FormSheet } from "../../components/form-fields"

const KINDS = ["credit", "percent_off"] as const
const SCOPES = PROMO_SCOPES

/**
 * The form's own shape, not the API's.
 *
 * Dates are `datetime-local` strings and the caps are plain numbers where the
 * API uses 0-as-unlimited; the mapping happens once, on submit. Doing it the
 * other way round would put "0 means unlimited" into every input's onChange,
 * which is where that convention turns into a bug.
 */
const schema = z
  .object({
    code: z
      .string()
      .min(3, "At least 3 characters")
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes and underscores only"),
    name: z.string().min(2, "Give the campaign a name").max(80),
    description: z.string().max(500).or(z.literal("")),
    kind: z.enum(KINDS),

    credit_amount: z.number().min(0).max(10_000_000),
    discount_pct: z.number().min(0).max(100),
    applies_to: z.array(z.enum(SCOPES as unknown as [PromoScope, ...PromoScope[]])),
    duration_days: z.number().int().min(0).max(3650),

    unlimited_redemptions: z.boolean(),
    max_redemptions: z.number().int().min(0).max(1_000_000),
    per_account_limit: z.number().int().min(1).max(1000),

    new_accounts_only: z.boolean(),
    new_account_max_age_days: z.number().int().min(1).max(3650),

    starts_at: z.string(),
    ends_at: z.string(),
    paused: z.boolean(),
  })
  // The kind-dependent requirements live here rather than on the fields, because
  // a credit code with 0% discount is perfectly valid and vice versa — the
  // fields alone cannot tell which half of the form is in play.
  .refine((v) => v.kind !== "credit" || v.credit_amount > 0, {
    path: ["credit_amount"],
    message: "A credit code has to grant more than ₹0",
  })
  .refine((v) => v.kind !== "percent_off" || v.discount_pct > 0, {
    path: ["discount_pct"],
    message: "A discount code has to take off more than 0%",
  })
  .refine((v) => !v.starts_at || !v.ends_at || new Date(v.ends_at) > new Date(v.starts_at), {
    path: ["ends_at"],
    message: "The end date has to be after the start date",
  })
  .refine((v) => v.unlimited_redemptions || v.max_redemptions > 0, {
    path: ["max_redemptions"],
    message: "Set a limit, or switch on unlimited",
  })

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  code: "",
  name: "",
  description: "",
  kind: "credit",
  credit_amount: 500,
  discount_pct: 20,
  applies_to: [],
  duration_days: 0,
  unlimited_redemptions: false,
  max_redemptions: 100,
  per_account_limit: 1,
  new_accounts_only: false,
  new_account_max_age_days: 30,
  starts_at: "",
  ends_at: "",
  paused: false,
}

/** ISO → the `datetime-local` value shape, in the operator's own timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** `datetime-local` → ISO, or null for an empty box (which means "no bound"). */
function toISO(local: string): string | null {
  return local ? new Date(local).toISOString() : null
}

/** A readable, unambiguous code: no O/0 or I/1, which get misread off a slide. */
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  code?: PromoCode | null
}

export function PromoCodeFormSheet({ open, onOpenChange, code }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSavePromoCode()
  const scopeLabels = useScopeLabels()
  const isEdit = !!code

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const kind = useWatch({ control, name: "kind" })
  const unlimited = useWatch({ control, name: "unlimited_redemptions" })
  const newOnly = useWatch({ control, name: "new_accounts_only" })
  const creditAmount = useWatch({ control, name: "credit_amount" })
  const maxRedemptions = useWatch({ control, name: "max_redemptions" })

  useEffect(() => {
    if (!open) return
    reset(
      code
        ? {
            code: code.code,
            name: code.name,
            description: code.description,
            kind: code.kind,
            credit_amount: code.credit_amount || EMPTY.credit_amount,
            discount_pct: code.discount_pct || EMPTY.discount_pct,
            applies_to: code.applies_to,
            duration_days: code.duration_days,
            unlimited_redemptions: code.max_redemptions === 0,
            max_redemptions: code.max_redemptions || EMPTY.max_redemptions,
            per_account_limit: code.per_account_limit || 1,
            new_accounts_only: code.new_accounts_only,
            new_account_max_age_days: code.new_account_max_age_days || 30,
            starts_at: toLocalInput(code.starts_at),
            ends_at: toLocalInput(code.ends_at),
            paused: code.status === "paused",
          }
        : { ...EMPTY, code: generateCode() },
    )
  }, [open, code, reset])

  const onSubmit = (v: FormValues) => {
    const shared = {
      name: v.name,
      description: v.description,
      applies_to: v.kind === "percent_off" ? v.applies_to : [],
      duration_days: v.kind === "percent_off" ? v.duration_days : 0,
      // 0 is the wire's "unlimited". The switch is the only place that
      // convention is visible in this file.
      max_redemptions: v.unlimited_redemptions ? 0 : v.max_redemptions,
      per_account_limit: v.per_account_limit,
      new_accounts_only: v.new_accounts_only,
      new_account_max_age_days: v.new_account_max_age_days,
      starts_at: toISO(v.starts_at),
      ends_at: toISO(v.ends_at),
      status: v.paused ? ("paused" as const) : ("active" as const),
      credit_amount: v.kind === "credit" ? v.credit_amount : 0,
      discount_pct: v.kind === "percent_off" ? v.discount_pct : 0,
    }

    const payload: CreatePromoCodeRequest | UpdatePromoCodeRequest = isEdit
      ? {
          ...shared,
          // An emptied date box means "remove the bound", which a null cannot
          // express once it reaches the server — see the update DTO.
          clear_starts_at: v.starts_at === "",
          clear_ends_at: v.ends_at === "",
        }
      : { code: v.code.toUpperCase(), kind: v.kind, ...shared }

    save({ id: code?.id, payload }, { onSuccess: () => { onOpenChange(false) } })
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEdit ? t("superAdmin.promoCodes.form.editTitle") : t("superAdmin.promoCodes.form.createTitle")
      }
      description={t("superAdmin.promoCodes.form.subtitle")}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending}
      submitLabel={
        isEdit ? t("superAdmin.promoCodes.form.save") : t("superAdmin.promoCodes.form.create")
      }
    >
      {/* ── What it is ─────────────────────────────────────────────────── */}
      <Field
        label={t("superAdmin.promoCodes.fields.code")}
        required
        error={errors.code?.message}
        hint={
          isEdit
            ? t("superAdmin.promoCodes.form.codeLocked")
            : t("superAdmin.promoCodes.form.codeHint")
        }
      >
        <div className="flex gap-2">
          <Input
            {...register("code")}
            disabled={isEdit}
            autoCapitalize="characters"
            spellCheck={false}
            className="font-mono uppercase tracking-wider"
            placeholder="LAUNCH50"
          />
          {!isEdit && (
            <button
              type="button"
              onClick={() => {
                setValue("code", generateCode(), { shouldValidate: true })
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Shuffle className="size-3.5" />
              {t("superAdmin.promoCodes.form.generate")}
            </button>
          )}
        </div>
      </Field>

      <Field
        label={t("superAdmin.promoCodes.fields.name")}
        required
        error={errors.name?.message}
        hint={t("superAdmin.promoCodes.form.nameHint")}
      >
        <Input {...register("name")} placeholder={t("superAdmin.promoCodes.form.namePlaceholder")} />
      </Field>

      <Field
        label={t("superAdmin.promoCodes.fields.description")}
        error={errors.description?.message}
        hint={t("superAdmin.promoCodes.form.descriptionHint")}
      >
        <Textarea
          rows={2}
          {...register("description")}
          placeholder={t("superAdmin.promoCodes.form.descriptionPlaceholder")}
        />
      </Field>

      {/* ── What it grants ─────────────────────────────────────────────── */}
      <Field label={t("superAdmin.promoCodes.fields.kind")} required>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              <KindOption
                icon={Coins}
                active={field.value === "credit"}
                disabled={isEdit}
                title={t("superAdmin.promoCodes.kinds.credit")}
                blurb={t("superAdmin.promoCodes.kinds.creditBlurb")}
                onSelect={() => {
                  field.onChange("credit")
                }}
              />
              <KindOption
                icon={Percent}
                active={field.value === "percent_off"}
                disabled={isEdit}
                title={t("superAdmin.promoCodes.kinds.percent_off")}
                blurb={t("superAdmin.promoCodes.kinds.percentBlurb")}
                onSelect={() => {
                  field.onChange("percent_off")
                }}
              />
            </div>
          )}
        />
        {isEdit && (
          <p className="text-[11px] text-muted-foreground">
            {t("superAdmin.promoCodes.form.kindLocked")}
          </p>
        )}
      </Field>

      {kind === "credit" ? (
        <Field
          label={t("superAdmin.promoCodes.fields.creditAmount")}
          required
          error={errors.credit_amount?.message}
          hint={t("superAdmin.promoCodes.form.creditHint")}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
            <Input
              type="number"
              min={0}
              step={1}
              className="pl-7 tabular-nums"
              {...register("credit_amount", { valueAsNumber: true })}
            />
          </div>
        </Field>
      ) : (
        <>
          <Field
            label={t("superAdmin.promoCodes.fields.discountPct")}
            required
            error={errors.discount_pct?.message}
            hint={t("superAdmin.promoCodes.form.discountHint")}
          >
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="pr-8 tabular-nums"
                {...register("discount_pct", { valueAsNumber: true })}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </Field>

          <Field
            label={t("superAdmin.promoCodes.fields.appliesTo")}
            hint={t("superAdmin.promoCodes.form.appliesToHint")}
          >
            <Controller
              control={control}
              name="applies_to"
              render={({ field }) => (
                <ScopePicker
                  selected={field.value}
                  labels={scopeLabels}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field
            label={t("superAdmin.promoCodes.fields.durationDays")}
            error={errors.duration_days?.message}
            hint={t("superAdmin.promoCodes.form.durationHint")}
          >
            <Input
              type="number"
              min={0}
              step={1}
              className="tabular-nums"
              {...register("duration_days", { valueAsNumber: true })}
            />
          </Field>
        </>
      )}

      {/* ── Who can use it ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border-glass bg-muted/20 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("superAdmin.promoCodes.form.limitsSection")}
        </p>

        <Controller
          control={control}
          name="unlimited_redemptions"
          render={({ field }) => (
            <SwitchRow
              id="promo-unlimited"
              title={t("superAdmin.promoCodes.form.unlimited")}
              hint={t("superAdmin.promoCodes.form.unlimitedHint")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {!unlimited && (
          <Field
            label={t("superAdmin.promoCodes.fields.maxRedemptions")}
            error={errors.max_redemptions?.message}
            hint={t("superAdmin.promoCodes.form.maxRedemptionsHint")}
          >
            <Input
              type="number"
              min={1}
              step={1}
              className="tabular-nums"
              {...register("max_redemptions", { valueAsNumber: true })}
            />
          </Field>
        )}

        <Field
          label={t("superAdmin.promoCodes.fields.perAccountLimit")}
          error={errors.per_account_limit?.message}
          hint={t("superAdmin.promoCodes.form.perAccountHint")}
        >
          <Input
            type="number"
            min={1}
            step={1}
            className="tabular-nums"
            {...register("per_account_limit", { valueAsNumber: true })}
          />
        </Field>

        <Controller
          control={control}
          name="new_accounts_only"
          render={({ field }) => (
            <SwitchRow
              id="promo-new-only"
              title={t("superAdmin.promoCodes.form.newOnly")}
              hint={t("superAdmin.promoCodes.form.newOnlyHint")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {newOnly && (
          <Field
            label={t("superAdmin.promoCodes.fields.newAccountMaxAge")}
            error={errors.new_account_max_age_days?.message}
          >
            <Input
              type="number"
              min={1}
              step={1}
              className="tabular-nums"
              {...register("new_account_max_age_days", { valueAsNumber: true })}
            />
          </Field>
        )}

        {/* The number that actually matters before pressing create: what the
            campaign can cost if every seat is taken. Shown only where it is
            knowable — a percent-off campaign's ceiling depends on what people
            launch, so claiming a figure for it would be invention. */}
        {kind === "credit" && (
          <p className="border-t border-border-glass pt-3 text-[11px] text-muted-foreground">
            {unlimited
              ? t("superAdmin.promoCodes.form.exposureUnlimited", {
                  amount: formatRupees(creditAmount || 0),
                })
              : t("superAdmin.promoCodes.form.exposureCapped", {
                  amount: formatRupees((creditAmount || 0) * (maxRedemptions || 0)),
                  count: maxRedemptions || 0,
                })}
          </p>
        )}
      </div>

      {/* ── When it runs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t("superAdmin.promoCodes.fields.startsAt")}
          hint={t("superAdmin.promoCodes.form.startsAtHint")}
        >
          <Input type="datetime-local" {...register("starts_at")} />
        </Field>
        <Field label={t("superAdmin.promoCodes.fields.endsAt")} error={errors.ends_at?.message}>
          <Input type="datetime-local" {...register("ends_at")} />
        </Field>
      </div>

      <Controller
        control={control}
        name="paused"
        render={({ field }) => (
          <SwitchRow
            id="promo-start-paused"
            title={t("superAdmin.promoCodes.form.startPaused")}
            hint={t("superAdmin.promoCodes.form.startPausedHint")}
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </FormSheet>
  )
}

/**
 * The resource kinds a percent-off code covers.
 *
 * Its own component so the per-checkbox toggle is one function deep instead of
 * four (Controller render → map → handler), and so the "empty means everything"
 * rule has one place to be read from — the hint under the field.
 */
function ScopePicker({
  selected,
  labels,
  onChange,
}: Readonly<{
  selected: PromoScope[]
  labels: Record<PromoScope, string>
  onChange: (next: PromoScope[]) => void
}>) {
  const toggle = (scope: PromoScope, next: boolean) => {
    onChange(next ? [...selected, scope] : selected.filter((s) => s !== scope))
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {SCOPES.map((scope) => (
        <label
          key={scope}
          className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
        >
          <Checkbox
            checked={selected.includes(scope)}
            onCheckedChange={(next) => {
              toggle(scope, next === true)
            }}
          />
          {labels[scope]}
        </label>
      ))}
    </div>
  )
}

/**
 * A switch with its explanation, wired to a real <label for>.
 *
 * The switch is a Radix button rather than a checkbox input, so wrapping it in a
 * bare <label> associates it with nothing — the row looks clickable and reads as
 * unlabelled to a screen reader. An explicit id/htmlFor pair is what actually
 * ties the two together.
 */
function SwitchRow({
  id,
  title,
  hint,
  checked,
  onChange,
}: Readonly<{
  id: string
  title: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}>) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="block text-sm font-medium text-foreground">
          {title}
        </Label>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/** One of the two reward shapes, as a pressable card rather than a select — the
 *  choice changes half the form, so it deserves to look like a decision. */
function KindOption({
  icon: Icon,
  active,
  disabled,
  title,
  blurb,
  onSelect,
}: Readonly<{
  icon: typeof Coins
  active: boolean
  disabled?: boolean
  title: string
  blurb: string
  onSelect: () => void
}>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-brand-gold/50 bg-brand-gold/10"
          : "border-border bg-transparent hover:border-border-glass hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon className={cn("size-4", active ? "text-brand-gold" : "text-muted-foreground")} />
        {title}
      </span>
      <span className="text-[11px] leading-snug text-muted-foreground">{blurb}</span>
    </button>
  )
}
