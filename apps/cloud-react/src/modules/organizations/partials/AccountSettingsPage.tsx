import { useEffect, useRef, useState } from "react"

import { Label } from "@DataDack/common-ui"
import { Skeleton } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftRight,
  Building2,
  Clock,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { EmptyState, KeyValueGrid, PageHeader, Section, StatusBadge } from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ACCOUNT_MANAGER_ROLES } from "@/modules/accounts/accounts.constants"
import {
  useAccountMembers,
  useAccountProfile,
  useActiveAccount,
  useCancelTransfer,
  useConfirmTransfer,
  useConvertToBusiness,
  useInitiateTransfer,
  usePendingTransfer,
  useUpdateAccount,
  useUpdateAddress,
} from "@/modules/accounts/accounts.hooks"
import type {
  AccountAddress,
  ConvertToBusinessPayload,
  MyAccount,
  PendingTransfer,
} from "@/modules/accounts/accounts.types"
import { AccountSelector } from "@/modules/accounts/components/AccountSelector"
import { useAuth } from "@/modules/auth/auth.context"
import { useCountries } from "@/modules/countries/countries.hooks"
import { CountrySelect } from "@/modules/countries/CountrySelect"
import { InviteMemberDialog } from "@/modules/iam/partials/InviteMemberDialog"
import { useOnboardingStatus } from "@/modules/onboarding/onboarding.hooks"
import { useScreen } from "@/services/api/screen"

import { useOrganization, useUpdateOrganization } from "../organizations.hooks"
import type { BillingAddress, Organization } from "../organizations.types"

/**
 * Account Settings — the home of the currently active account (account-first
 * model). The account is the tenancy root; an Organization is an optional 1:1
 * business profile shown only for business accounts. Switching accounts is done
 * from the topbar account selector, so this page has no switcher and no
 * "create account" affordance — accounts are joined by invitation, not added to
 * an org.
 */
export function AccountSettingsPage() {
  useScreen("org.account-settings")
  const { t } = useTranslation()
  const { user } = useAuth()
  const { activeAccount, isLoading } = useActiveAccount()

  // Account authority is the caller's membership role in THIS account.
  const canEdit =
    user?.is_super_admin === true ||
    ACCOUNT_MANAGER_ROLES.includes(activeAccount?.member_role ?? "")

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Wallet}
        breadcrumbs={[
          { label: t("console.nav.groups.governance") },
          { label: t("account.settings.title", { defaultValue: "Account settings" }) },
        ]}
        title={t("account.settings.title", { defaultValue: "Account settings" })}
        description={t("account.settings.subtitle", {
          defaultValue: "Manage your account details, business profile, and members.",
        })}
        actions={<AccountSelector />}
      />

      {isLoading || !activeAccount ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <>
          <VerificationSection />
          <AccountDetailsSection account={activeAccount} canEdit={canEdit} />
          <BusinessProfileSection account={activeAccount} canEdit={canEdit} />
          <TransferOwnershipSection account={activeAccount} />
          <MetaSection account={activeAccount} />
        </>
      )}
    </div>
  )
}

/* ── Verification (account KYC / re-KYC) ─────────────────────────────────── */

/**
 * KYC is handled by the external verification service and is skippable at
 * signup — but resource creation is blocked until it's completed (and redone
 * when re-flagged), so this card is the standing entry point into /onboarding/kyc.
 */
function VerificationSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: status } = useOnboardingStatus()
  const kyc = status?.kyc

  // No KYC service configured on the platform — hide the flow entirely.
  if (!kyc?.enabled) return null

  const verified = kyc.completed && !kyc.need_actions
  if (verified) {
    return (
      <Section variant="panel" title={t("onboarding.verification.verifiedTitle")}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-status-success" />
          {kyc.completed_at &&
            t("onboarding.verification.verifiedAt", {
              date: new Date(kyc.completed_at).toLocaleDateString(),
            })}
        </div>
      </Section>
    )
  }

  // A completed round that got re-flagged means a re-verification, not a first one.
  const rekyc = kyc.completed && kyc.need_actions
  return (
    <Section
      variant="panel"
      title={
        rekyc ? t("onboarding.verification.rekycTitle") : t("onboarding.verification.requiredTitle")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rekyc ? t("onboarding.verification.rekycDesc") : t("onboarding.review.kycLater")}
        </p>
        <Button
          onClick={() => void navigate("/onboarding/kyc")}
          className="btn-gold rounded-full font-bold"
        >
          {t("onboarding.verification.cta")}
        </Button>
      </div>
    </Section>
  )
}

