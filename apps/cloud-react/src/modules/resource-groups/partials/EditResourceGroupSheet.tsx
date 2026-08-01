import { useMemo, useState } from "react"

import { Label, Separator, Textarea } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { TagEditor } from "@/components/console"
import {
  Button,
  Input,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { recordToTagRows, tagRowsToRecord, type TagRow } from "@/lib/tags"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { useUpdateResourceGroup } from "../resource-groups.hooks"
import type { ResourceGroup, UpdateResourceGroupPayload } from "../resource-groups.types"

/* ── Schema ─────────────────────────────────────────────────────────── */

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    description: z.string().max(500, "Maximum 500 characters"),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

/* ── Component ─────────────────────────────────────────────────────── */

interface Props {
  group: ResourceGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditResourceGroupSheet({ group, open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const [tags, setTags] = useState<TagRow[]>(() => recordToTagRows(group.tags))
  const { mutate: update, isPending } = useUpdateResourceGroup()
  const { rule } = useNamingRule("resource-group")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: group.name, description: group.description },
  })

  // Reset to the source group's values, discarding any in-progress edits. The
  // parent remounts this sheet (via `key`) when the group changes, so initial
  // seeding happens at mount — this only handles the cancel/close path.
  const close = () => {
    reset({ name: group.name, description: group.description })
    setTags(recordToTagRows(group.tags))
    onOpenChange(false)
  }

  const onSubmit = (values: FormValues) => {
    const payload: UpdateResourceGroupPayload = {
      name: values.name,
      description: values.description,
      tags: tagRowsToRecord(tags),
    }
    update(
      { id: group.id, payload },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("resourceGroups.form.editTitle")}</SheetTitle>
          <SheetDescription>{t("resourceGroups.form.editSubtitle")}</SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="flex-1 px-6 py-5">
            <div className="space-y-5 pr-1">
              {/* Name */}
              <FormField
                label={t("resourceGroups.form.name")}
                required
                error={errors.name?.message}
                hint={t("resourceGroups.form.nameHint")}
              >
                <Input
                  {...register("name")}
                  placeholder="my-resource-group"
                  className="font-mono"
                />
              </FormField>

              {/* Description */}
              <FormField
                label={t("resourceGroups.form.description")}
                error={errors.description?.message}
              >
                <Textarea
                  {...register("description")}
                  placeholder="Describe the purpose of this resource group..."
                  rows={3}
                  className="resize-none"
                />
              </FormField>

              {/* Tags */}
              <TagEditor rows={tags} onChange={setTags} label={t("resourceGroups.form.tags")} />
            </div>
          </ScrollArea>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("resourceGroups.form.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending ? t("resourceGroups.form.saving") : t("resourceGroups.form.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/* ── Field wrapper ─────────────────────────────────────────────────── */

function FormField({
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
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
