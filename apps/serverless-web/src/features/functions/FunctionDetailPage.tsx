import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Code2, Container, GitBranch, History, Package, Settings2 } from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import { http } from "@/lib/api"
import { useDashboard } from "@/lib/queries"
import { functionVersionSchema, type FunctionEntity } from "@/lib/schemas"

import {
  Badge,
  Button,
  EmptyState,
  KeyValueGrid,
  Skeleton,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  timeAgo,
} from "@datadack/common-ui"
import { CodeEditorPlaceholder } from "@datadack/serverless-ui"
const TABS = [
  { value: "code", label: "Code", icon: Code2 },
  { value: "configuration", label: "Configuration", icon: Settings2 },
  { value: "versions", label: "Versions", icon: History },
  { value: "aliases", label: "Aliases", icon: GitBranch },
]

/**
 * A function's home, laid out like Lambda's: identity and status in the header,
 * everything else behind tabs — with the code editor as the first of them.
 */
export function FunctionDetailPage() {
  const { name = "" } = useParams()
  const { data, isLoading } = useDashboard()
  const fn = data?.detail.functions.find((candidate) => candidate.name === name)

  // The active tab lives in the URL, so a specific tab is linkable and survives
  // a reload.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get("tab") ?? "code"
  const activeTab = TABS.some((tab) => tab.value === requested) ? requested : "code"

  if (isLoading && !fn) {
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
      <>
        <BackLink />
        <EmptyState
          icon={Package}
          title={`No function named ${name}`}
          description="It may have been deleted, or it belongs to another account."
        />
      </>
    )
  }

  const isImage = fn.packageType === "image"

  return (
    <>
      <BackLink />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="glass-1 flex size-10 shrink-0 items-center justify-center rounded-xl">
              {isImage ? (
                <Container className="text-muted-foreground size-4.5" />
              ) : (
                <Package className="text-muted-foreground size-4.5" />
              )}
            </div>
            <h1 className="truncate font-mono text-xl font-bold tracking-tight">{fn.name}</h1>
            <StatusBadge status={fn.state} pulse={fn.state.toLowerCase() === "active"} />
            <Badge variant="outline" className="font-mono text-[11px]">
              {fn.runtime ?? fn.packageType}
            </Badge>
          </div>
          {fn.functionArn && (
            <p className="text-muted-foreground mt-1.5 truncate font-mono text-[11px]">
              {fn.functionArn}
            </p>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(next) => {
          setSearchParams(
            (prev) => {
              const params = new URLSearchParams(prev)
              if (next === "code") params.delete("tab")
              else params.set("tab", next)
              return params
            },
            { replace: true },
          )
        }}
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="code">
          <CodeTab fn={fn} />
        </TabsContent>
        <TabsContent value="configuration">
          <ConfigurationTab fn={fn} />
        </TabsContent>
        <TabsContent value="versions">
          <VersionsTab functionName={fn.name} />
        </TabsContent>
        <TabsContent value="aliases">
          <AliasesTab functionName={fn.name} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-3 gap-1.5">
      <Link to="/functions">
        <ArrowLeft className="size-3.5" />
        Functions
      </Link>
    </Button>
  )
}

/** Inline code editing is not built yet — the tab stays, the editor does not. */
function CodeTab({ fn }: Readonly<{ fn: FunctionEntity }>) {
  return (
    <CodeEditorPlaceholder
      functionName={fn.name}
      runtime={fn.runtime}
      sizeBytes={fn.version?.codeArtifact?.sizeBytes}
      version={fn.version?.version}
    />
  )
}

function ConfigurationTab({ fn }: Readonly<{ fn: FunctionEntity }>) {
  const env = Object.entries(fn.env ?? {})
  return (
    <div className="space-y-6">
      <section className="glass-2 rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold">General</h3>
        <KeyValueGrid
          items={[
            { label: "Runtime", value: fn.runtime ?? fn.runtimeMode, mono: true },
            { label: "Handler", value: fn.handler, mono: true },
            { label: "Architecture", value: fn.architecture, mono: true },
            {
              label: "Memory",
              value: fn.memorySize ? `${String(fn.memorySize)} MB` : undefined,
              mono: true,
            },
            {
              label: "Timeout",
              value: fn.timeout ? `${String(fn.timeout)}s` : undefined,
              mono: true,
            },
            { label: "Package type", value: fn.packageType, mono: true },
            { label: "Namespace", value: fn.namespace, mono: true },
            { label: "Region", value: fn.region, mono: true },
            { label: "Last modified", value: timeAgo(fn.updatedAt), mono: true },
          ]}
        />
      </section>

      {fn.imageUri && (
        <section className="glass-2 rounded-xl p-5">
          <h3 className="mb-4 text-sm font-semibold">Container image</h3>
          <code className="text-[13px] break-all">{fn.imageUri}</code>
        </section>
      )}

      <section className="glass-2 rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold">Environment variables</h3>
        {env.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">None set.</p>
        ) : (
          <KeyValueGrid items={env.map(([key, value]) => ({ label: key, value, mono: true }))} />
        )}
      </section>
    </div>
  )
}

function VersionsTab({ functionName }: Readonly<{ functionName: string }>) {
  const { data, isLoading } = useQuery({
    queryKey: ["function-versions", functionName],
    queryFn: async () => {
      const { data: body } = await http.get<{ versions?: unknown[] }>(
        `/v1/functions/${encodeURIComponent(functionName)}/versions`,
      )
      return (body.versions ?? []).map((raw) => functionVersionSchema.parse(raw))
    },
  })

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />
  if (!data || data.length === 0) {
    return <EmptyState icon={History} title="No versions" />
  }

  return (
    <div className="glass-2 overflow-hidden rounded-xl">
      <ul className="divide-border/60 divide-y">
        {[...data].reverse().map((version) => (
          <li key={version.version} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Badge variant="outline" className="font-mono text-[11px]">
              v{version.version}
            </Badge>
            <span className="text-muted-foreground font-mono text-[11px]">
              {version.codeSha256?.slice(0, 12) ?? "—"}
            </span>
            {version.codeArtifact?.source && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {version.codeArtifact.source}
              </Badge>
            )}
            <span className="text-muted-foreground ml-auto font-mono text-[11px]">
              {timeAgo(version.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AliasesTab({ functionName }: Readonly<{ functionName: string }>) {
  const { data, isLoading } = useQuery({
    queryKey: ["function-aliases", functionName],
    queryFn: async () => {
      const { data: body } = await http.get<{
        aliases?: { name: string; functionVersion: string }[]
      }>(`/v1/functions/${encodeURIComponent(functionName)}/aliases`)
      return body.aliases ?? []
    },
  })

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No aliases"
        description="Aliases point a stable name at a specific version."
      />
    )
  }

  return (
    <div className="glass-2 overflow-hidden rounded-xl">
      <ul className="divide-border/60 divide-y">
        {data.map((alias) => (
          <li key={alias.name} className="flex items-center gap-3 px-4 py-3">
            <span className="font-mono text-[13px] font-medium">{alias.name}</span>
            <Badge variant="outline" className="ml-auto font-mono text-[11px]">
              v{alias.functionVersion}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