/* ── Account details (name + status) ─────────────────────────────────────── */

const accountSchema = z.object({
  name: z.string().min(2, "Minimum 2 characters").max(100, "Maximum 100 characters"),
})
type AccountFormValues = z.infer<typeof accountSchema>

function AccountDetailsSection({
  account,
  canEdit,
}: Readonly<{ account: MyAccount; canEdit: boolean }>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useUpdateAccount()
  const [editing, setEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: account.name },
  })

  const startEdit = () => {
    reset({ name: account.name })
    setEditing(true)
  }

  const onSubmit = (values: AccountFormValues) => {
    save(
      { id: account.id, payload: { name: values.name } },
      {
        onSuccess: () => {
          setEditing(false)
        },
      },
    )
  }

  return (
    <Section
      variant="panel"
      title={t("account.settings.details", { defaultValue: "Account" })}
      description={t("account.settings.detailsDescription", {
        defaultValue: "This account is a separate billing and access boundary.",
      })}
      actions={
        !editing && canEdit ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
            <Pencil className="size-3.5" />
            {t("common.edit", { defaultValue: "Edit" })}
          </Button>
        ) : null
      }
    >
      {editing ? (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-xl space-y-5">
          <Field
            label={t("account.settings.name", { defaultValue: "Account name" })}
            required
            error={errors.name?.message}
          >
            <Input {...register("name")} placeholder="Default Account" />
          </Field>
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false)
              }}
              disabled={isPending}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="gap-1.5"
              disabled={isPending || !isDirty}
            >
              <Save className="size-3.5" />
              {isPending ? t("org.settings.saving") : t("org.settings.save")}
            </Button>
          </div>
        </form>
      ) : (
        <KeyValueGrid
          columns={2}
          items={[
            {
              label: t("account.settings.name", { defaultValue: "Account name" }),
              value: account.name,
            },
            {
              label: t("accounts.detail.accountNumber", {
                defaultValue: "Account number",
              }),
              value: account.account_number,
              mono: true,
              copyable: true,
            },
            {
              label: t("org.settings.status", { defaultValue: "Status" }),
              value: <StatusBadge status={account.status} />,
            },
          ]}
        />
      )}
    </Section>
  )
}

/* ── Business profile (Organization) — business accounts only ────────────── */

function BusinessProfileSection({
  account,
  canEdit,
}: Readonly<{ account: MyAccount; canEdit: boolean }>) {
  const orgId = account.organization?.id
  const { data: org, isLoading } = useOrganization(orgId)

  // Individual account: no organization. Instead of a dead-end empty state, let
  // the holder manage their contact address inline (stored on the account's KYC
  // profile) and offer an upgrade to a business account.
  if (!orgId) {
    return (
      <>
        <AccountAddressSection account={account} canEdit={canEdit} />
        <ConvertToBusinessSection account={account} canEdit={canEdit} />
      </>
    )
  }

  if (isLoading || !org) {
    return <Skeleton className="h-64 rounded-xl" />
  }

  return (
    <>
      <OrgDetailsSection org={org} canEdit={canEdit} />
      <BillingAddressSection org={org} canEdit={canEdit} />
    </>
  )
}

const orgSchema = z.object({
  name: z.string().min(2, "Minimum 2 characters").max(100, "Maximum 100 characters"),
  billing_email: z.email("Enter a valid email address"),
})
type OrgFormValues = z.infer<typeof orgSchema>

