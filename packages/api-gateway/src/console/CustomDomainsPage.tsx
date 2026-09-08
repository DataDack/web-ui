import { useState } from "react"

import { Globe2, Link2, Plus, Trash2 } from "lucide-react"

import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import {
  useApiMappings,
  useApis,
  useCreateApiMapping,
  useCreateDomainName,
  useDeleteApiMapping,
  useDeleteDomainName,
  useDomainNames,
  useStages,
} from "../data/queries"
import type { DomainName } from "../data/schemas"



/**
 * Custom domains, and the base-path mappings that publish an API stage under
 * one.
 *
 * A domain and its mappings belong on the same screen because neither is useful
 * alone: a domain with no mapping routes nowhere, and a mapping cannot exist
 * without a domain. Splitting them across two pages would mean every real task
 * here — "put this API on this hostname" — spanned both.
 *
 * These are the API Gateway product's custom domains. They are NOT the platform
 * domain registry under Edge → Domains, which is every hostname every product
 * hands out. The two are separate tables today, and a hostname claimed here is
 * not claimed there — worth knowing before pointing DNS at one.
 */
/**
 * Falls back when a value is missing OR blank: these fields come back as ""
 * rather than absent, which `??` would happily render.
 */
function orElse(value: string | undefined, fallback: string): string {
  return value !== undefined && value !== "" ? value : fallback
}

export function CustomDomainsPage() {
  const { data: domains, error, isLoading, refetch } = useDomainNames()
  const create = useCreateDomainName()
  const remove = useDeleteDomainName()
  const [hostname, setHostname] = useState("")
  const [selected, setSelected] = useState<string | undefined>()

  const rows = domains ?? []
  const active = selected ?? rows[0]?.domainName

  return (
    <>
      <PageHeader
        title="Custom domains"
        icon={Globe2}
        description="Hostnames an API is published under, and the base paths that map to a stage."
      />

      <div className="border-border/60 bg-card/40 mb-6 rounded-lg border p-3">
        <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase">
          Add domain
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-64 flex-1 flex-col gap-1.5">
            <Label htmlFor="domain-name">Hostname</Label>
            <Input
              id="domain-name"
              placeholder="api.example.com"
              value={hostname}
              onChange={(event) => {
                setHostname(event.target.value)
              }}
            />
          </div>
          <Button
            variant="gold"
            disabled={!hostname.trim() || create.isPending}
            onClick={() => {
              create.mutate(
                { domainName: hostname.trim() },
                {
                  onSuccess: () => {
                    setHostname("")
                  },
                },
              )
            }}
          >
            <Plus /> Add
          </Button>
        </div>
        {create.error ? (
          <p className="text-status-danger mt-2 text-xs">{errorMessage(create.error, "Could not create")}</p>
        ) : null}
      </div>

      <DomainList
        domains={rows}
        loading={isLoading}
        error={error ? errorMessage(error, "Could not load") : undefined}
        onRetry={() => void refetch()}
        active={active}
        onSelect={setSelected}
      />
      {active ? (
        <MappingsPanel
          domainName={active}
          onDeleteDomain={() => {
            remove.mutate(active, {
              onSuccess: () => {
                setSelected(undefined)
              },
            })
          }}
          deleteError={remove.error ? errorMessage(remove.error, "Could not delete") : undefined}
        />
      ) : null}
    </>
  )
}

/**
 * The domain picker, and the two states that are not a list: a failed load and
 * an empty one. They live here rather than as branches at the call site because
 * a three-way ternary in JSX is where the reader loses track of which arm they
 * are in.
 */
