import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Lock } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { PageHeader } from "@/components/console"
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
import { Textarea } from "@/components/ui/textarea"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import { VPC_ROUTES } from "../vpc.constants"
import { useCreateSecurityGroup, useVPCs } from "../vpc.hooks"

/** Radix Select items can't carry an empty value — sentinel for "no VPC". */
const NO_VPC = "__none__"

const makeSchema = (rule: NamingRule) =>
    z.object({
        name: namingNameSchema(rule),
        description: z.string().max(300, "Maximum 300 characters"),
        vpc_id: z.string(),
    })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

function FieldLabel({
    children,
    required,
}: Readonly<{ children: React.ReactNode; required?: boolean }>) {
    return (
        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {children}
            {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
    )
}

export function SecurityGroupCreatePage() {
    useScreen("vpc.security-group-create")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { mutate: create, isPending } = useCreateSecurityGroup()
    const { data: networks = [] } = useVPCs()
    const { rule } = useNamingRule("security-group")
    const schema = useMemo(() => makeSchema(rule), [rule])

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", description: "", vpc_id: NO_VPC },
    })

    const onSubmit = (values: FormValues) => {
        create(
            {
                name: values.name,
                description: values.description,
                network_id: values.vpc_id === NO_VPC ? undefined : values.vpc_id,
            },
            {
                onSuccess: (group) => {
                    void navigate(VPC_ROUTES.securityGroup(group.id))
                },
            }
        )
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                icon={Lock}
                breadcrumbs={[
                    { label: t("console.nav.groups.networking") },
                    { label: t("vpc.sgList.title"), to: VPC_ROUTES.SECURITY_GROUPS },
                    { label: t("vpc.sgForm.title") },
                ]}
                title={t("vpc.sgForm.title")}
                description={t("vpc.sgForm.subtitle")}
            />

            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-8 w-full max-w-xl">
                <div className="rounded-xl border border-border-glass bg-background/50 backdrop-blur-xl shadow-sm p-6 space-y-5">
                    <div className="space-y-1.5">
                        <FieldLabel required>{t("vpc.sgForm.name")}</FieldLabel>
                        <Input
                            {...register("name")}
                            placeholder="my-security-group"
                            className="font-mono"
                        />
                        {errors.name && (
                            <p className="text-[11px] text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <FieldLabel>{t("vpc.sgForm.description")}</FieldLabel>
                        <Textarea
                            {...register("description")}
                            placeholder={t("vpc.sgForm.descriptionPlaceholder")}
                            rows={3}
                            className="resize-none"
                        />
                        {errors.description && (
                            <p className="text-[11px] text-destructive">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <FieldLabel>{t("vpc.sgForm.vpc")}</FieldLabel>
                        <Controller
                            control={control}
                            name="vpc_id"
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NO_VPC}>
                                            {t("vpc.sgForm.vpcNone")}
                                        </SelectItem>
                                        {networks.map((n) => (
                                            <SelectItem key={n.id} value={n.id}>
                                                {n.name} ({n.cidr})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {t("vpc.sgForm.vpcHint")}
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-glass">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void navigate(VPC_ROUTES.SECURITY_GROUPS)}
                        >
                            {t("console.wizard.cancel")}
                        </Button>
                        <Button type="submit" variant="gold" disabled={isPending}>
                            {isPending && <Loader2 className="size-3.5 animate-spin" />}
                            {isPending ? t("vpc.sgForm.creating") : t("vpc.sgForm.create")}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