function OrgDetailsSection({ org, canEdit }: Readonly<{ org: Organization; canEdit: boolean }>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useUpdateOrganization()
  const [editing, setEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: org.name, billing_email: org.billing_email },
  })

  const startEdit = () => {
    reset({ name: org.name, billing_email: org.billing_email })
    setEditing(true)
  }

  const onSubmit = (values: OrgFormValues) => {
    save(
      { id: org.id, payload: values },
      {
        onSuccess: () => {
          setEditing(false)
        },
      },
    )
  }

  return (
    <Section
      variant="panel"
      title={t("account.settings.business", { defaultValue: "Business profile" })}
      description={t("org.settings.detailsDescription")}
      actions={
        !editing && canEdit ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
            <Pencil className="size-3.5" />
            {t("common.edit", { defaultValue: "Edit" })}
          </Button>
        ) : null
      }
    >
      {editing ? (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-xl space-y-5">
          <Field label={t("org.settings.name")} required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Acme Inc." />
          </Field>

          <Field
            label={t("org.settings.billingEmail")}
            required
            hint={t("org.settings.billingEmailHint")}
            error={errors.billing_email?.message}
          >
            <Input
              {...register("billing_email")}
              type="email"
              placeholder="billing@acme.com"
              className="font-mono"
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false)
              }}
              disabled={isPending}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="gap-1.5"
              disabled={isPending || !isDirty}
            >
              <Save className="size-3.5" />
              {isPending ? t("org.settings.saving") : t("org.settings.save")}
            </Button>
          </div>
        </form>
      ) : (
        <KeyValueGrid
          columns={2}
          items={[
            { label: t("org.settings.name"), value: org.name },
            {
              label: t("org.settings.billingEmail"),
              value: org.billing_email,
              mono: true,
              copyable: true,
            },
          ]}
        />
      )}
    </Section>
  )
}

/* ── Metadata ────────────────────────────────────────────────────────────── */

function MetaSection({ account }: Readonly<{ account: MyAccount }>) {
  const { t } = useTranslation()
  return (
    <Section variant="panel" title={t("org.settings.meta")}>
      <KeyValueGrid
        columns={2}
        items={[
          {
            label: t("org.settings.status"),
            value: <StatusBadge status={account.status} />,
          },
          {
            label: t("accounts.detail.accountId", { defaultValue: "Account ID" }),
            value: account.id,
            mono: true,
            copyable: true,
          },
          {
            label: t("accounts.detail.accountNumber", {
              defaultValue: "Account number",
            }),
            value: account.account_number,
            mono: true,
            copyable: true,
          },
        ]}
      />
    </Section>
  )
}

/* ── Shared field + billing address (reused from the org form) ───────────── */

function Field({
  label,
  error,
  required,
  hint,
  children,
}: Readonly<{
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

/**
 * Billing address card for the business org. Seeded server-side from KYC at org
 * creation, then edited here. Empty-state with an "Add" affordance when there is
 * no address yet, otherwise the formatted address with an Edit toggle.
 */
function BillingAddressSection({
  org,
  canEdit,
}: Readonly<{ org: Organization; canEdit: boolean }>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useUpdateOrganization()
  const [editing, setEditing] = useState(false)
  const addr = org.billing_address

  const k = (key: string) => `org.settings.billingAddress.${key}`
  const required = t(k("errors.required"))
  const schema = z.object({
    line1: z.string().trim().min(1, required),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1, required),
    state: z.string().trim().min(1, required),
    postal_code: z.string().trim().min(1, required),
    country: z.string().trim().min(2, required),
  })
  type Values = z.infer<typeof schema>

  const toValues = (a: BillingAddress | null): Values => ({
    line1: a?.line1 ?? "",
    line2: a?.line2 ?? "",
    city: a?.city ?? "",
    state: a?.state ?? "",
    postal_code: a?.postal_code ?? "",
    country: a?.country ?? "",
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(addr) })

  const startEdit = () => {
    reset(toValues(addr))
    setEditing(true)
  }

  const onSubmit = (values: Values) => {
    save(
      {
        id: org.id,
        payload: {
          name: org.name,
          billing_email: org.billing_email,
          billing_address: values,
        },
      },
      {
        onSuccess: () => {
          setEditing(false)
        },
      },
    )
  }

  const readView = addr ? (
    <AddressDisplay addr={addr} />
  ) : (
    <EmptyState
      icon={MapPin}
      title={t(k("empty"))}
      description={t(k("emptyDescription"))}
      action={canEdit ? { label: t(k("add")), onClick: startEdit } : undefined}
    />
  )

  return (
    <Section
      variant="panel"
      title={t(k("title"))}
      description={t(k("description"))}
      actions={
        !editing && addr && canEdit ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
            <Pencil className="size-3.5" />
            {t(k("edit"))}
          </Button>
        ) : null
      }
    >
      {editing ? (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-xl space-y-5">
          <Field label={t(k("line1"))} required error={errors.line1?.message}>
            <Input {...register("line1")} placeholder={t(k("placeholders.line1"))} />
          </Field>
          <Field label={t(k("line2"))} hint={t(k("optional"))}>
            <Input {...register("line2")} placeholder={t(k("placeholders.line2"))} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t(k("city"))} required error={errors.city?.message}>
              <Input {...register("city")} placeholder={t(k("placeholders.city"))} />
            </Field>
            <Field label={t(k("state"))} required error={errors.state?.message}>
              <Input {...register("state")} placeholder={t(k("placeholders.state"))} />
            </Field>
            <Field label={t(k("postalCode"))} required error={errors.postal_code?.message}>
              <Input {...register("postal_code")} placeholder={t(k("placeholders.postalCode"))} />
            </Field>
            <Field label={t(k("country"))} required error={errors.country?.message}>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <CountrySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={t(k("selectCountry"))}
                    invalid={!!errors.country}
                  />
                )}
              />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false)
              }}
              disabled={isPending}
            >
              {t(k("cancel"))}
            </Button>
            <Button type="submit" variant="gold" className="gap-1.5" disabled={isPending}>
              <Save className="size-3.5" />
              {isPending ? t("org.settings.saving") : t("org.settings.save")}
            </Button>
          </div>
        </form>
      ) : (
        readView
      )}
    </Section>
  )
}

