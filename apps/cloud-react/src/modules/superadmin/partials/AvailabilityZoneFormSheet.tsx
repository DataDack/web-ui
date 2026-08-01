import { useEffect, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useCountries } from "@/modules/countries/countries.hooks"

import { Field, FormSheet } from "../components/form-fields"
import { useAdminAvailabilityZones, useSaveAvailabilityZone } from "../superadmin.hooks"
import type {
    AvailabilityZone,
    CreateAvailabilityZoneRequest,
    UpdateAvailabilityZoneRequest,
} from "../superadmin.types"

const schema = z.object({
    region_code: z.string().min(2, "Min 2 characters").max(64),
    region_name: z.string().min(2, "Min 2 characters").max(128),
    country: z.string().length(2, "Use the 2-letter ISO code").or(z.literal("")),
    code: z.string().min(2, "Min 2 characters").max(64),
    name: z.string().max(128),
    is_available: z.boolean(),
    is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

// Sentinel option value for the "New region" action inside the region picker.
// Chosen so it can never collide with a real region_code.
const NEW_REGION_VALUE = "__new_region__"

const EMPTY: FormValues = {
    region_code: "",
    region_name: "",
    country: "",
    code: "",
    name: "",
    is_available: true,
    is_active: true,
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    availabilityZone?: AvailabilityZone | null
}

export function AvailabilityZoneFormSheet({
    open,
    onOpenChange,
    availabilityZone,
}: Readonly<Props>) {
    const { t } = useTranslation()
    const { mutate: save, isPending } = useSaveAvailabilityZone()
    const { data: countries = [] } = useCountries()
    const { data: azs = [] } = useAdminAvailabilityZones()
    const isEdit = !!availabilityZone

    // Existing regions are derived from the AZ list — each AZ carries its region
    // inline, so we de-dup by region_code to build the picker's options.
    const regions = useMemo(() => {
        const byCode = new Map<
            string,
            { region_code: string; region_name: string; country: string }
        >()
        for (const az of azs) {
            if (!byCode.has(az.region_code)) {
                byCode.set(az.region_code, {
                    region_code: az.region_code,
                    region_name: az.region_name,
                    country: az.country,
                })
            }
        }
        return Array.from(byCode.values()).sort((a, b) =>
            a.region_name.localeCompare(b.region_name)
        )
    }, [azs])

    // When creating, admins pick an existing region or switch to entering a new
    // one. `newRegion` reveals the free-text region fields.
    const [newRegion, setNewRegion] = useState(false)
    // Reset the region-entry mode each time the sheet opens (render-phase state
    // sync, per React's "you might not need an effect" guidance): default to the
    // picker when regions exist, otherwise straight to the new-region inputs.
    const [wasOpen, setWasOpen] = useState(false)
    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) setNewRegion(regions.length === 0)
    }

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

    useEffect(() => {
        if (open) {
            reset(
                availabilityZone
                    ? {
                          region_code: availabilityZone.region_code,
                          region_name: availabilityZone.region_name,
                          country: availabilityZone.country,
                          code: availabilityZone.code,
                          name: availabilityZone.name,
                          is_available: availabilityZone.is_available,
                          is_active: availabilityZone.is_active,
                      }
                    : EMPTY
            )
        }
    }, [open, availabilityZone, reset])

    const selectRegion = (code: string) => {
        const region = regions.find((r) => r.region_code === code)
        if (!region) return
        setValue("region_code", region.region_code, { shouldValidate: true })
        setValue("region_name", region.region_name, { shouldValidate: true })
        setValue("country", region.country)
    }

    const onSubmit = (values: FormValues) => {
        const name = values.name.length > 0 ? values.name : undefined
        const country = values.country.length > 0 ? values.country : undefined
        // On edit, code is identity and not editable; send the patchable subset.
        const body: CreateAvailabilityZoneRequest | UpdateAvailabilityZoneRequest = isEdit
            ? {
                  region_code: values.region_code,
                  region_name: values.region_name,
                  country,
                  name,
                  is_available: values.is_available,
                  is_active: values.is_active,
              }
            : {
                  region_code: values.region_code,
                  region_name: values.region_name,
                  country,
                  code: values.code,
                  name,
                  is_available: values.is_available,
                  is_active: values.is_active,
              }
        save(
            { id: availabilityZone?.id, payload: body },
            {
                onSuccess: () => {
                    onOpenChange(false)
                },
            }
        )
    }

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={
                isEdit
                    ? t("superAdmin.availabilityZones.editTitle")
                    : t("superAdmin.availabilityZones.createTitle")
            }
            description={t("superAdmin.availabilityZones.formSubtitle")}
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            submitting={isPending}
            submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
        >
            {!isEdit && !newRegion ? (
                <Field
                    label={t("superAdmin.availabilityZones.fields.region")}
                    required
                    error={errors.region_code?.message}
                >
                    <Controller
                        control={control}
                        name="region_code"
                        render={({ field }) => (
                            <Select
                                value={field.value === "" ? undefined : field.value}
                                onValueChange={(value) => {
                                    if (value === NEW_REGION_VALUE) {
                                        setValue("region_code", "")
                                        setValue("region_name", "")
                                        setValue("country", "")
                                        setNewRegion(true)
                                        return
                                    }
                                    selectRegion(value)
                                }}
                            >
                                <SelectTrigger className="w-full font-mono">
                                    <SelectValue
                                        placeholder={t(
                                            "superAdmin.availabilityZones.fields.regionPlaceholder"
                                        )}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {regions.map((r) => (
                                        <SelectItem key={r.region_code} value={r.region_code}>
                                            {r.region_name}{" "}
                                            <span className="font-mono text-muted-foreground">
                                                ({r.region_code})
                                            </span>
                                        </SelectItem>
                                    ))}
                                    <SelectSeparator />
                                    <SelectItem value={NEW_REGION_VALUE} className="font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Plus className="w-4 h-4" />
                                            {t("superAdmin.availabilityZones.fields.newRegion")}
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </Field>
            ) : (
                <>
                    <Field
                        label={t("superAdmin.availabilityZones.fields.regionCode")}
                        required
                        error={errors.region_code?.message}
                    >
                        <Input
                            {...register("region_code")}
                            placeholder="noida-ncr"
                            className="font-mono"
                        />
                    </Field>
                    <Field
                        label={t("superAdmin.availabilityZones.fields.regionName")}
                        required
                        error={errors.region_name?.message}
                    >
                        <Input {...register("region_name")} placeholder="India Noida (NCR)" />
                    </Field>
                    {!isEdit && regions.length > 0 && (
                        <button
                            type="button"
                            className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
                            onClick={() => {
                                setValue("region_code", "")
                                setValue("region_name", "")
                                setValue("country", "")
                                setNewRegion(false)
                            }}
                        >
                            {t("superAdmin.availabilityZones.fields.selectExisting")}
                        </button>
                    )}
                </>
            )}
            <Field
                label={t("superAdmin.availabilityZones.fields.country")}
                error={errors.country?.message}
            >
                <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                        <Select
                            value={field.value === "" ? undefined : field.value}
                            onValueChange={field.onChange}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t(
                                        "superAdmin.availabilityZones.fields.countryPlaceholder"
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {countries.map((c) => (
                                    <SelectItem key={c.iso2} value={c.iso2}>
                                        {c.flag} {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </Field>
            <Field
                label={t("superAdmin.availabilityZones.fields.code")}
                required
                error={errors.code?.message}
                hint={isEdit ? t("superAdmin.availabilityZones.fields.codeLocked") : undefined}
            >
                <Input
                    {...register("code")}
                    placeholder="noida-ncr-1a"
                    className="font-mono"
                    disabled={isEdit}
                />
            </Field>
            <Field
                label={t("superAdmin.availabilityZones.fields.name")}
                error={errors.name?.message}
            >
                <Input {...register("name")} placeholder="Noida 1A" />
            </Field>
            <Controller
                control={control}
                name="is_available"
                render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border border-border-glass px-3.5 py-3">
                        <div>
                            <p className="text-sm font-medium">
                                {t("superAdmin.availabilityZones.fields.available")}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                {t("superAdmin.availabilityZones.fields.availableHint")}
                            </p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                )}
            />
            <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border border-border-glass px-3.5 py-3">
                        <div>
                            <p className="text-sm font-medium">{t("superAdmin.fields.active")}</p>
                            <p className="text-[11px] text-muted-foreground">
                                {t("superAdmin.availabilityZones.fields.activeHint")}
                            </p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                )}
            />
        </FormSheet>
    )
}
