import { useMemo } from "react"

import { Input, Label } from "@datadack/common-ui"
import { CodeEditorPlaceholder, familyLabel, RuntimeIcon, type RuntimeInfo } from "@datadack/serverless"
import { Container, Sparkles } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { SegmentedControl, SmartSelect, type SmartSelectOption } from "@/components/console"

import { FieldError } from "./FieldError"
import { PackageOptionCard } from "./PackageOptionCard"
import type { FormValues } from "./schema"
import { useServerlessRuntimes } from "../../serverless.hooks"

/** Same grouping order as the runtime catalog grid this dropdown replaces. */
const FAMILY_ORDER = ["nodejs", "python", "ruby", "java", "dotnet", "provided", "go"]

interface PackageStepProps {
  form: UseFormReturn<FormValues>
}

export function PackageStep({ form }: Readonly<PackageStepProps>) {
  const { t } = useTranslation()
  const packageType = form.watch("packageType")
  const name = form.watch("name")
  const runtime = form.watch("runtime")
  const architecture = form.watch("architecture")
  const { data: runtimes, isLoading, isError } = useServerlessRuntimes()

  const selected = (runtimes ?? []).find((info) => info.name === runtime)
  const architectures = selected?.architectures ?? ["x86_64", "arm64"]
  const handlerRequired = selected?.handlerRequired ?? true

  // A blank starter has no inline source, so a deprecated runtime (never
  // usable for a new function) is left out entirely rather than shown and
  // rejected, and a bundled-RIC runtime (needs its own compiled bootstrap) is
  // shown but disabled — both would otherwise dead-end on this exact step.
  const options = useMemo<SmartSelectOption<RuntimeInfo>[]>(
    () =>
      (runtimes ?? [])
        .filter((info) => !info.deprecatedForCreate)
        .map((info) => ({
          value: info.name,
          item: info,
          searchText: `${info.name} ${info.family} ${info.osRelease}`,
          group: familyLabel(info.family),
          disabled: info.bundledRic,
          disabledReason: info.bundledRic
            ? "Needs a compiled artifact — not available for a blank starter"
            : undefined,
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
            bullets={["Deploys immediately", "Edit the code after", "Interpreted runtimes only"]}
            selected={packageType === "blank"}
            onSelect={() => {
              form.setValue("packageType", "blank", { shouldValidate: true })
            }}
          />
        </div>
      </div>

      {packageType === "blank" && (
        <div className="max-w-2xl space-y-3">
          <p className="text-muted-foreground text-[13px]">{t("serverless.form.blankHint")}</p>
          {/* Same placeholder the function's Code tab uses in serverless-web,
              with copy for this context: here it is showing what the generated
              function will look like once it exists, not an editor that is
              disabled. Name and runtime are whatever has been chosen so far;
              the component mocks the rest. */}
          <CodeEditorPlaceholder
            functionName={name || "my-function"}
            runtime={runtime || undefined}
            title="Editor coming soon"
            message="Your function deploys with a working template for the runtime you pick below. Inline editing isn’t available yet — update the code through the API or CLI."
          />
        </div>
      )}

      {packageType === "image" && (
        <div className="max-w-lg space-y-3">
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
          <div className="max-w-lg space-y-1.5">
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
                if (!info.handlerRequired) {
                  form.setValue("handler", "")
                } else if (form.getValues("handler") === "") {
                  form.setValue("handler", info.handlerFormat)
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
      )}
    </div>
  )
}
