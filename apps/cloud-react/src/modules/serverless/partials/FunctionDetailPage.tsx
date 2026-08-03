import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Skeleton,
  StatusBadge,
  Textarea,
  textColumn,
} from "@datadack/common-ui"
import { CodeEditorPlaceholder, MonitoringPlaceholder } from "@datadack/serverless"
import type { ColumnDef } from "@tanstack/react-table"
import { Activity, Code2, GitBranch, History, Play, Settings2, Trash2, Zap } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import {
  ConfirmDialog,
  DetailPage,
  KeyValueGrid,
  Section,
  type DetailTab,
} from "@/components/console"
import { useScreen } from "@/services/api/screen"


import { SERVERLESS_ROUTES } from "../serverless.constants"
import {
  useDeleteAlias,
  useDeleteFunction,
  useFunctionAliases,
  useFunctionVersions,
  useInvokeFunction,
  usePutAlias,
  useServerlessFunction,
} from "../serverless.hooks"
import type { FunctionAlias, FunctionVersion } from "../serverless.types"

export function ServerlessFunctionDetailPage() {
  useScreen("serverless.function-detail")
  const { t } = useTranslation()
  const { name = "" } = useParams()
  const navigate = useNavigate()
  const { data: fn, isLoading } = useServerlessFunction(name)
  const { mutate: deleteFunction, isPending: isDeleting } = useDeleteFunction()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (!fn) {
    return (
      <EmptyState
        icon={Zap}
        title={name}
        description={t("serverless.emptyHint")}
        action={{
          label: t("serverless.title"),
          onClick: () => void navigate(SERVERLESS_ROUTES.ROOT),
        }}
      />
    )
  }

  const tabs: DetailTab[] = [
    {
      value: "code",
      label: t("serverless.tabs.code"),
      icon: Code2,
      // Shared with serverless-web's Code tab: same placeholder, same copy.
      content: <CodeEditorPlaceholder functionName={fn.name} runtime={fn.runtime} />,
    },
    {
      value: "monitor",
      label: t("serverless.tabs.monitor"),
      icon: Activity,
      // Shared with serverless-web: same placeholder component, same copy.
      content: <MonitoringPlaceholder functionName={fn.name} />,
    },
    {
      value: "configuration",
      label: t("serverless.tabs.configuration"),
      icon: Settings2,
      content: (
        <Section variant="panel" title={t("serverless.tabs.configuration")}>
          <KeyValueGrid
            items={[
              { label: t("serverless.form.packageType"), value: fn.packageType, mono: true },
              { label: t("serverless.columns.runtime"), value: fn.runtime, mono: true },
              { label: t("serverless.form.handler"), value: fn.handler, mono: true },
              {
                label: t("serverless.form.architecture"),
                value: fn.architecture,
                mono: true,
              },
              {
                label: t("serverless.columns.memory"),
                value: fn.memorySize ? `${String(fn.memorySize)} MB` : undefined,
              },
              {
                label: t("serverless.form.timeout"),
                value: fn.timeout ? `${String(fn.timeout)}s` : undefined,
              },
              { label: "URI", value: fn.imageUri, mono: true, copyable: !!fn.imageUri },
              {
                label: t("serverless.layers.title"),
                value: fn.layers?.length
                  ? fn.layers.map((layer) => `${layer.name}:${String(layer.version)}`).join(", ")
                  : undefined,
                mono: true,
              },
            ]}
          />
        </Section>
      ),
    },
    {
      value: "versions",
      label: t("serverless.tabs.versions"),
      icon: History,
      content: <FunctionVersions name={fn.name} />,
    },
    {
      value: "aliases",
      label: t("serverless.tabs.aliases"),
      icon: GitBranch,
      content: <FunctionAliases name={fn.name} />,
    },
    {
      value: "test",
      label: t("serverless.tabs.test"),
      icon: Play,
      content: <InvokeTester name={fn.name} />,
    },
  ]

  return (
    <>
      <DetailPage
        backTo={SERVERLESS_ROUTES.ROOT}
        backLabel={t("serverless.title")}
        icon={Zap}
        title={fn.name}
        status={fn.state}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setConfirmingDelete(true)
            }}
          >
            <Trash2 className="size-3.5" />
            {t("serverless.actions.delete")}
          </Button>
        }
        tabs={tabs}
        layoutId="serverless-function-tabs"
      />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t("serverless.actions.deleteConfirmTitle", { name: fn.name })}
        description={t("serverless.actions.deleteConfirmBody")}
        confirmLabel={t("serverless.actions.deleteConfirmLabel")}
        confirmText={fn.name}
        destructive
        loading={isDeleting}
        onConfirm={() => {
          deleteFunction(fn.name, {
            onSuccess: () => void navigate(SERVERLESS_ROUTES.ROOT),
          })
        }}
      />
    </>
  )
}

