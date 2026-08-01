import { useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Receipt } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod/v4"

import { PageHeader, Section } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useScreen } from "@/services/api/screen"

import { TAX_SETTINGS_ROUTES } from "../governance.constants"
import { useSaveTaxRegistration, useTaxRegistration } from "../tax-settings.hooks"
import {
    INDIAN_STATES,
    TAX_COUNTRIES,
    type UpsertTaxRegistrationInput,
} from "../tax-settings.types"

// Mirror the backend validators (apps/auth/onboarding/service/validators.go).
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/
const PINCODE_RE = /^[1-9]\d{5}$/

const baseObject = z.object({
    country: z.string().min(2),
    customerType: z.enum(["business", "individual"]),
    stateProvince: z.string(),
    gstin: z.string(),
    pan: z.string(),
    businessLegalName: z.string(),
    addrLine1: z.string(),
    addrLine2: z.string(),
    addrCity: z.string(),
    addrState: z.string(),
    addrPostal: z.string(),
    addrCountry: z.string(),
})

type FormValues = z.infer<typeof baseObject>

interface Issue {
    path: keyof FormValues
    message: string
}

/** Conditional validation by customer type — returns the issues to report. */
function validateByType(v: FormValues): Issue[] {
    if (v.customerType === "business") {
        return [
            !GSTIN_RE.test(v.gstin.toUpperCase()) &&
                ({ path: "gstin", message: "Invalid GSTIN. Format: 27AAAAA0000AXXX" } as Issue),
            v.businessLegalName.trim().length < 2 &&
                ({
                    path: "businessLegalName",
                    message: "Business legal name is required",
                } as Issue),
            !v.stateProvince &&
                ({ path: "stateProvince", message: "State/Province is required" } as Issue),
            !v.addrLine1.trim() &&
                ({ path: "addrLine1", message: "Address line 1 is required" } as Issue),
            !v.addrCity.trim() && ({ path: "addrCity", message: "City is required" } as Issue),
            !v.addrState.trim() &&
                ({ path: "addrState", message: "State/Province is required" } as Issue),
            !PINCODE_RE.test(v.addrPostal) &&
                ({ path: "addrPostal", message: "Invalid ZIP/postal code" } as Issue),
            v.addrCountry !== v.country &&
                ({
                    path: "addrCountry",
                    message: "Legal address country must match the registration country",
                } as Issue),
        ].filter(Boolean) as Issue[]
    }
    return [
        !PAN_RE.test(v.pan.toUpperCase()) &&
            ({ path: "pan", message: "Invalid PAN. Format: AAAAA0000A" } as Issue),
        v.addrPostal &&
            !PINCODE_RE.test(v.addrPostal) &&
            ({ path: "addrPostal", message: "Invalid ZIP/postal code" } as Issue),
    ].filter(Boolean) as Issue[]
}

const schema = baseObject.superRefine((v, ctx) => {
    for (const issue of validateByType(v)) {
        ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message })
    }
})

const EMPTY: FormValues = {
    country: "IN",
    customerType: "business",
    stateProvince: "",
    gstin: "",
    pan: "",
    businessLegalName: "",
    addrLine1: "",
    addrLine2: "",
    addrCity: "",
    addrState: "",
    addrPostal: "",
    addrCountry: "IN",
}

