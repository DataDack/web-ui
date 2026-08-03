import { useMemo, useState } from "react"

import { type TagRow, tagRowsToRecord } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Zap } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { CreateWizard, PageHeader, type KeyValueItem, type WizardStep } from "@/components/console"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import { useScreen } from "@/services/api/screen"

import { BasicsStep } from "./BasicsStep"
import { PackageStep } from "./PackageStep"
import { RuntimeStep } from "./RuntimeStep"
import { makeSchema, type FormValues } from "./schema"
import { SizingStep } from "./SizingStep"
import { SummaryAside } from "./SummaryAside"
import { SERVERLESS_ROUTES } from "../../serverless.constants"
import {
  useCreateFunction,
  useCreateFunctionFromSource,
  useServerlessRuntimes,
  useUploadArtifact,
} from "../../serverless.hooks"
import { templateForFamily } from "../../serverless.templates"
import type { CreateFunctionRequest } from "../../serverless.types"

/**
 * Create a function: name it, say where the code comes from, pick a runtime,
 * size it.
 *
 * The wizard owns stepping and validation; each step is its own component so
 * that the page here is only the wiring — the form, the catalog-aware schema,
 * and what to POST. A live summary rides alongside every step so the shape of
 * what is being created is visible before the review step rather than only on
 * it.
 *
 * The route sets `handle: { hideSidebar: true }`, so this renders full-bleed
 * with only the topbar for account context.
 */
export function CreateFunctionPage() {
  useScreen("serverless.function-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateFunction()
  const { mutate: createFromSource, isPending: isSourcePending } = useCreateFunctionFromSource()
  const { data: allRuntimes } = useServerlessRuntimes()
  const upload = useUploadArtifact()
  const { rule } = useNamingRule("function")
  // Rebuilt as the catalog arrives, so a runtime's own rules apply the moment
  // they are known rather than only after a rejected submit.
  const schema = useMemo(() => makeSchema(rule, allRuntimes ?? []), [rule, allRuntimes])

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

  const packageLabels = {
    zip: t("serverless.form.zip"),
    image: t("serverless.form.image"),
    blank: t("serverless.form.blank"),
  } as const

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
          const items: KeyValueItem[] = [
            {
              label: t("serverless.form.packageType"),
              value: packageLabels[values.packageType],
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

  // Watched rather than read once, so the aside tracks the form as it is filled
  // in instead of only updating when a step is left.
  const watched = form.watch()
  const selectedRuntime = (allRuntimes ?? []).find((info) => info.name === watched.runtime)

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
        aside={
          <SummaryAside
            name={watched.name}
            packageType={watched.packageType}
            packageLabel={packageLabels[watched.packageType]}
            artifactKey={artifact?.key}
            imageUri={watched.imageUri}
            runtime={watched.runtime}
            handler={watched.handler}
            architecture={watched.architecture}
            memorySize={watched.memorySize}
            timeout={watched.timeout}
            envCount={envRows.filter((row) => row.key.trim() !== "").length}
            selectedRuntime={selectedRuntime}
          />
        }
        onSubmit={(values) => {
          const env = tagRowsToRecord(envRows)
          if (values.packageType === "blank") {
            const family = (allRuntimes ?? []).find((info) => info.name === values.runtime)?.family
            const template = templateForFamily(family)
            // The schema refuses Blank for a family with no inline source, so
            // this is unreachable — but deploying a placeholder that fails at
            // every invoke is worse than not deploying, so it stays a guard.
            if (!template) {
              toast.error(
                `${values.runtime} needs a compiled artifact — upload a .zip or use a container image.`,
              )
              return
            }
            createFromSource(
              {
                name: values.name,
                runtime: values.runtime,
                // Required by POST /functions/source; the schema guarantees the
                // field is filled, and the template's own handler is the
                // fallback for the value it generated.
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