function DomainList({
  domains,
  loading,
  error,
  onRetry,
  active,
  onSelect,
}: Readonly<{
  domains: readonly DomainName[]
  loading: boolean
  error?: string
  onRetry: () => void
  active?: string
  onSelect: (domainName: string) => void
}>) {
  if (error) {
    return (
      <EmptyState
        icon={Globe2}
        title="Could not load custom domains"
        description={error}
        action={{ label: "Retry", onClick: onRetry }}
      />
    )
  }
  if (domains.length === 0 && !loading) {
    return (
      <EmptyState
        icon={Globe2}
        title="No custom domains"
        description="Add a hostname above, then map an API stage onto a base path."
      />
    )
  }
  return (
    <div className="mb-6 flex flex-col gap-1">
      {domains.map((domain) => {
        const config = domain.domainNameConfigurations[0]
        const isActive = domain.domainName === active
        return (
          <button
            key={domain.domainName}
            type="button"
            onClick={() => {
              onSelect(domain.domainName)
            }}
            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left ${
              isActive ? "border-brand-gold/50 bg-card" : "border-border/60 hover:bg-card/60"
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-[13px]">{domain.domainName}</div>
              <div className="text-muted-foreground font-mono text-[10px]">
                {orElse(config?.securityPolicy, "TLS_1_2")} ·{" "}
                {orElse(config?.endpointType, "REGIONAL")}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
              {orElse(config?.domainNameStatus, "pending")}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}

function MappingsPanel({
  domainName,
  onDeleteDomain,
  deleteError,
}: Readonly<{ domainName: string; onDeleteDomain: () => void; deleteError?: string }>) {
  const { data: mappings } = useApiMappings(domainName)
  const { data: apis } = useApis()
  const create = useCreateApiMapping(domainName)
  const remove = useDeleteApiMapping(domainName)
  const [apiId, setApiId] = useState("")
  const [basePath, setBasePath] = useState("")
  // Stages belong to the chosen API, so the list re-reads when it changes.
  const { data: stages } = useStages(apiId || undefined)
  const [stage, setStage] = useState("")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm">{domainName}</span>
          <CopyButton value={domainName} />
        </div>
        <Button variant="ghost" size="sm" onClick={onDeleteDomain}>
          <Trash2 className="size-3.5" /> Delete domain
        </Button>
      </div>
      {deleteError ? <p className="text-status-danger text-xs">{deleteError}</p> : null}

      <div className="border-border/60 bg-card/40 rounded-lg border p-3">
        <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase">
          Map an API stage
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-44 flex-1 flex-col gap-1.5">
            <Label>API</Label>
            <Select
              value={apiId}
              onValueChange={(next) => {
                setApiId(next)
                // The old stage belongs to the old API and would be rejected.
                setStage("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an API" />
              </SelectTrigger>
              <SelectContent>
                {(apis ?? []).map((api) => (
                  <SelectItem key={api.apiId} value={api.apiId}>
                    {api.name || api.apiId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-36 flex-col gap-1.5">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage} disabled={!apiId}>
              <SelectTrigger>
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {(stages ?? []).map((row) => (
                  <SelectItem key={row.stageName} value={row.stageName}>
                    {row.stageName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-32 flex-col gap-1.5">
            <Label htmlFor="base-path">Base path</Label>
            <Input
              id="base-path"
              placeholder="v1 (blank = root)"
              value={basePath}
              onChange={(event) => {
                setBasePath(event.target.value)
              }}
            />
          </div>
          <Button
            variant="gold"
            disabled={!apiId || !stage || create.isPending}
            onClick={() => {
              create.mutate(
                { apiId, stage, apiMappingKey: basePath.trim() || undefined },
                {
                  onSuccess: () => {
                    setBasePath("")
                  },
                },
              )
            }}
          >
            Map
          </Button>
        </div>
        {create.error ? (
          <p className="text-status-danger mt-2 text-xs">{errorMessage(create.error, "Could not create")}</p>
        ) : null}
      </div>

      {(mappings ?? []).length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No mappings"
          description="Nothing is published under this hostname yet."
        />
      ) : (
        <div>
          {(mappings ?? []).map((mapping) => (
            <div
              key={mapping.apiMappingId}
              className="border-border/60 flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="font-mono text-[13px]">
                  /{mapping.apiMappingKey || <span className="text-muted-foreground">(root)</span>}
                </div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  {mapping.apiId} · {mapping.stage}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  remove.mutate(mapping.apiMappingId)
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
