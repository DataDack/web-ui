import { useMemo, useState } from "react"

import { Badge, Input, Label } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Layers, UploadCloud } from "lucide-react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod/v4"

import { CreateWizard, PageHeader, type WizardStep } from "@/components/console"
import { cn } from "@/lib/utils"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import { SERVERLESS_ROUTES } from "../serverless.constants"
import { usePublishLayer, useServerlessRuntimes, useUploadArtifact } from "../serverless.hooks"

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    description: z.string().max(500, "Maximum 500 characters"),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function PublishLayerPage() {
  useScreen("serverless.layer-publish-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: publish, isPending } = usePublishLayer()
  const upload = useUploadArtifact()
  const { data: runtimes } = useServerlessRuntimes()
  const { rule } = useNamingRule("layer")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const [artifact, setArtifact] = useState<{ bucket: string; key: string } | null>(null)
  const [artifactName, setArtifactName] = useState("")
  const [compatible, setCompatible] = useState<string[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
    mode: "onTouched",
  })

  const onArchive = (file: File | undefined) => {
    if (!file) return
    setArtifactName(file.name)
    upload.mutate(
      { kind: "layers", file },
      {
        onSuccess: (ref) => {
          setArtifact(ref)
        },
      },
    )
  }

  const runtimeNames = useMemo(
    () => [...new Set((runtimes ?? []).map((info) => info.name))],
    [runtimes],
  )

  const steps = useMemo<WizardStep<FormValues>[]>(
    () => [
      {
        id: "layer",
        title: t("serverless.wizard.layer"),
        description: t("serverless.wizard.layerDescription"),
        fields: ["name", "description"],
        render: (f) => (
          <LayerStep
            form={f}
            artifact={artifact}
            artifactName={artifactName}
            uploading={upload.isPending}
            onArchive={onArchive}
          />
        ),
        validate: () => {
          if (artifact === null) {
            toast.error(t("serverless.form.artifactRequired"))
            return false
          }
          return true
        },
        reviewItems: (values) => [
          { label: t("serverless.form.layerName"), value: values.name, mono: true },
          {
            label: t("serverless.form.layerDescription"),
            value: values.description || "—",
          },
          {
            label: t("serverless.form.artifact"),
            value: artifact?.key ?? "—",
            mono: true,
          },
        ],
      },
      {
        id: "compatibility",
        title: t("serverless.wizard.compatibility"),
        description: t("serverless.wizard.compatibilityDescription"),
        fields: [],
        render: () => (
          <RuntimeChips
            runtimeNames={runtimeNames}
            compatible={compatible}
            onToggle={setCompatible}
          />
        ),
        reviewItems: () => [
          {
            label: t("serverless.columns.compatibleRuntimes"),
            value:
              compatible.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {compatible.map((rt) => (
                    <Badge key={rt} variant="secondary" className="font-mono text-[10px]">
                      {rt}
                    </Badge>
                  ))}
                </span>
              ) : (
                "—"
              ),
          },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, artifact, artifactName, upload.isPending, compatible, runtimeNames],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        icon={Layers}
        breadcrumbs={[
          { label: t("console.nav.groups.serverless") },
          { label: t("console.nav.items.layers"), to: SERVERLESS_ROUTES.LAYERS },
          { label: t("serverless.layers.publish") },
        ]}
        title={t("serverless.layers.publish")}
        description={t("serverless.layers.publishSubtitle")}
      />

      <CreateWizard<FormValues>
        steps={steps}
        form={form}
        submitLabel={t("serverless.wizard.layerSubmit")}
        isSubmitting={isPending || upload.isPending}
        onCancel={() => void navigate(SERVERLESS_ROUTES.LAYERS)}
        onSubmit={(values) => {
          if (!artifact) return
          publish(
            {
              name: values.name,
              description: values.description.trim() === "" ? undefined : values.description.trim(),
              codeArtifact: artifact,
              compatibleRuntimes: compatible.length > 0 ? compatible : undefined,
            },
            { onSuccess: () => void navigate(SERVERLESS_ROUTES.LAYERS) },
          )
        }}
      />
    </div>
  )
}

function RuntimeChips({
  runtimeNames,
  compatible,
  onToggle,
}: Readonly<{
  runtimeNames: string[]
  compatible: string[]
  onToggle: (next: string[]) => void
}>) {
  return (
    <div className="flex max-w-2xl flex-wrap gap-2">
      {runtimeNames.map((rt) => {
        const active = compatible.includes(rt)
        return (
          <button
            key={rt}
            type="button"
            onClick={() => {
              onToggle(active ? compatible.filter((r) => r !== rt) : [...compatible, rt])
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[12px] transition-colors",
              active
                ? "border-foreground/40 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {rt}
          </button>
        )
      })}
      {runtimeNames.length === 0 && <span className="text-muted-foreground text-[13px]">—</span>}
    </div>
  )
}

function LayerStep({
  form,
  artifact,
  artifactName,
  uploading,
  onArchive,
}: Readonly<{
  form: UseFormReturn<FormValues>
  artifact: { bucket: string; key: string } | null
  artifactName: string
  uploading: boolean
  onArchive: (file: File | undefined) => void
}>) {
  const { t } = useTranslation()
  return (
    <div className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="layer-name">
          {t("serverless.form.layerName")}
          <span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Input
          id="layer-name"
          placeholder="shared-deps"
          className="font-mono"
          aria-invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
        {form.formState.errors.name?.message && (
          <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="layer-desc">{t("serverless.form.layerDescription")}</Label>
        <Input id="layer-desc" {...form.register("description")} />
      </div>

      <label
        className={cn(
          "border-border hover:border-foreground/30 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition-colors",
          artifact && "border-status-success/40",
        )}
      >
        <UploadCloud className="text-muted-foreground size-5 shrink-0" />
        <div className="min-w-0 text-sm">
          {uploading && <span>{t("serverless.form.uploading", { name: artifactName })}</span>}
          {!uploading && artifact && (
            <span className="font-mono text-[13px]">
              {artifactName} → {artifact.key}
            </span>
          )}
          {!uploading && !artifact && (
            <span className="text-muted-foreground">{t("serverless.form.uploadLayerZip")}</span>
          )}
        </div>
        <input
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            onArchive(e.target.files?.[0])
          }}
        />
      </label>
    </div>
  )
}
