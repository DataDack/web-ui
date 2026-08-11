import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Zap } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { CreateWizard, PageHeader, type KeyValueItem, type WizardStep } from "@/components/console"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import { useResourceGroup } from "@/modules/resource-groups/resource-group.context"
import { useResourceGroups } from "@/modules/resource-groups/resource-groups.hooks"
import { useScreen } from "@/services/api/screen"

import { BasicsStep } from "./BasicsStep"
import { PackageStep } from "./PackageStep"
import { makeSchema, type FormValues } from "./schema"
import { SummaryAside } from "./SummaryAside"
import { SERVERLESS_ROUTES } from "../../serverless.constants"
import {
  useCreateFunction,
  useCreateFunctionFromSource,
  useServerlessRuntimes,
} from "../../serverless.hooks"
import { templateForFamily } from "../../serverless.templates"
import type { CreateFunctionRequest } from "../../serverless.types"

/**
 * Create a function: name it, say where the code comes from, pick a runtime.
 *
 * Sizing and environment variables are deliberately not asked for. Memory and
 * timeout are created at the platform defaults and every one of those settings
 * is editable on the function's Configuration tab, so making them a step only
 * put three fields nobody changes between the user and a deployed function.
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
/**
 * Editor rows to the record the API takes, dropping rows that say nothing.
 *
 * A blank row is an unfilled one rather than a tag named "", and trimming here
 * means a stray space never becomes part of a key nobody can match on later.
 */
function tagRecord(rows: readonly { key: string; value: string }[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key !== "") out[key] = row.value.trim()
  }
  return out
}

/** The labels field, omitted entirely when there are no tags. */
function labelsFor(rows: readonly { key: string; value: string }[]): { labels?: Record<string, string> } {
  const labels = tagRecord(rows)
  return Object.keys(labels).length > 0 ? { labels } : {}
}

export function CreateFunctionPage() {
  useScreen("serverless.function-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateFunction()
  const { mutate: createFromSource, isPending: isSourcePending } = useCreateFunctionFromSource()
  const { data: allRuntimes } = useServerlessRuntimes()
  const { rule } = useNamingRule("function")
  const { activeRG } = useResourceGroup()
  const { data: groups } = useResourceGroups()
  // Rebuilt as the catalog arrives, so a runtime's own rules apply the moment
  // they are known rather than only after a rejected submit.
  const schema = useMemo(() => makeSchema(rule, allRuntimes ?? []), [rule, allRuntimes])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      // The topbar's active group is the sensible default; the step lets it be
      // changed or cleared before anything is created.
      resourceGroupId: activeRG?.id ?? "",
      tags: [],
      packageType: "blank",
      imageUri: "",
      runtime: "",
      handler: "",
      architecture: "x86_64",
      // No step asks for these any more: creation uses the platform defaults,
      // and both are editable on the function's Configuration tab straight
      // after. They stay in the form so the summary states what is being
      // created and the POST keeps sending explicit values.
      memorySize: 128,
      timeout: 3,
    },
    mode: "onTouched",
  })

  const packageLabels = {
    image: t("serverless.form.image"),
    blank: t("serverless.form.blank"),
  } as const

  const steps = useMemo<WizardStep<FormValues>[]>(
    () => [
      {
        id: "basics",
        title: t("serverless.wizard.basics"),
        description: t("serverless.wizard.basicsDescription"),
        fields: ["name", "resourceGroupId", "tags"],
        render: (f) => <BasicsStep form={f} />,
        reviewItems: (values) => {
          const items: KeyValueItem[] = [
            { label: t("serverless.form.name"), value: values.name, mono: true },
            {
              label: t("serverless.form.resourceGroup"),
              value:
                groups?.find((group) => group.id === values.resourceGroupId)?.name ??
                t("serverless.form.resourceGroupNone"),
            },
          ]
          const tagged = tagRecord(values.tags)
          if (Object.keys(tagged).length > 0) {
            items.push({
              label: t("serverless.form.tags"),
              value: Object.entries(tagged)
                .map(([key, value]) => (value === "" ? key : `${key}=${value}`))
                .join(", "),
              mono: true,
            })
          }
          return items
        },
      },
      {
        id: "package",
        title: t("serverless.wizard.package"),
        description: t("serverless.wizard.packageDescription"),
        fields: ["packageType", "imageUri", "runtime", "handler", "architecture"],
        render: (f) => <PackageStep form={f} />,
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
            return items
          }
          items.push(
            { label: t("serverless.columns.runtime"), value: values.runtime, mono: true },
            { label: t("serverless.form.handler"), value: values.handler || "—", mono: true },
            { label: t("serverless.form.architecture"), value: values.architecture, mono: true },
          )
          return items
        },
      },
    ],
    // groups is a real dependency: the review step resolves the selected id to
    // a name through it, and the list arrives after the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, form, groups],
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
        isSubmitting={isPending || isSourcePending}
        onCancel={() => void navigate(SERVERLESS_ROUTES.ROOT)}
        aside={
          <SummaryAside
            name={watched.name}
            packageType={watched.packageType}
            packageLabel={packageLabels[watched.packageType]}
            imageUri={watched.imageUri}
            runtime={watched.runtime}
            handler={watched.handler}
            architecture={watched.architecture}
            memorySize={watched.memorySize}
            timeout={watched.timeout}
            selectedRuntime={selectedRuntime}
          />
        }
        onSubmit={(values) => {
          if (values.packageType === "blank") {
            const family = (allRuntimes ?? []).find((info) => info.name === values.runtime)?.family
            const template = templateForFamily(family)
            // The schema refuses Blank for a family with no inline source, so
            // this is unreachable — but deploying a placeholder that fails at
            // every invoke is worse than not deploying, so it stays a guard.
            if (!template) {
              toast.error(`${values.runtime} needs a compiled artifact — use a container image instead.`)
              return
            }
            createFromSource(
              {
                name: values.name,
                ...(values.resourceGroupId ? { resourceGroupId: values.resourceGroupId } : {}),
                ...labelsFor(values.tags),
                runtime: values.runtime,
                // Required by POST /functions/source; the schema guarantees the
                // field is filled, and the template's own handler is the
                // fallback for the value it generated.
                handler: values.handler.trim() || template.handler,
                architecture: values.architecture,
                memorySize: values.memorySize,
                timeout: values.timeout,
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
            ...(values.resourceGroupId ? { resourceGroupId: values.resourceGroupId } : {}),
            ...labelsFor(values.tags),
            packageType: "image",
            imageUri: values.imageUri.trim(),
            memorySize: values.memorySize,
            timeout: values.timeout,
          }
          create(body, {
            onSuccess: () => void navigate(SERVERLESS_ROUTES.detail(values.name)),
          })
        }}
      />
    </div>
  )
}
