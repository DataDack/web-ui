import { useMemo } from "react"
import { useScreen } from "@/services/api/screen"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Users } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { PageHeader, Section } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { IAM_ROUTES } from "../iam.constants"
import { useCreateIAMGroup } from "../iam.hooks"

const makeSchema = (rule: NamingRule) =>
    z.object({
    name: namingNameSchema(rule),
    description: z.string().max(255, "Maximum 255 characters").optional(),
})

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function CreateGroupPage() {
    useScreen("iam.create-group")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { mutate: create, isPending } = useCreateIAMGroup()
    const { rule } = useNamingRule("iam-group")
    const schema = useMemo(() => makeSchema(rule), [rule])

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema) })

    const onSubmit = (values: FormValues) => {
        create(values, {
            onSuccess: (group) => void navigate(IAM_ROUTES.groupDetail(group.id)),
        })
    }

    return (
        <div className="space-y-5">
            <PageHeader
                icon={Users}
                breadcrumbs={[
                    { label: t("console.nav.groups.iam") },
                    { label: t("iam.groups.title") },
                    { label: t("iam.groups.create") },
                ]}
                title={t("iam.groups.createForm.title")}
                description={t("iam.groups.createForm.subtitle")}
                actions={
                    <Button
                        variant="ghost"
                        className="gap-2"
                        onClick={() => void navigate(IAM_ROUTES.GROUPS)}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("iam.groups.title")}
                    </Button>
                }
            />

            <Section variant="panel" title={t("iam.groups.createForm.title")}>
                <form
                    onSubmit={(e) => void handleSubmit(onSubmit)(e)}
                    className="max-w-xl space-y-5"
                >
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("iam.columns.name")}
                            <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input
                            {...register("name")}
                            placeholder="platform-admins"
                            className="font-mono"
                        />
                        {errors.name && (
                            <p className="text-[11px] text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("iam.columns.description")}
                        </Label>
                        <Textarea
                            {...register("description")}
                            placeholder={t("iam.groups.createForm.descriptionPlaceholder")}
                            rows={3}
                            className="resize-none"
                        />
                        {errors.description && (
                            <p className="text-[11px] text-destructive">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void navigate(IAM_ROUTES.GROUPS)}
                        >
                            {t("console.wizard.cancel")}
                        </Button>
                        <Button type="submit" variant="gold" disabled={isPending}>
                            {isPending
                                ? t("iam.groups.createForm.creating")
                                : t("iam.groups.create")}
                        </Button>
                    </div>
                </form>
            </Section>
        </div>
    )
}
