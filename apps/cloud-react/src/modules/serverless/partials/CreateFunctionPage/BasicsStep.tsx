import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { Terminal } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { TagEditor } from "@/components/console"
import { useResourceGroups } from "@/modules/resource-groups/resource-groups.hooks"

import { FieldError } from "./FieldError"
import type { FormValues } from "./schema"

/** The Select value standing in for "no group", since "" is not selectable. */
const NO_GROUP = "__none__"

export function BasicsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const name = form.watch("name")
  const resourceGroupId = form.watch("resourceGroupId")
  const tags = form.watch("tags")
  const { data: groups } = useResourceGroups()

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fn-name">
          {t("serverless.form.name")}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          id="fn-name"
          placeholder="my-function"
          className="font-mono"
          aria-invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      {/* The name is the function's address as well as its label — showing the
          invoke form here is what makes that concrete while it can still be
          changed cheaply. */}
      <div className="border-border/60 flex items-center gap-2 rounded-lg border px-3 py-2.5">
        <Terminal className="text-muted-foreground size-3.5 shrink-0" />
        <code className="text-muted-foreground min-w-0 truncate font-mono text-[11px]">
          datadack serverless invoke {name || "my-function"}
        </code>
      </div>

      {/* Asked here rather than inherited silently from the topbar: the group a
          function is filed under decides who finds it later, and it cannot be
          changed from the console afterwards. The active group is the default
          so the common case is still one click. */}
      <div className="space-y-1.5">
        <Label htmlFor="fn-resource-group">{t("serverless.form.resourceGroup")}</Label>
        <Select
          value={resourceGroupId === "" ? NO_GROUP : resourceGroupId}
          onValueChange={(value) => {
            form.setValue("resourceGroupId", value === NO_GROUP ? "" : value, {
              shouldDirty: true,
            })
          }}
        >
          <SelectTrigger id="fn-resource-group" aria-label={t("serverless.form.resourceGroup")}>
            <SelectValue placeholder={t("serverless.form.resourceGroupPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GROUP}>{t("serverless.form.resourceGroupNone")}</SelectItem>
            {(groups ?? []).map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {t("serverless.form.resourceGroupHint")}
        </p>
      </div>

      <div className="space-y-1.5">
        <TagEditor
          rows={tags}
          onChange={(rows) => {
            form.setValue("tags", rows, { shouldDirty: true })
          }}
          label={t("serverless.form.tags")}
        />
        <FieldError message={form.formState.errors.tags?.message} />
      </div>
    </div>
  )
}