/** Renders a stored billing address as a formatted block, resolving the country code to its name. */
function AddressDisplay({ addr }: Readonly<{ addr: BillingAddress }>) {
  const { data: countries } = useCountries()
  const country = countries?.find((c) => c.iso2 === addr.country)
  const cityLine = [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")

  return (
    <address className="text-sm not-italic leading-relaxed text-foreground">
      <div>{addr.line1}</div>
      {addr.line2 && <div>{addr.line2}</div>}
      {cityLine && <div>{cityLine}</div>}
      <div>{country ? `${country.flag} ${country.name}` : addr.country}</div>
    </address>
  )
}

/* ── Account address (individual accounts) — stored on the KYC profile ────── */

/**
 * Contact-address card for an individual account. The address lives on the
 * account's KYC profile (not an org), so it can be entered/edited here inline —
 * before, or independent of, full verification. Editable by owner/admin.
 */
function AccountAddressSection({
  account,
  canEdit,
}: Readonly<{ account: MyAccount; canEdit: boolean }>) {
  const { t } = useTranslation()
  const { data: profile, isLoading } = useAccountProfile(account.id)
  const { mutate: save, isPending } = useUpdateAddress(account.id)
  const [editing, setEditing] = useState(false)
  const addr = profile?.address ?? null

  const k = (key: string) => `org.settings.billingAddress.${key}`
  const required = t(k("errors.required"))
  const schema = z.object({
    line1: z.string().trim().min(1, required),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1, required),
    state: z.string().trim().min(1, required),
    pincode: z.string().trim().min(1, required),
    country: z.string().trim().min(2, required),
  })
  type Values = z.infer<typeof schema>

  const toValues = (a: AccountAddress | null): Values => ({
    line1: a?.line1 ?? "",
    line2: a?.line2 ?? "",
    city: a?.city ?? "",
    state: a?.state ?? "",
    pincode: a?.pincode ?? "",
    country: a?.country ?? "",
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(addr) })

  const startEdit = () => {
    reset(toValues(addr))
    setEditing(true)
  }

  const onSubmit = (values: Values) => {
    save(
      { legal_name: profile?.legal_name || undefined, ...values },
      {
        onSuccess: () => {
          setEditing(false)
        },
      },
    )
  }

  const title = t("account.settings.address.title", { defaultValue: "Address" })
  const description = t("account.settings.address.description", {
    defaultValue: "Your contact address. Used for verification and billing.",
  })

  if (isLoading) {
    return <Skeleton className="h-52 rounded-xl" />
  }

  const readView = addr ? (
    <AccountAddressDisplay addr={addr} />
  ) : (
    <EmptyState
      icon={MapPin}
      title={t("account.settings.address.empty", { defaultValue: "No address yet" })}
      description={t("account.settings.address.emptyDescription", {
        defaultValue: "Add your contact address so it's ready when you verify.",
      })}
      action={
        canEdit
          ? {
              label: t("account.settings.address.add", { defaultValue: "Add address" }),
              onClick: startEdit,
            }
          : undefined
      }
    />
  )

  return (
    <Section
      variant="panel"
      title={title}
      description={description}
      actions={
        !editing && addr && canEdit ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
            <Pencil className="size-3.5" />
            {t("common.edit", { defaultValue: "Edit" })}
          </Button>
        ) : null
      }
    >
      {editing ? (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-xl space-y-5">
          <Field label={t(k("line1"))} required error={errors.line1?.message}>
            <Input {...register("line1")} placeholder={t(k("placeholders.line1"))} />
          </Field>
          <Field label={t(k("line2"))} hint={t(k("optional"))}>
            <Input {...register("line2")} placeholder={t(k("placeholders.line2"))} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t(k("city"))} required error={errors.city?.message}>
              <Input {...register("city")} placeholder={t(k("placeholders.city"))} />
            </Field>
            <Field label={t(k("state"))} required error={errors.state?.message}>
              <Input {...register("state")} placeholder={t(k("placeholders.state"))} />
            </Field>
            <Field label={t(k("postalCode"))} required error={errors.pincode?.message}>
              <Input {...register("pincode")} placeholder={t(k("placeholders.postalCode"))} />
            </Field>
            <Field label={t(k("country"))} required error={errors.country?.message}>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <CountrySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={t(k("selectCountry"))}
                    invalid={!!errors.country}
                  />
                )}
              />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false)
              }}
              disabled={isPending}
            >
              {t(k("cancel"))}
            </Button>
            <Button type="submit" variant="gold" className="gap-1.5" disabled={isPending}>
              <Save className="size-3.5" />
              {isPending ? t("org.settings.saving") : t("org.settings.save")}
            </Button>
          </div>
        </form>
      ) : (
        readView
      )}
    </Section>
  )
}

