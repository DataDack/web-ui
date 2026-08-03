import { Input, Label, type TagRow } from "@datadack/common-ui"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { TagEditor } from "@/components/console"

import { FieldError } from "./FieldError"
import type { FormValues } from "./schema"

interface SizingStepProps {
  form: UseFormReturn<FormValues>
  envRows: TagRow[]
  setEnvRows: (rows: TagRow[]) => void
}

/** Memory steps the platform bills on; anything between them rounds up anyway. */
const MEMORY_PRESETS = [128, 256, 512, 1024, 2048]

export function SizingStep({ form, envRows, setEnvRows }: Readonly<SizingStepProps>) {
  const { t } = useTranslation()
  const memorySize = form.watch("memorySize")

  return (
    <div className="space-y-6">
      <div className="border-border/60 grid max-w-lg gap-5 rounded-xl border p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fn-memory">{t("serverless.form.memory")}</Label>
          <Input
            id="fn-memory"
            type="number"
            min={64}
            step={64}
            aria-invalid={!!form.formState.errors.memorySize}
            {...form.register("memorySize", { valueAsNumber: true })}
          />
          {/* Typing 128 is fine; most people just want a common size, and the
              presets make the useful range visible instead of guessed at. */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {MEMORY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  form.setValue("memorySize", preset, { shouldValidate: true })
                }}
                className={
                  memorySize === preset
                    ? "border-brand-gold/60 bg-brand-gold-soft text-brand-gold rounded-md border px-1.5 py-0.5 font-mono text-[11px]"
                    : "border-border/60 text-muted-foreground hover:border-brand-gold/40 hover:text-foreground rounded-md border px-1.5 py-0.5 font-mono text-[11px] transition-colors"
                }
              >
                {preset}
              </button>
            ))}
          </div>
          <FieldError message={form.formState.errors.memorySize?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fn-timeout">{t("serverless.form.timeout")}</Label>
          <Input
            id="fn-timeout"
            type="number"
            min={1}
            aria-invalid={!!form.formState.errors.timeout}
            {...form.register("timeout", { valueAsNumber: true })}
          />
          <p className="text-muted-foreground text-[11px]">Up to 900s (15 minutes).</p>
          <FieldError message={form.formState.errors.timeout?.message} />
        </div>
      </div>

      <div className="max-w-lg space-y-1.5">
        <Label>{t("serverless.form.env")}</Label>
        <TagEditor rows={envRows} onChange={setEnvRows} />
      </div>
    </div>
  )
}
