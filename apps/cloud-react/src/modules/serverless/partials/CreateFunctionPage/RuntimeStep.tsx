import { Input, Label, Skeleton } from "@datadack/common-ui"
import { RuntimeCatalog } from "@datadack/serverless"
import { Container } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { SegmentedControl } from "@/components/console"

import { FieldError } from "./FieldError"
import type { FormValues } from "./schema"
import { useServerlessRuntimes } from "../../serverless.hooks"

export function RuntimeStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const { data: runtimes, isLoading, isError } = useServerlessRuntimes()
  const packageType = form.watch("packageType")
  const runtime = form.watch("runtime")
  const architecture = form.watch("architecture")

  const selected = (runtimes ?? []).find((info) => info.name === runtime)
  const architectures = selected?.architectures ?? ["x86_64", "arm64"]
  const handlerRequired = selected?.handlerRequired ?? true

  // A container image carries its own runtime and entrypoint, so this whole
  // step is inapplicable — say so plainly rather than showing a catalog whose
  // selection would be ignored.
  if (packageType === "image") {
    return (
      <div className="border-border/60 flex max-w-lg items-start gap-3 rounded-xl border px-4 py-4">
        <Container className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground text-[13px]">
          Your container image already declares its runtime and entrypoint, so there is nothing to
          choose here. Continue to sizing.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {isLoading && <Skeleton className="h-40 rounded-xl" />}
      {!isLoading && (
        <RuntimeCatalog
          runtimes={runtimes ?? []}
          isLoading={isLoading}
          errored={isError}
          value={runtime}
          hideDeprecated
          onSelect={(info) => {
            form.setValue("runtime", info.name, { shouldValidate: true })
            if (!info.architectures.includes(architecture)) {
              form.setValue("architecture", info.architectures[0] ?? "x86_64")
            }
            if (!info.handlerRequired) {
              form.setValue("handler", "")
            } else if (form.getValues("handler") === "") {
              form.setValue("handler", info.handlerFormat)
            }
          }}
        />
      )}
      <FieldError message={form.formState.errors.runtime?.message} />

      <div className="border-border/60 grid max-w-lg gap-5 rounded-xl border p-4 sm:grid-cols-2">
        {handlerRequired && (
          <div className="space-y-1.5">
            <Label htmlFor="fn-handler">{t("serverless.form.handler")}</Label>
            <Input
              id="fn-handler"
              placeholder={t("serverless.createFunctionPage.indexHandler")}
              className="font-mono"
              aria-invalid={!!form.formState.errors.handler}
              {...form.register("handler")}
            />
            {/* The catalog knows the shape each runtime expects; showing it
                beside the field beats discovering it from a rejected submit. */}
            {selected?.handlerFormat && !form.formState.errors.handler && (
              <p className="text-muted-foreground font-mono text-[11px]">
                {selected.handlerFormat}
              </p>
            )}
            <FieldError message={form.formState.errors.handler?.message} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t("serverless.form.architecture")}</Label>
          <SegmentedControl
            value={architecture}
            onChange={(value) => {
              form.setValue("architecture", value, { shouldValidate: true })
            }}
            options={architectures.map((arch) => ({ value: arch, label: arch }))}
            ariaLabel={t("serverless.form.architecture")}
            showLabels
          />
          <FieldError message={form.formState.errors.architecture?.message} />
        </div>
      </div>
    </div>
  )
}