/** Formatted read view for an account (KYC-profile) address. */
function AccountAddressDisplay({ addr }: Readonly<{ addr: AccountAddress }>) {
  const { data: countries } = useCountries()
  const country = countries?.find((c) => c.iso2 === addr.country)
  const cityLine = [addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")

  return (
    <address className="text-sm not-italic leading-relaxed text-foreground">
      <div>{addr.line1}</div>
      {addr.line2 && <div>{addr.line2}</div>}
      {cityLine && <div>{cityLine}</div>}
      <div>{country ? `${country.flag} ${country.name}` : addr.country}</div>
    </address>
  )
}

/* ── Convert individual → business ───────────────────────────────────────── */

/** Card that offers upgrading an individual account to a business account. */
function ConvertToBusinessSection({
  account,
  canEdit,
}: Readonly<{ account: MyAccount; canEdit: boolean }>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data: profile } = useAccountProfile(account.id)

  return (
    <Section
      variant="panel"
      title={t("account.settings.business", { defaultValue: "Business profile" })}
      description={t("account.settings.businessDescription", {
        defaultValue: "Organization, billing contact and tax details for business accounts.",
      })}
    >
      <EmptyState
        icon={Building2}
        title={t("account.settings.individualTitle", {
          defaultValue: "Individual account",
        })}
        description={t("account.settings.convert.description", {
          defaultValue:
            "Register a business to add an organization, billing contact and tax details. This starts a fresh verification.",
        })}
        action={
          canEdit
            ? {
                label: t("account.settings.convert.cta", {
                  defaultValue: "Convert to business",
                }),
                onClick: () => {
                  setOpen(true)
                },
              }
            : undefined
        }
      />
      <ConvertToBusinessSheet
        account={account}
        address={profile?.address ?? null}
        open={open}
        onOpenChange={setOpen}
      />
    </Section>
  )
}

/**
 * Collects organization + business-KYC details to convert an individual account.
 * On success the account is flagged for re-KYC, so we route to /onboarding/kyc to
 * finish verification.
 */
