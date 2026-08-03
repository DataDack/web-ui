import { Input, Label } from "@datadack/common-ui"
import { CodeEditorPlaceholder } from "@datadack/serverless"
import { CheckCircle2, Container, FileArchive, Loader2, Sparkles, UploadCloud } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import { FieldError } from "./FieldError"
import { PackageOptionCard } from "./PackageOptionCard"
import type { FormValues } from "./schema"

/** The dropzone's three states, kept out of the JSX so it stays one flat read. */
function DropzoneIcon({
  uploading,
  uploaded,
}: Readonly<{ uploading: boolean; uploaded: boolean }>) {
  if (uploading) return <Loader2 className="text-muted-foreground size-6 animate-spin" />
  if (uploaded) return <CheckCircle2 className="text-status-success size-6" />
  return (
    <UploadCloud className="text-muted-foreground group-hover:text-brand-gold size-6 transition-colors" />
  )
}

interface PackageStepProps {
  form: UseFormReturn<FormValues>
  artifact: { bucket: string; key: string } | null
  artifactName: string
  uploading: boolean
  onArchive: (file: File | undefined) => void
}

export function PackageStep({
  form,
  artifact,
  artifactName,
  uploading,
  onArchive,
}: Readonly<PackageStepProps>) {
  const { t } = useTranslation()
  const packageType = form.watch("packageType")
  const name = form.watch("name")
  const runtime = form.watch("runtime")

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>{t("serverless.form.packageType")}</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <PackageOptionCard
            icon={<FileArchive className="size-5" />}
            title={t("serverless.form.zip")}
            subtitle="Code you have already built"
            bullets={["Upload a .zip", "Any supported runtime", "Up to 250 MB unzipped"]}
            selected={packageType === "zip"}
            onSelect={() => {
              form.setValue("packageType", "zip", { shouldValidate: true })
            }}
          />
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
            message="Your function deploys with a working template for the runtime you pick next. Inline editing isn’t available yet — update the code through the API or CLI."
          />
        </div>
      )}

      {packageType === "image" && (
        <div className="max-w-lg space-y-1.5">
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
      )}

      {packageType === "zip" && (
        <label
          className={cn(
            "group flex max-w-lg cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
            artifact
              ? "border-status-success/40 bg-status-success/5"
              : "border-border hover:border-brand-gold/50 hover:bg-brand-gold-soft/40",
          )}
        >
          <DropzoneIcon uploading={uploading} uploaded={artifact !== null} />

          <span className="min-w-0 text-sm">
            {uploading && <span>{t("serverless.form.uploading", { name: artifactName })}</span>}
            {!uploading && artifact && (
              <span className="font-mono text-[13px] break-all">{artifactName}</span>
            )}
            {!uploading && !artifact && (
              <span className="text-muted-foreground">{t("serverless.form.uploadZip")}</span>
            )}
          </span>

          {!uploading && artifact && (
            <span className="text-muted-foreground font-mono text-[11px] break-all">
              {artifact.key}
            </span>
          )}
          {!uploading && !artifact && (
            <span className="text-muted-foreground text-[11px]">.zip up to 250 MB unzipped</span>
          )}

          <input
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              onArchive(e.target.files?.[0])
            }}
          />
        </label>
      )}
    </div>
  )
}
