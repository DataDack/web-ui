import { Input, Label } from "@datadack/common-ui"
import { Terminal } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { FieldError } from "./FieldError"
import type { FormValues } from "./schema"

export function BasicsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const name = form.watch("name")

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
    </div>
  )
}
