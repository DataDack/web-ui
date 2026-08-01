import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { TagEditor } from "@/components/console"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { TagRow } from "@/lib/tags"
import { RGField } from "@/modules/resource-groups/components/RGField"

import { FieldLabel, FieldError } from "./wizard.shared"
import type { FormValues } from "./wizard.types"

export function BasicsStep({
  form,
  tagRows,
  setTagRows,
}: Readonly<{
  form: UseFormReturn<FormValues>
  tagRows: TagRow[]
  setTagRows: (rows: TagRow[]) => void
}>) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Identity — resource group on its own row; instance name and
			    description share a row below it. */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <FieldLabel>
            {t("resourceGroups.field.label")}
            <span className="ml-0.5 text-destructive">*</span>
          </FieldLabel>
          <RGField
            value={form.watch("resource_group_id")}
            onChange={(id) => {
              form.setValue("resource_group_id", id, { shouldValidate: true })
            }}
            aria-invalid={!!form.formState.errors.resource_group_id}
          />
          <p className="text-[11px] text-muted-foreground">{t("resourceGroups.field.hint")}</p>
          <FieldError message={form.formState.errors.resource_group_id?.message} />
        </div>

        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>Instance Name (Optional)</FieldLabel>
            <Input
              placeholder="Leave blank to auto-generate"
              className="font-mono"
              value={form.watch("name") ?? ""}
              onChange={(e) => {
                form.setValue("name", e.target.value, {
                  shouldValidate: form.formState.isSubmitted,
                })
              }}
              onBlur={() => void form.trigger("name")}
            />
            <p className="text-[11px] text-muted-foreground">
              A unique name will be generated if left blank.
            </p>
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Description (Optional)</FieldLabel>
            <Textarea
              placeholder="A brief description of this instance..."
              rows={3}
              className="resize-none"
              value={form.watch("description") ?? ""}
              onChange={(e) => {
                form.setValue("description", e.target.value, {
                  shouldValidate: form.formState.isSubmitted,
                })
              }}
              onBlur={() => void form.trigger("description")}
            />
            <FieldError message={form.formState.errors.description?.message} />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-border-glass pt-5">
        <FieldLabel>Tags (Optional)</FieldLabel>
        <TagEditor rows={tagRows} onChange={setTagRows} />
      </div>

      <div className="space-y-4 border-t border-border-glass pt-5">
        <h4 className="text-sm font-semibold">Advanced Options</h4>

        <div className="grid items-start gap-x-6 gap-y-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>Termination Protection</FieldLabel>
            <div className="flex h-9 items-center justify-between gap-4 rounded-md border border-border-glass bg-muted/10 px-3">
              <p className="text-xs text-muted-foreground line-clamp-1">
                Prevent this instance from being accidentally deleted.
              </p>
              <Switch
                checked={form.watch("termination_protection")}
                onCheckedChange={(checked) => {
                  form.setValue("termination_protection", checked)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