export function TaxRegistrationFormPage() {
    useScreen("governance.tax-registration-form")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const isEdit = !!id

    const { data: existing = null, isLoading } = useTaxRegistration(isEdit ? id : undefined)
    const { mutate: save, isPending } = useSaveTaxRegistration()

    const back = () => void navigate(TAX_SETTINGS_ROUTES.ROOT)

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: EMPTY,
        mode: "onTouched",
    })

    useEffect(() => {
        if (existing) {
            form.reset({
                country: existing.country,
                customerType: existing.customerType,
                stateProvince: existing.stateProvince,
                gstin: existing.gstin,
                pan: existing.pan,
                businessLegalName: existing.businessLegalName,
                addrLine1: existing.legalAddress?.line1 ?? "",
                addrLine2: existing.legalAddress?.line2 ?? "",
                addrCity: existing.legalAddress?.city ?? "",
                addrState: existing.legalAddress?.stateProvince ?? "",
                addrPostal: existing.legalAddress?.postalCode ?? "",
                addrCountry: existing.legalAddress?.country ?? existing.country,
            })
        }
    }, [existing, form])

    const customerType = useWatch({ control: form.control, name: "customerType" })
    const gstin = useWatch({ control: form.control, name: "gstin" })
    // For business customers PAN is derived from the GSTIN (chars 3..12).
    const derivedPan =
        customerType === "business" && GSTIN_RE.test(gstin.toUpperCase())
            ? gstin.toUpperCase().slice(2, 12)
            : ""

    const onSubmit = (v: FormValues) => {
        const input: UpsertTaxRegistrationInput = {
            country: v.country,
            customerType: v.customerType,
            stateProvince: v.customerType === "business" ? v.stateProvince : "",
            gstin: v.customerType === "business" ? v.gstin.toUpperCase() : "",
            pan: v.customerType === "individual" ? v.pan.toUpperCase() : "",
            businessLegalName: v.customerType === "business" ? v.businessLegalName : "",
            legalAddress: {
                line1: v.addrLine1,
                line2: v.addrLine2,
                city: v.addrCity,
                stateProvince: v.addrState,
                postalCode: v.addrPostal,
                country: v.addrCountry,
            },
        }
        save({ id, input }, { onSuccess: back })
    }

    if (isEdit && isLoading && !existing) {
        return (
            <div className="grid place-items-center py-20 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
            </div>
        )
    }

    return (
        <div>
            <PageHeader
                icon={Receipt}
                breadcrumbs={[
                    { label: t("console.nav.groups.governance") },
                    { label: t("taxSettings.title"), to: TAX_SETTINGS_ROUTES.ROOT },
                    { label: isEdit ? t("taxSettings.editTitle") : t("taxSettings.createTitle") },
                ]}
                title={isEdit ? t("taxSettings.editTitle") : t("taxSettings.createTitle")}
                description={t("taxSettings.formSubtitle")}
            />

            <form
                onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
                className="space-y-5 max-w-2xl"
            >
                {/* ── Registration ─────────────────────────────────────── */}
                <Section variant="panel" className="space-y-5">
                    {isEdit && existing && (
                        <Field label={t("taxSettings.fields.accountId")}>
                            <Input value={existing.accountNumber} readOnly className="font-mono" />
                        </Field>
                    )}

                    <Field
                        label={t("taxSettings.fields.country")}
                        hint={t("taxSettings.hints.country")}
                    >
                        <Controller
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TAX_COUNTRIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </Field>

                    <Field label={t("taxSettings.fields.customerType")}>
                        <Controller
                            control={form.control}
                            name="customerType"
                            render={({ field }) => (
                                <div className="inline-flex rounded-md border border-border-glass p-0.5">
                                    {(["business", "individual"] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                                field.onChange(opt)
                                            }}
                                            className={cn(
                                                "px-4 py-1.5 text-sm rounded transition-colors",
                                                field.value === opt
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {t(`taxSettings.customerType.${opt}`)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
                    </Field>

                    {customerType === "business" ? (
                        <>
                            <Field
                                label={t("taxSettings.fields.stateProvince")}
                                error={form.formState.errors.stateProvince?.message}
                            >
                                <Controller
                                    control={form.control}
                                    name="stateProvince"
                                    render={({ field }) => (
                                        <StateSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                            </Field>

                            <Field
                                label={t("taxSettings.fields.gstin")}
                                hint={t("taxSettings.hints.gstin")}
                                error={form.formState.errors.gstin?.message}
                            >
                                <Input
                                    {...form.register("gstin")}
                                    placeholder="27AAAAA0000A1Z5"
                                    className="font-mono uppercase"
                                />
                            </Field>

                            <Field
                                label={t("taxSettings.fields.pan")}
                                hint={t("taxSettings.hints.panBusiness")}
                            >
                                <Input
                                    value={derivedPan}
                                    readOnly
                                    placeholder="—"
                                    className="font-mono"
                                />
                            </Field>

                            <Field
                                label={t("taxSettings.fields.businessLegalName")}
                                error={form.formState.errors.businessLegalName?.message}
                            >
                                <Input {...form.register("businessLegalName")} />
                            </Field>
                        </>
                    ) : (
                        <Field
                            label={t("taxSettings.fields.pan")}
                            hint={t("taxSettings.hints.panIndividual")}
                            error={form.formState.errors.pan?.message}
                        >
                            <Input
                                {...form.register("pan")}
                                placeholder="AAAAA0000A"
                                className="font-mono uppercase"
                            />
                        </Field>
                    )}
                </Section>

                {/* ── Legal address ────────────────────────────────────── */}
                <Section
                    variant="panel"
                    title={t("taxSettings.legalAddress")}
                    className="space-y-5"
                >
                    {customerType === "business" && (
                        <Field
                            label={t("taxSettings.fields.addressCountry")}
                            hint={t("taxSettings.hints.addressCountry")}
                            error={form.formState.errors.addrCountry?.message}
                        >
                            <Controller
                                control={form.control}
                                name="addrCountry"
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TAX_COUNTRIES.map((c) => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </Field>
                    )}

                    <Field
                        label={t("taxSettings.fields.addressLine1")}
                        optional={customerType === "individual"}
                        error={form.formState.errors.addrLine1?.message}
                    >
                        <Input {...form.register("addrLine1")} />
                    </Field>

                    <Field label={t("taxSettings.fields.addressLine2")} optional>
                        <Input {...form.register("addrLine2")} />
                    </Field>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field
                            label={t("taxSettings.fields.city")}
                            optional={customerType === "individual"}
                            error={form.formState.errors.addrCity?.message}
                        >
                            <Input {...form.register("addrCity")} />
                        </Field>
                        <Field
                            label={t("taxSettings.fields.postalCode")}
                            optional={customerType === "individual"}
                            error={form.formState.errors.addrPostal?.message}
                        >
                            <Input {...form.register("addrPostal")} className="font-mono" />
                        </Field>
                    </div>

                    {customerType === "business" && (
                        <Field
                            label={t("taxSettings.fields.stateProvince")}
                            error={form.formState.errors.addrState?.message}
                        >
                            <Controller
                                control={form.control}
                                name="addrState"
                                render={({ field }) => (
                                    <StateSelect value={field.value} onChange={field.onChange} />
                                )}
                            />
                        </Field>
                    )}
                </Section>

                <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={back} disabled={isPending}>
                        {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="size-4 animate-spin" />}
                        {isEdit ? t("common.save") : t("taxSettings.actions.add")}
                    </Button>
                </div>
            </form>
        </div>
    )
}

/* ── Small field primitives (match the codebase form style) ─────────────── */

function Field({
    label,
    hint,
    error,
    optional,
    children,
}: Readonly<{
    label: string
    hint?: string
    error?: string
    optional?: boolean
    children: React.ReactNode
}>) {
    const { t } = useTranslation()
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {label}
                {optional && (
                    <span className="ml-1 normal-case font-normal text-muted-foreground/70">
                        {t("taxSettings.optional")}
                    </span>
                )}
            </Label>
            {children}
            {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
    )
}

function StateSelect({
    value,
    onChange,
}: Readonly<{ value: string; onChange: (v: string) => void }>) {
    const { t } = useTranslation()
    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={t("taxSettings.fields.statePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
                {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                        {s}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
