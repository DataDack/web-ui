import { useMemo, useState } from "react"

import { Input, Label, Skeleton } from "@datadack/common-ui"
import { RuntimeCatalog } from "@datadack/serverless-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Container, FileArchive, Sparkles, UploadCloud, Zap } from "lucide-react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod/v4"

import {
  CreateWizard,
  PageHeader,
  SegmentedControl,
  TagEditor,
  type KeyValueItem,
  type WizardStep,
} from "@/components/console"
import { tagRowsToRecord, type TagRow } from "@/lib/tags"
import { cn } from "@/lib/utils"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import { SERVERLESS_ROUTES } from "../serverless.constants"
import {
  useCreateFunction,
  useCreateFunctionFromSource,
  useServerlessRuntimes,
  useUploadArtifact,
} from "../serverless.hooks"
import { templateForFamily } from "../serverless.templates"
import type { CreateFunctionRequest } from "../serverless.types"

const makeSchema = (rule: NamingRule) =>
  z
    .object({
      name: namingNameSchema(rule),
      packageType: z.enum(["zip", "image", "blank"]),
      imageUri: z.string(),
      runtime: z.string(),
      handler: z.string(),
      architecture: z.string(),
      memorySize: z.number().min(64).max(10240),
      timeout: z.number().min(1).max(900),
    })
    .superRefine((values, ctx) => {
      if (values.packageType === "image" && values.imageUri.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["imageUri"], message: "Image URI is required" })
      }
      if (values.packageType !== "image" && values.runtime === "") {
        ctx.addIssue({ code: "custom", path: ["runtime"], message: "Pick a runtime" })
      }
    })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function CreateFunctionPage() {
  useScreen("serverless.function-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateFunction()
  const { mutate: createFromSource, isPending: isSourcePending } = useCreateFunctionFromSource()
  const { data: allRuntimes } = useServerlessRuntimes()
  const upload = useUploadArtifact()
  const { rule } = useNamingRule("function")
  const schema = useMemo(() => makeSchema(rule), [rule])

  // The archive reference lives outside the form: it is produced by the
  // presigned upload, not typed by the user.
  const [artifact, setArtifact] = useState<{ bucket: string; key: string } | null>(null)
  const [artifactName, setArtifactName] = useState("")
  const [envRows, setEnvRows] = useState<TagRow[]>([{ key: "", value: "" }])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      packageType: "zip",
      imageUri: "",
      runtime: "",
      handler: "",
      architecture: "x86_64",
      memorySize: 128,
      timeout: 3,
    },
    mode: "onTouched",
  })

  const onArchive = (file: File | undefined) => {
    if (!file) return
    setArtifactName(file.name)
    upload.mutate(
      { kind: "functions", file },
      {
        onSuccess: (ref) => {
          setArtifact(ref)
        },
      },
    )
  }

  const steps = useMemo<WizardStep<FormValues>[]>(
    () => [
      {
        id: "basics",
        title: t("serverless.wizard.basics"),
        description: t("serverless.wizard.basicsDescription"),
        fields: ["name"],
        render: (f) => <BasicsStep form={f} />,
        reviewItems: (values) => [
          { label: t("serverless.form.name"), value: values.name, mono: true },
        ],
      },
      {
        id: "package",
        title: t("serverless.wizard.package"),
        description: t("serverless.wizard.packageDescription"),
        fields: ["packageType", "imageUri"],
        render: (f) => (
          <PackageStep
            form={f}
            artifact={artifact}
            artifactName={artifactName}
            uploading={upload.isPending}
            onArchive={onArchive}
          />
        ),
        validate: () => {
          if (form.getValues("packageType") === "zip" && artifact === null) {
            toast.error(t("serverless.form.artifactRequired"))
            return false
          }
          return true
        },
        reviewItems: (values) => {
          const typeLabels = {
            zip: t("serverless.form.zip"),
            image: t("serverless.form.image"),
            blank: t("serverless.form.blank"),
          } as const
          const items: KeyValueItem[] = [
            {
              label: t("serverless.form.packageType"),
              value: typeLabels[values.packageType],
            },
          ]
          if (values.packageType === "image") {
            items.push({
              label: t("serverless.form.imageUri"),
              value: values.imageUri,
              mono: true,
            })
          } else if (values.packageType === "zip") {
            items.push({
              label: t("serverless.form.artifact"),
              value: artifact?.key ?? "—",
              mono: true,
            })
          }
          return items
        },
      },
      {
        id: "runtime",
        title: t("serverless.wizard.runtime"),
        description: t("serverless.wizard.runtimeDescription"),
        fields: ["runtime", "handler", "architecture"],
        render: (f) => <RuntimeStep form={f} />,
        reviewItems: (values) =>
          values.packageType === "image"
            ? []
            : [
                {
                  label: t("serverless.columns.runtime"),
                  value: values.runtime,
                  mono: true,
                },
                {
                  label: t("serverless.form.handler"),
                  value: values.handler || "—",
                  mono: true,
                },
                {
                  label: t("serverless.form.architecture"),
                  value: values.architecture,
                  mono: true,
                },
              ],
      },
      {
        id: "sizing",
        title: t("serverless.wizard.sizing"),
        description: t("serverless.wizard.sizingDescription"),
        fields: ["memorySize", "timeout"],
        render: (f) => <SizingStep form={f} envRows={envRows} setEnvRows={setEnvRows} />,
        reviewItems: (values) => {
          const env = Object.entries(tagRowsToRecord(envRows))
          return [
            {
              label: t("serverless.form.memory"),
              value: `${String(values.memorySize)} MB`,
            },
            { label: t("serverless.form.timeout"), value: `${String(values.timeout)}s` },
            {
              label: t("serverless.form.env"),
              value: env.length > 0 ? env.map(([k]) => k).join(", ") : "—",
              mono: true,
            },
          ]
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, artifact, artifactName, upload.isPending, envRows, form],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        icon={Zap}
        breadcrumbs={[
          { label: t("console.nav.groups.serverless") },
          { label: t("console.nav.items.functions"), to: SERVERLESS_ROUTES.ROOT },
          { label: t("serverless.create") },
        ]}
        title={t("serverless.create")}
        description={t("serverless.createSubtitle")}
      />

      <CreateWizard<FormValues>
        steps={steps}
        form={form}
        submitLabel={t("serverless.wizard.submit")}
        isSubmitting={isPending || isSourcePending || upload.isPending}
        onCancel={() => void navigate(SERVERLESS_ROUTES.ROOT)}
        onSubmit={(values) => {
          const env = tagRowsToRecord(envRows)
          if (values.packageType === "blank") {
            const family = (allRuntimes ?? []).find((info) => info.name === values.runtime)?.family
            const template = templateForFamily(family)
            createFromSource(
              {
                name: values.name,
                runtime: values.runtime,
                handler: values.handler.trim() || template.handler,
                architecture: values.architecture,
                memorySize: values.memorySize,
                timeout: values.timeout,
                env: Object.keys(env).length > 0 ? env : undefined,
                files: template.files,
              },
              {
                onSuccess: () => void navigate(SERVERLESS_ROUTES.detail(values.name)),
              },
            )
            return
          }
          const body: CreateFunctionRequest = {
            name: values.name,
            packageType: values.packageType,
            memorySize: values.memorySize,
            timeout: values.timeout,
          }
          if (values.packageType === "image") {
            body.imageUri = values.imageUri.trim()
          } else if (artifact) {
            body.codeArtifact = artifact
            body.runtime = values.runtime
            body.architecture = values.architecture
            if (values.handler.trim() !== "") body.handler = values.handler.trim()
          }
          if (Object.keys(env).length > 0) body.env = env
          create(body, {
            onSuccess: () => void navigate(SERVERLESS_ROUTES.detail(values.name)),
          })
        }}
      />
    </div>
  )
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

function BasicsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  return (
    <div className="max-w-md space-y-1.5">
      <Label htmlFor="fn-name">
        {t("serverless.form.name")}
        <span className="ml-0.5 text-destructive">*</span>
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
  )
}

function PackageStep({
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
  const packageType = form.watch("packageType")

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>{t("serverless.form.packageType")}</Label>
        <SegmentedControl
          value={packageType}
          onChange={(value) => {
            form.setValue("packageType", value, { shouldValidate: true })
          }}
          options={[
            { value: "zip", label: t("serverless.form.zip"), icon: FileArchive },
            { value: "image", label: t("serverless.form.image"), icon: Container },
            { value: "blank", label: t("serverless.form.blank"), icon: Sparkles },
          ]}
          ariaLabel={t("serverless.form.packageType")}
          showLabels
        />
      </div>

      {packageType === "blank" && (
        <p className="text-muted-foreground max-w-lg text-[13px]">
          {t("serverless.form.blankHint")}
        </p>
      )}

      {packageType === "image" && (
        <div className="max-w-lg space-y-1.5">
          <Label htmlFor="fn-image">
            {t("serverless.form.imageUri")}
            <span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="fn-image"
            placeholder="registry.example.com/my-function:latest"
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
            "border-border hover:border-foreground/30 flex max-w-lg cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition-colors",
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
              <span className="text-muted-foreground">{t("serverless.form.uploadZip")}</span>
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
      )}
    </div>
  )
}

function RuntimeStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const { data: runtimes, isLoading, isError } = useServerlessRuntimes()
  const packageType = form.watch("packageType")
  const runtime = form.watch("runtime")
  const architecture = form.watch("architecture")

  const selected = (runtimes ?? []).find((info) => info.name === runtime)
  const architectures = selected?.architectures ?? ["x86_64", "arm64"]
  const handlerRequired = selected?.handlerRequired ?? true

  if (packageType === "image") {
    return (
      <p className="text-muted-foreground text-[13px]">
        {t("serverless.wizard.runtimeDescription")}
      </p>
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

      <div className="grid max-w-lg gap-5 sm:grid-cols-2">
        {handlerRequired && (
          <div className="space-y-1.5">
            <Label htmlFor="fn-handler">{t("serverless.form.handler")}</Label>
            <Input
              id="fn-handler"
              placeholder="index.handler"
              className="font-mono"
              {...form.register("handler")}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t("serverless.form.architecture")}</Label>
          <SegmentedControl
            value={architecture}
            onChange={(value) => {
              form.setValue("architecture", value)
            }}
            options={architectures.map((arch) => ({ value: arch, label: arch }))}
            ariaLabel={t("serverless.form.architecture")}
            showLabels
          />
        </div>
      </div>
    </div>
  )
}

function SizingStep({
  form,
  envRows,
  setEnvRows,
}: Readonly<{
  form: UseFormReturn<FormValues>
  envRows: TagRow[]
  setEnvRows: (rows: TagRow[]) => void
}>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div className="grid max-w-md grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="fn-memory">{t("serverless.form.memory")}</Label>
          <Input
            id="fn-memory"
            type="number"
            min={64}
            step={64}
            {...form.register("memorySize", { valueAsNumber: true })}
          />
          <FieldError message={form.formState.errors.memorySize?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fn-timeout">{t("serverless.form.timeout")}</Label>
          <Input
            id="fn-timeout"
            type="number"
            min={1}
            {...form.register("timeout", { valueAsNumber: true })}
          />
          <FieldError message={form.formState.errors.timeout?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("serverless.form.env")}</Label>
        <TagEditor rows={envRows} onChange={setEnvRows} />
      </div>
    </div>
  )
}