function FunctionVersions({ name }: Readonly<{ name: string }>) {
  const { t } = useTranslation()
  const { data, isLoading } = useFunctionVersions(name)
  const columns = useMemo<ColumnDef<FunctionVersion>[]>(
    () => [
      {
        id: "version",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("serverless.columns.version")}
          </span>
        ),
        accessorFn: (v) => v.version,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            v{row.original.version}
          </Badge>
        ),
      },
      textColumn<FunctionVersion>({
        id: "sha",
        header: t("serverless.columns.codeSha"),
        accessor: (v) => v.codeSha256?.slice(0, 16),
        mono: true,
        muted: true,
      }),
      textColumn<FunctionVersion>({
        id: "published",
        header: t("serverless.columns.published"),
        accessor: (v) => v.createdAt,
        muted: true,
        responsive: "md",
      }),
    ],
    [t],
  )
  return (
    <DataTable<FunctionVersion>
      data={data ?? []}
      columns={columns}
      loading={isLoading}
      getRowId={(v) => v.version}
    />
  )
}

function FunctionAliases({ name }: Readonly<{ name: string }>) {
  const { t } = useTranslation()
  const { data, isLoading } = useFunctionAliases(name)
  const putAlias = usePutAlias(name)
  const { mutate: removeAlias } = useDeleteAlias(name)
  const [aliasName, setAliasName] = useState("")
  const [aliasVersion, setAliasVersion] = useState("")

  const columns = useMemo<ColumnDef<FunctionAlias>[]>(
    () => [
      textColumn<FunctionAlias>({
        id: "alias",
        header: t("serverless.columns.alias"),
        accessor: (a) => a.name,
        mono: true,
      }),
      {
        id: "version",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("serverless.columns.version")}
          </span>
        ),
        accessorFn: (a) => a.functionVersion,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            v{row.original.functionVersion}
          </Badge>
        ),
      },
      textColumn<FunctionAlias>({
        id: "canary",
        header: t("serverless.columns.canary"),
        accessor: (a) => {
          const weights = a.additionalVersionWeights
          if (!weights || Object.keys(weights).length === 0) return null
          return Object.entries(weights)
            .map(([version, weight]) => `v${version}: ${String(weight)}%`)
            .join(", ")
        },
        mono: true,
        muted: true,
        responsive: "md",
      }),
      textColumn<FunctionAlias>({
        id: "description",
        header: t("serverless.columns.description"),
        accessor: (a) => a.description,
        muted: true,
        responsive: "lg",
      }),
      actionsColumn<FunctionAlias>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("serverless.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (alias: FunctionAlias) => {
              removeAlias(alias.name)
            },
          },
        ],
      }),
    ],
    [removeAlias, t],
  )

  const canAdd = aliasName.trim() !== "" && aliasVersion.trim() !== ""

  return (
    <div className="space-y-3">
      {/* Point a stable name (prod, staging) at a published version. */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={aliasName}
          onChange={(e) => {
            setAliasName(e.target.value)
          }}
          placeholder="prod"
          className="h-8 max-w-44 font-mono text-[13px]"
        />
        <Input
          value={aliasVersion}
          onChange={(e) => {
            setAliasVersion(e.target.value)
          }}
          placeholder="1"
          className="h-8 max-w-28 font-mono text-[13px]"
        />
        <Button
          size="sm"
          disabled={!canAdd || putAlias.isPending}
          onClick={() => {
            putAlias.mutate(
              { name: aliasName.trim(), functionVersion: aliasVersion.trim() },
              {
                onSuccess: () => {
                  setAliasName("")
                  setAliasVersion("")
                },
              },
            )
          }}
          loading={putAlias.isPending}
        >
          {t("common.add", { defaultValue: "Add" })}
        </Button>
      </div>

      <DataTable<FunctionAlias>
        data={data ?? []}
        columns={columns}
        loading={isLoading}
        getRowId={(alias) => alias.name}
      />
    </div>
  )
}

function InvokeTester({ name }: Readonly<{ name: string }>) {
  const { t } = useTranslation()
  const invoke = useInvokeFunction(name)
  const [payload, setPayload] = useState('{\n  "hello": "world"\n}')
  const result = invoke.data

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section variant="panel" title={t("serverless.invoke.payload")}>
        <Textarea
          value={payload}
          onChange={(e) => {
            setPayload(e.target.value)
          }}
          spellCheck={false}
          rows={12}
          className="font-mono text-[13px]"
        />
        <Button
          className="mt-3 gap-2"
          disabled={invoke.isPending}
          onClick={() => {
            invoke.mutate(payload)
          }}
          loading={invoke.isPending}
        >
          <Play className="size-3.5" />
          {invoke.isPending ? t("serverless.invoke.running") : t("serverless.invoke.run")}
        </Button>
      </Section>

      <Section variant="panel" title={t("serverless.invoke.response")}>
        {!result && !invoke.isPending && (
          <p className="text-muted-foreground text-[13px]">{t("serverless.invoke.hint")}</p>
        )}
        {invoke.isPending && <Skeleton className="h-32 rounded-lg" />}
        {!invoke.isPending && result && (
          <>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status={result.status < 400 ? "active" : "error"} />
              <span className="text-muted-foreground font-mono text-[12px]">
                HTTP {result.status} · {String(result.durationMs)} ms
              </span>
            </div>
            <pre className="border-border max-h-80 overflow-auto rounded-lg border p-3 font-mono text-[12px] whitespace-pre-wrap">
              {result.body || t("serverless.invoke.empty")}
            </pre>
          </>
        )}
      </Section>
    </div>
  )
}
