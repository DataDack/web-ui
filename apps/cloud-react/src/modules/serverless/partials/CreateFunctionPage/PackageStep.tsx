import { useMemo } from "react"

import { Container, Sparkles } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { SegmentedControl, SmartSelect, type SmartSelectOption } from "@/components/console"

import { Input, Label } from "@datadack/common-ui"
import { familyLabel, RuntimeIcon, useRuntimes, type RuntimeInfo } from "@datadack/serverless"

import { FieldError } from "./FieldError"
import { PackageOptionCard } from "./PackageOptionCard"
import type { FormValues } from "./schema"
import { templateForFamily } from "../../serverless.templates"

/** Same grouping order as the runtime catalog grid this dropdown replaces. */
const FAMILY_ORDER = ["nodejs", "python", "ruby", "java", "dotnet", "provided", "go"]

interface PackageStepProps {
  form: UseFormReturn<FormValues>
}

export function PackageStep({ form }: Readonly<PackageStepProps>) {
  const { t } = useTranslation()
  const packageType = form.watch("packageType")
  const runtime = form.watch("runtime")
  const architecture = form.watch("architecture")
  const { data: runtimes, isLoading, isError } = useRuntimes()

  const selected = (runtimes ?? []).find((info) => info.name === runtime)
  const architectures = selected?.architectures ?? ["x86_64", "arm64"]
  const handlerRequired = selected?.handlerRequired ?? true

  // Every runtime is selectable — each family has starter source now. A
  // deprecated runtime is the one exception and is left out entirely rather
  // than shown and rejected: it can never be used for a new function, so
  // offering it only dead-ends on this step.
  const options = useMemo<SmartSelectOption<RuntimeInfo>[]>(
    () =>
      (runtimes ?? [])
        .filter((info) => !info.deprecatedForCreate)
        .map((info) => ({
          value: info.name,
          item: info,
          searchText: `${info.name} ${info.family} ${info.osRelease}`,
          group: familyLabel(info.family),
        })),
    [runtimes],
  )

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>{t("serverless.form.packageType")}</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <PackageOptionCard
            icon={<Container className="size-5" />}
            title={t("serverless.form.image")}
            subtitle="Bring your own container"
            bullets={["Any registry", "Carries its own runtime", "No handler needed"]}
            selected={packageType === "image"}
            onSelect={() => {
              form.setValue("packageType", "image", { shouldValidate: true })
            }}
          />
          <PackageOptionCard
            icon={<Sparkles className="size-5" />}
            title={t("serverless.form.blank")}
            subtitle="Start from a template"
            bullets={["Deploys immediately", "Edit the code after", "Any runtime"]}
            selected={packageType === "blank"}
            onSelect={() => {
              form.setValue("packageType", "blank", { shouldValidate: true })
            }}
          />
        </div>
      </div>

      {packageType === "image" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fn-image">
              {t("serverless.form.imageUri")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="fn-image"
              placeholder={t("serverless.createFunctionPage.registryExampleComMyFunctionLatest")}
              className="font-mono"
              aria-invalid={!!form.formState.errors.imageUri}
              {...form.register("imageUri")}
            />
            <FieldError message={form.formState.errors.imageUri?.message} />
          </div>

          <div className="border-border/60 flex items-start gap-3 rounded-xl border px-4 py-4">
            <Container className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-[13px]">
              Your container image already declares its runtime and entrypoint, so there is nothing
              to choose here.
            </p>
          </div>
        </div>
      )}

      {packageType !== "image" && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="fn-runtime">{t("serverless.columns.runtime")}</Label>
            <SmartSelect<RuntimeInfo>
              id="fn-runtime"
              ariaLabel={t("serverless.columns.runtime")}
              options={options}
              value={runtime || undefined}
              loading={isLoading}
              error={isError}
              invalid={!!form.formState.errors.runtime}
              placeholder="Select a runtime…"
              searchPlaceholder="Search runtimes…"
              groupOrder={FAMILY_ORDER.map(familyLabel)}
              onValueChange={(_next, info) => {
                form.setValue("runtime", info.name, { shouldValidate: true })
                if (!info.architectures.includes(architecture)) {
                  form.setValue("architecture", info.architectures[0] ?? "x86_64")
                }
                // The handler input is hidden for a blank starter, so this is
                // the only place the value is ever set. It must name a symbol
                // the generated template actually exports: handlerFormat is
                // prose describing the shape ("file.exportedFunction"), which
                // passes the control plane's pattern check and then fails at
                // every invoke because no such file is in the package.
                const starter = templateForFamily(info.family)
                if (!info.handlerRequired) {
                  form.setValue("handler", "")
                } else {
                  form.setValue("handler", starter?.handler ?? info.handlerFormat)
                }
              }}
              renderRow={(option) => ({
                leading: <RuntimeIcon family={option.item.family} />,
                primary: option.item.name,
                secondary: option.item.languageVersion
                  ? `${familyLabel(option.item.family)} ${option.item.languageVersion} · ${option.item.osRelease}`
                  : option.item.osRelease,
                trailing: (
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {option.item.architectures.join(" · ")}
                  </span>
                ),
              })}
            />
            <FieldError message={form.formState.errors.runtime?.message} />
          </div>

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
          {/* The handler input itself is hidden — handlerRequired still drives
              validation (schema.ts), just off a value this step sets for the
              runtime rather than one the user types. */}
          <FieldError
            message={handlerRequired ? form.formState.errors.handler?.message : undefined}
          />

          {/* Blank is the only package left once image is ruled out. No editor
              preview here — the function's own Code tab is a real editor now,
              so a mock of one on the way in is only noise. */}
          <p className="text-muted-foreground text-[13px]">{t("serverless.form.blankHint")}</p>
        </div>
      )}
    </div>
  )
}
