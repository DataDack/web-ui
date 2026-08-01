import { useMemo, useState } from "react"

import { Label, Textarea } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { FolderTree } from "lucide-react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { CreateWizard, PageHeader, TagEditor, type WizardStep } from "@/components/console"
import { Input } from "@/components/ui/input"
import { tagRowsToRecord, type TagRow } from "@/lib/tags"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import { RG_ROUTES } from "../resource-groups.constants"
import { useCreateResourceGroup } from "../resource-groups.hooks"

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    description: z.string().max(500, "Maximum 500 characters"),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function ResourceGroupCreateWizardPage() {
  useScreen("resource-groups.resource-group-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateResourceGroup()
  const [tagRows, setTagRows] = useState<TagRow[]>([{ key: "", value: "" }])
  const { rule } = useNamingRule("resource-group")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
    mode: "onTouched",
  })

  const steps = useMemo<WizardStep<FormValues>[]>(
    () => [
      {
        id: "basics",
        title: t("resourceGroups.wizard.basics"),
        description: t("resourceGroups.wizard.basicsDescription"),
        fields: ["name", "description"],
        render: (f) => <BasicsStep form={f} />,
        reviewItems: (values) => [
          { label: t("resourceGroups.form.name"), value: values.name, mono: true },
          {
            label: t("resourceGroups.form.description"),
            value: values.description || "—",
          },
        ],
      },
      {
        id: "tags",
        title: t("console.tags.label"),
        description: t("resourceGroups.wizard.tagsDescription"),
        fields: [],
        render: () => <TagEditor rows={tagRows} onChange={setTagRows} />,
        reviewItems: () => {
          const entries = Object.entries(tagRowsToRecord(tagRows))
          return [
            {
              label: t("console.tags.label"),
              value: entries.length > 0 ? entries.map(([k, v]) => `${k}=${v}`).join(", ") : "—",
              mono: true,
            },
          ]
        },
      },
    ],
    [t, tagRows],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        icon={FolderTree}
        breadcrumbs={[
          { label: t("console.nav.groups.governance") },
          { label: t("resourceGroups.title"), to: RG_ROUTES.ROOT },
          { label: t("resourceGroups.create") },
        ]}
        title={t("resourceGroups.create")}
        description={t("resourceGroups.wizard.subtitle")}
      />

      <CreateWizard<FormValues>
        steps={steps}
        form={form}
        submitLabel={t("resourceGroups.wizard.submit")}
        isSubmitting={isPending}
        onCancel={() => void navigate(RG_ROUTES.ROOT)}
        onSubmit={(values) => {
          create(
            { ...values, tags: tagRowsToRecord(tagRows) },
            { onSuccess: (rg) => void navigate(RG_ROUTES.detail(rg.id)) },
          )
        }}
      />
    </div>
  )
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

function BasicsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel>{t("resourceGroups.form.name")} *</FieldLabel>
        <Input {...form.register("name")} placeholder="my-resource-group" className="font-mono" />
        <FieldError message={form.formState.errors.name?.message} />
        <p className="text-[11px] text-muted-foreground">{t("resourceGroups.form.nameHint")}</p>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>{t("resourceGroups.form.description")}</FieldLabel>
        <Textarea
          {...form.register("description")}
          placeholder={t("resourceGroups.wizard.descriptionPlaceholder")}
          rows={3}
          className="resize-none"
        />
        <FieldError message={form.formState.errors.description?.message} />
      </div>
    </div>
  )
}