function ConvertToBusinessSheet({
  account,
  address,
  open,
  onOpenChange,
}: Readonly<{
  account: MyAccount
  address: AccountAddress | null
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: convert, isPending } = useConvertToBusiness(account.id)

  const req = t("org.settings.billingAddress.errors.required", { defaultValue: "Required" })
  const schema = z
    .object({
      org_name: z.string().trim().min(2, req).max(100),
      billing_email: z.union([z.email(), z.literal("")]).optional(),
      country: z.string().trim().min(2, req),
      legal_name: z.string().trim().min(2, req).max(200),
      pan: z.string().trim().optional(),
      gstin: z.string().trim().optional(),
      cin: z.string().trim().optional(),
      registration_number: z.string().trim().optional(),
      tax_id: z.string().trim().optional(),
      line1: z.string().trim().min(1, req),
      line2: z.string().trim().optional(),
      city: z.string().trim().min(1, req),
      state: z.string().trim().min(1, req),
      pincode: z.string().trim().min(1, req),
    })
    .refine(
      (v) => (v.country === "IN" ? !!v.pan && !!v.gstin : !!v.registration_number && !!v.tax_id),
      {
        message: t("account.settings.convert.idsRequired", {
          defaultValue: "Enter the required business identifiers for the selected country.",
        }),
        path: ["gstin"],
      },
    )
  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      org_name: "",
      billing_email: "",
      country: address?.country ?? "IN",
      legal_name: "",
      pan: "",
      gstin: "",
      cin: "",
      registration_number: "",
      tax_id: "",
      line1: address?.line1 ?? "",
      line2: address?.line2 ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      pincode: address?.pincode ?? "",
    },
  })

  const country = watch("country")
  const isIndia = country === "IN"

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (v: Values) => {
    const payload: ConvertToBusinessPayload = {
      org_name: v.org_name,
      billing_email: v.billing_email || undefined,
      country: v.country,
      legal_name: v.legal_name,
      pan: v.pan || undefined,
      gstin: v.gstin || undefined,
      cin: v.cin || undefined,
      registration_number: v.registration_number || undefined,
      tax_id: v.tax_id || undefined,
      address_line1: v.line1,
      address_line2: v.line2 || undefined,
      city: v.city,
      state: v.state,
      pincode: v.pincode,
    }
    convert(payload, {
      onSuccess: () => {
        close()
        void navigate("/onboarding/kyc")
      },
    })
  }

  const k = (key: string) => `org.settings.billingAddress.${key}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[520px] overflow-y-auto p-0">
        <SheetHeader className="px-6 py-5">
          <SheetTitle>
            {t("account.settings.convert.cta", { defaultValue: "Convert to business" })}
          </SheetTitle>
          <SheetDescription>
            {t("account.settings.convert.sheetSubtitle", {
              defaultValue:
                "Add your organization and tax details. You'll finish identity verification next.",
            })}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5 px-6 pb-6">
          <Field
            label={t("account.settings.convert.orgName", {
              defaultValue: "Organization name",
            })}
            required
            error={errors.org_name?.message}
          >
            <Input {...register("org_name")} placeholder="Acme Inc." />
          </Field>
          <Field
            label={t("org.settings.billingEmail", { defaultValue: "Billing email" })}
            hint={t(k("optional"))}
            error={errors.billing_email?.message}
          >
            <Input {...register("billing_email")} type="email" placeholder="billing@acme.com" />
          </Field>
          <Field
            label={t("account.settings.convert.legalName", {
              defaultValue: "Legal name",
            })}
            required
            error={errors.legal_name?.message}
          >
            <Input {...register("legal_name")} placeholder="Acme Private Limited" />
          </Field>
          <Field label={t(k("country"))} required error={errors.country?.message}>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <CountrySelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t(k("selectCountry"))}
                  invalid={!!errors.country}
                />
              )}
            />
          </Field>

          {isIndia ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="PAN" required error={errors.pan?.message}>
                <Input
                  {...register("pan")}
                  placeholder="AAAAA9999A"
                  className="font-mono uppercase"
                />
              </Field>
              <Field label="GSTIN" required error={errors.gstin?.message}>
                <Input
                  {...register("gstin")}
                  placeholder="22AAAAA9999A1Z5"
                  className="font-mono uppercase"
                />
              </Field>
              <Field
                label={t("account.settings.convert.cin", {
                  defaultValue: "CIN (optional)",
                })}
              >
                <Input
                  {...register("cin")}
                  placeholder="U12345KA2020PTC000000"
                  className="font-mono uppercase"
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("account.settings.convert.regNo", {
                  defaultValue: "Registration number",
                })}
                required
                error={errors.registration_number?.message}
              >
                <Input {...register("registration_number")} />
              </Field>
              <Field
                label={t("account.settings.convert.taxId", {
                  defaultValue: "Tax ID",
                })}
                required
                error={errors.tax_id?.message}
              >
                <Input {...register("tax_id")} />
              </Field>
            </div>
          )}

          <Field label={t(k("line1"))} required error={errors.line1?.message}>
            <Input {...register("line1")} placeholder={t(k("placeholders.line1"))} />
          </Field>
          <Field label={t(k("line2"))} hint={t(k("optional"))}>
            <Input {...register("line2")} placeholder={t(k("placeholders.line2"))} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t(k("city"))} required error={errors.city?.message}>
              <Input {...register("city")} />
            </Field>
            <Field label={t(k("state"))} required error={errors.state?.message}>
              <Input {...register("state")} />
            </Field>
            <Field label={t(k("postalCode"))} required error={errors.pincode?.message}>
              <Input {...register("pincode")} />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
              {t(k("cancel"))}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending
                ? t("org.settings.saving")
                : t("account.settings.convert.submit", {
                    defaultValue: "Convert & verify",
                  })}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/* ── Transfer ownership (owner only, OTP-gated) ──────────────────────────── */

/**
 * Ownership-transfer card. Rendered only for the account owner (member_role ===
 * "owner") — the requirement is that no one else can even see this affordance.
 */
function TransferOwnershipSection({ account }: Readonly<{ account: MyAccount }>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const isOwner = account.member_role === "owner"
  const { data: pending } = usePendingTransfer(account.id, isOwner)
  const cancel = useCancelTransfer(account.id)

  if (!isOwner) return null

  return (
    <Section
      variant="panel"
      title={t("account.settings.transfer.title", { defaultValue: "Transfer ownership" })}
      description={t("account.settings.transfer.description", {
        defaultValue:
          "Hand this account to another user. You'll confirm with a code sent to your email; you keep admin access afterwards.",
      })}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setOpen(true)
          }}
        >
          <ArrowLeftRight className="size-3.5" />
          {t("account.settings.transfer.cta", { defaultValue: "Transfer" })}
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        {t("account.settings.transfer.hint", {
          defaultValue:
            "The new owner must already be a member of this account. This action cannot be undone without their cooperation.",
        })}
      </p>

      {/* Persistent "pending" banner so closing the code dialog never strands
                the flow — the owner can always re-open the code step or cancel. */}
      {pending?.pending && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-brand-gold" />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-foreground">
                {t("account.settings.transfer.pendingTitle", {
                  defaultValue: "Transfer pending",
                })}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {t("account.settings.transfer.pendingTo", {
                  defaultValue:
                    "A confirmation code was emailed to you to hand this account to {{email}}.",
                  email: pending.target_email ?? "the new owner",
                })}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                cancel.mutate()
              }}
              disabled={cancel.isPending}
            >
              {t("account.settings.transfer.cancelPending", {
                defaultValue: "Cancel",
              })}
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setOpen(true)
              }}
            >
              {t("account.settings.transfer.enterCode", {
                defaultValue: "Enter code",
              })}
            </Button>
          </div>
        </div>
      )}

      <TransferOwnershipDialog
        account={account}
        open={open}
        onOpenChange={setOpen}
        pending={pending}
      />
    </Section>
  )
}

function TransferOwnershipDialog({
  account,
  open,
  onOpenChange,
  pending,
}: Readonly<{
  account: MyAccount
  open: boolean
  onOpenChange: (open: boolean) => void
  pending?: PendingTransfer
}>) {
  const { t } = useTranslation()
  const [step, setStep] = useState<"email" | "otp">("email")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined)
  const [resendIn, setResendIn] = useState(0)

  const { mutate: initiate, isPending: sending } = useInitiateTransfer(account.id)
  const { mutate: confirm, isPending: confirming } = useConfirmTransfer(account.id)
  const cancel = useCancelTransfer(account.id)

  // Members of this account, minus the current owner (you can't hand the
  // account to yourself) and any whose user record is gone (empty email).
  const { data: members = [], isLoading: membersLoading } = useAccountMembers(
    open ? account.id : undefined,
  )
  const eligibleMembers = members.filter((m) => m.member_role !== "owner" && m.email)

  const isPending = pending?.pending ?? false
  const wasOpen = useRef(false)

  // Seed the dialog on the open transition: resume at the code step when a
  // transfer is already pending, otherwise start fresh at the email step. Keyed
  // off the open transition so it never wipes the OTP the user is typing.
  useEffect(() => {
    if (open && !wasOpen.current) {
      if (isPending) {
        setStep("otp")
        setEmail(pending?.target_email ?? "")
        setResendIn(pending?.resend_in ?? 0)
      } else {
        setStep("email")
        setEmail("")
        setResendIn(0)
      }
      setOtp("")
      setDevOtp(undefined)
    }
    wasOpen.current = open
  }, [open, isPending, pending?.target_email, pending?.resend_in])

  // Tick the resend cooldown down once per second while the dialog is open.
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [open])

  const close = () => {
    onOpenChange(false)
  }

  const onSend = () => {
    initiate(email.trim(), {
      onSuccess: (res) => {
        setDevOtp(res.dev_otp)
        setResendIn(res.resend_in || 60)
        setStep("otp")
      },
    })
  }

  const onConfirm = () => {
    confirm(otp, { onSuccess: close })
  }

  // Abandon the pending code and return to the email step to pick a new target.
  const onStartOver = () => {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setStep("email")
        setEmail("")
        setOtp("")
        setResendIn(0)
        setDevOtp(undefined)
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) onOpenChange(o)
        else close()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("account.settings.transfer.title", {
              defaultValue: "Transfer ownership",
            })}
          </DialogTitle>
          <DialogDescription>
            {step === "email"
              ? t("account.settings.transfer.emailStep", {
                  defaultValue: "Choose the member who should become the new owner.",
                })
              : t("account.settings.transfer.otpStep", {
                  defaultValue: "Enter the 6-digit code we emailed you to confirm the transfer.",
                })}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <div className="space-y-4">
            <Field
              label={t("account.settings.transfer.targetEmail", {
                defaultValue: "New owner",
              })}
              required
            >
              {eligibleMembers.length === 0 && !membersLoading ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-muted-foreground">
                    {t("account.settings.transfer.noMembers", {
                      defaultValue:
                        "No other members in this account. Invite the future owner as a member first.",
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setInviteOpen(true)
                    }}
                  >
                    <UserPlus className="size-3.5" />
                    {t("account.settings.transfer.inviteMember", {
                      defaultValue: "Invite member",
                    })}
                  </Button>
                  <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
                </div>
              ) : (
                <Select value={email} onValueChange={setEmail} disabled={membersLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        membersLoading
                          ? t("account.settings.transfer.membersLoading", {
                              defaultValue: "Loading members…",
                            })
                          : t("account.settings.transfer.selectMember", {
                              defaultValue: "Select a member",
                            })
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.email}>
                        <span className="flex min-w-0 flex-col text-left">
                          <span className="truncate">{m.name || m.email}</span>
                          {m.name && (
                            <span className="truncate text-[12px] text-muted-foreground">
                              {m.email}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            {email && (
              <p className="text-center text-[13px] text-muted-foreground">
                {t("account.settings.transfer.otpFor", {
                  defaultValue: "Confirming transfer to {{email}}",
                  email,
                })}
              </p>
            )}
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                containerClassName="justify-center"
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {devOtp && (
              <p className="text-center text-[11px] text-muted-foreground">
                {t("account.settings.transfer.devOtp", {
                  defaultValue: "Dev code",
                })}
                : <span className="font-mono">{devOtp}</span>
              </p>
            )}
            {/* Resend (cooldown-gated) + start-over, so a closed dialog or a
                            never-arrived email is always recoverable. */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-muted-foreground">
                  {t("account.settings.transfer.noCode", {
                    defaultValue: "Didn't get the code?",
                  })}
                </span>
                <button
                  type="button"
                  onClick={onSend}
                  disabled={sending || resendIn > 0}
                  className="font-medium text-brand-gold hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendIn > 0
                    ? t("account.settings.transfer.resendIn", {
                        defaultValue: "Resend in {{seconds}}s",
                        seconds: resendIn,
                      })
                    : t("account.settings.transfer.resend", {
                        defaultValue: "Resend code",
                      })}
                </button>
              </div>
              <button
                type="button"
                onClick={onStartOver}
                disabled={cancel.isPending}
                className="text-[12px] text-muted-foreground underline hover:text-foreground disabled:cursor-not-allowed"
              >
                {t("account.settings.transfer.changeEmail", {
                  defaultValue: "Cancel and choose a different member",
                })}
              </button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={sending || confirming}>
            {t("org.settings.billingAddress.cancel", { defaultValue: "Cancel" })}
          </Button>
          {step === "email" ? (
            <Button variant="gold" onClick={onSend} disabled={sending || !email.trim()}>
              {sending
                ? t("org.settings.saving")
                : t("account.settings.transfer.send", {
                    defaultValue: "Send code",
                  })}
            </Button>
          ) : (
            <Button variant="gold" onClick={onConfirm} disabled={confirming || otp.length !== 6}>
              {confirming
                ? t("org.settings.saving")
                : t("account.settings.transfer.confirm", {
                    defaultValue: "Confirm transfer",
                  })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
