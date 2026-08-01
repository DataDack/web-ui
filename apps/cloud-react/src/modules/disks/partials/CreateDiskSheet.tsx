import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

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
import { Separator } from "@/components/ui/separator"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useRegionCatalog } from "@/modules/catalog/catalog.hooks"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { DISK_TYPES } from "../disks.constants"
import { useCreateDisk } from "../disks.hooks"

const makeSchema = (rule: NamingRule) =>
    z.object({
        name: namingNameSchema(rule),
        description: z.string().optional(),
        size_gb: z.coerce.number().min(10, "Minimum 10 GB").max(65536, "Maximum 64 TB"),
        disk_type: z.enum(["ssd", "hdd"]),
        volume_class: z.string().optional(),
        zone: z.string().min(1, "Required"),
        multi_attach: z.boolean().default(false),
        delete_on_termination: z.boolean().default(false),
    })

type Schema = ReturnType<typeof makeSchema>
type FormInput = z.input<Schema>
type FormValues = z.output<Schema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateDiskSheet({ open, onOpenChange }: Readonly<Props>) {
    const { t } = useTranslation()
    const { mutate: create, isPending } = useCreateDisk()
    const { data: regions = [] } = useRegionCatalog()
    const { rule } = useNamingRule("disk")
    const schema = useMemo(() => makeSchema(rule), [rule])

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormInput, unknown, FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            size_gb: 100,
            disk_type: "ssd",
            zone: "",
            volume_class: "gp3",
            multi_attach: false,
            delete_on_termination: false,
        },
    })

    const close = () => {
        reset()
        onOpenChange(false)
    }

    // Flat list of availability zones across all regions, each tagged with the
    // region it belongs to so we can resolve the region from the picked zone.
    const zones = regions.flatMap((r) =>
        r.availability_zones.map((z) => ({ code: z.code, region: r.code }))
    )

    const onSubmit = (values: FormValues) => {
        const region =
            zones.find((z) => z.code === values.zone)?.region ?? values.zone.replace(/-[a-z]$/, "")
        create({ ...values, region }, { onSuccess: close })
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
                <SheetHeader className="px-6 py-5 shrink-0">
                    <SheetTitle>{t("disks.form.title")}</SheetTitle>
                    <SheetDescription>{t("disks.form.subtitle")}</SheetDescription>
                </SheetHeader>

                <Separator />

                <form
                    onSubmit={(e) => void handleSubmit(onSubmit)(e)}
                    className="flex flex-col flex-1 overflow-hidden"
                >
                    <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                {t("disks.form.name")}
                                <span className="text-destructive ml-0.5">*</span>
                            </Label>
                            <Input
                                {...register("name")}
                                placeholder="my-data-disk"
                                className="font-mono"
                            />
                            {errors.name && (
                                <p className="text-[11px] text-destructive">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                Description
                            </Label>
                            <Input
                                {...register("description")}
                                placeholder="Optional description..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                    {t("disks.form.size")}
                                    <span className="text-destructive ml-0.5">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    {...register("size_gb", { valueAsNumber: true })}
                                    className="font-mono"
                                />
                                {errors.size_gb && (
                                    <p className="text-[11px] text-destructive">
                                        {errors.size_gb.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                    {t("disks.columns.type")}
                                    <span className="text-destructive ml-0.5">*</span>
                                </Label>
                                <Select
                                    value={watch("disk_type")}
                                    onValueChange={(value) => {
                                        setValue("disk_type", value as FormValues["disk_type"], {
                                            shouldValidate: true,
                                        })
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DISK_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {t(type.labelKey)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                    Volume Class
                                </Label>
                                <Select
                                    value={watch("volume_class")}
                                    onValueChange={(value) => {
                                        setValue("volume_class", value, { shouldValidate: true })
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gp3">General Purpose (gp3)</SelectItem>
                                        <SelectItem value="io2">Provisioned IOPS (io2)</SelectItem>
                                        <SelectItem value="sc1">Cold HDD (sc1)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                    {t("vms.columns.zone")}
                                    <span className="text-destructive ml-0.5">*</span>
                                </Label>
                                <Select
                                    value={watch("zone")}
                                    disabled={zones.length === 0}
                                    onValueChange={(value) => {
                                        setValue("zone", value, { shouldValidate: true })
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={t("disks.form.zonePlaceholder")}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {zones.map((zone) => (
                                            <SelectItem key={zone.code} value={zone.code}>
                                                {zone.code}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold">Advanced Features</h4>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Multi-Attach</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Allow mounting to multiple instances simultaneously.
                                    </p>
                                </div>
                                <Switch
                                    checked={watch("multi_attach")}
                                    onCheckedChange={(checked) => {
                                        setValue("multi_attach", checked)
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Delete on Termination</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Automatically delete disk when the attached instance
                                        terminates.
                                    </p>
                                </div>
                                <Switch
                                    checked={watch("delete_on_termination")}
                                    onCheckedChange={(checked) => {
                                        setValue("delete_on_termination", checked)
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
                        <Button type="button" variant="ghost" onClick={close}>
                            {t("console.wizard.cancel")}
                        </Button>
                        <Button type="submit" variant="gold" disabled={isPending}>
                            {isPending ? t("disks.form.creating") : t("disks.form.create")}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
