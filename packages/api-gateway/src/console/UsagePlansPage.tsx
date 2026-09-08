import { useState } from "react"

import { Gauge, Link2, Plus, Trash2 } from "lucide-react"

import {
  Badge,
  Button,
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
  useApiKeys,
  useApis,
  useAttachPlanApi,
  useAttachPlanKey,
  useCreateUsagePlan,
  useDeleteUsagePlan,
  useDetachPlanApi,
  useDetachPlanKey,
  usePlanApis,
  usePlanKeys,
  useStages,
  useUsagePlans,
} from "../data/queries"
import type { UsagePlan } from "../data/schemas"

/**
 * Usage plans: a throttle and a quota, the keys they apply to, and the API
 * stages they cover.
 *
 * A plan and its attachments share a screen for the same reason a domain and
 * its mappings do — a plan with no keys throttles nobody, and a key on no plan
 * is counted against nothing, so every real task here spans both.
 *
 * Unset limits are shown as "unlimited" rather than 0. The surface omits them
 * entirely for that reason: a rate limit of zero would mean no requests at all,
 * which is the opposite of what an unset one does.
 */
export function UsagePlansPage() {
  const { data, error, isLoading } = useUsagePlans()
  const create = useCreateUsagePlan()
  const remove = useDeleteUsagePlan()
  const [name, setName] = useState("")
  const [rate, setRate] = useState("")
  const [quota, setQuota] = useState("")
  const [selected, setSelected] = useState<string | undefined>()

  const plans = data ?? []
  const active = selected ?? plans[0]?.usagePlanId

  return (
    <>
      <PageHeader
        title="Usage plans"
        icon={Gauge}
        description="Throttles and quotas, the API keys they apply to, and the stages they cover."
      />

      <div className="border-border/60 bg-card/40 mb-6 rounded-lg border p-3">
        <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase">
          Create plan
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="plan-name">Name</Label>
            <Input
              id="plan-name"
              placeholder="basic"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <div className="flex min-w-36 flex-col gap-1.5">
            <Label htmlFor="plan-rate">Rate limit / sec</Label>
            <Input
              id="plan-rate"
              placeholder="unlimited"
              value={rate}
              onChange={(event) => {
                setRate(event.target.value)
              }}
            />
          </div>
          <div className="flex min-w-36 flex-col gap-1.5">
            <Label htmlFor="plan-quota">Quota / day</Label>
            <Input
              id="plan-quota"
              placeholder="unlimited"
              value={quota}
              onChange={(event) => {
                setQuota(event.target.value)
              }}
            />
          </div>
          <Button
            variant="gold"
            disabled={!name.trim() || create.isPending}
            onClick={() => {
              const rateLimit = Number(rate)
              const quotaLimit = Number(quota)
              create.mutate(
                {
                  name: name.trim(),
                  // Omitted, not zero: the surface reads an absent throttle as
                  // unlimited and a zero one as "allow nothing".
                  throttle:
                    rateLimit > 0
                      ? { rateLimit, burstLimit: Math.max(rateLimit, 1) * 2 }
                      : undefined,
                  quota: quotaLimit > 0 ? { limit: quotaLimit, period: "DAY" } : undefined,
                },
                {
                  onSuccess: () => {
                    setName("")
                    setRate("")
                    setQuota("")
                  },
                },
              )
            }}
          >
            <Plus /> Create
          </Button>
        </div>
        {create.error ? (
          <p className="text-status-danger mt-2 text-xs">
            {errorMessage(create.error, "Could not create the plan")}
          </p>
        ) : null}
      </div>

      <PlanList
        plans={plans}
        loading={isLoading}
        error={error ? errorMessage(error, "Could not load") : undefined}
        active={active}
        onSelect={setSelected}
        onDelete={(planId) => {
          remove.mutate(planId, {
            onSuccess: () => {
              setSelected(undefined)
            },
          })
        }}
      />
    </>
  )
}

/**
 * The plan picker and its detail, plus the two states that are not a list.
 *
 * Extracted so the page body is not a three-way ternary: a failed load and an
 * empty account need different copy, and reading which arm produced which is
 * exactly what nesting them makes hard.
 */
function PlanList({
  plans,
  loading,
  error,
  active,
  onSelect,
  onDelete,
}: Readonly<{
  plans: readonly UsagePlan[]
  loading: boolean
  error?: string
  active?: string
  onSelect: (planId: string) => void
  onDelete: (planId: string) => void
}>) {
  if (error) {
    return <EmptyState icon={Gauge} title="Could not load usage plans" description={error} />
  }
  if (plans.length === 0 && !loading) {
    return (
      <EmptyState
        icon={Gauge}
        title="No usage plans"
        description="A plan throttles and counts the keys attached to it."
      />
    )
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="flex flex-col gap-1">
        {plans.map((plan) => (
          <button
            key={plan.usagePlanId}
            type="button"
            onClick={() => {
              onSelect(plan.usagePlanId)
            }}
            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left ${
              plan.usagePlanId === active
                ? "border-brand-gold/50 bg-card"
                : "border-border/60 hover:bg-card/60"
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-[13px]">{plan.name}</div>
              {/* Unset limits read as "unlimited", never as 0 — zero would mean
                  no requests at all, the opposite of what unset does. */}
              <div className="text-muted-foreground font-mono text-[10px]">
                {plan.throttle ? `${String(plan.throttle.rateLimit)}/s` : "unthrottled"} ·{" "}
                {plan.quota
                  ? `${String(plan.quota.limit)}/${plan.quota.period.toLowerCase()}`
                  : "unlimited"}
              </div>
            </div>
          </button>
        ))}
      </div>
      {active ? (
        <PlanDetail
          planId={active}
          onDelete={() => {
            onDelete(active)
          }}
        />
      ) : null}
    </div>
  )
}

function PlanDetail({ planId, onDelete }: Readonly<{ planId: string; onDelete: () => void }>) {
  const { data: keys } = usePlanKeys(planId)
  const { data: allKeys } = useApiKeys()
  const { data: apis } = useApis()
  const { data: entries } = usePlanApis(planId)
  const attachKey = useAttachPlanKey(planId)
  const detachKey = useDetachPlanKey(planId)
  const attachApi = useAttachPlanApi(planId)
  const detachApi = useDetachPlanApi(planId)

  const [keyId, setKeyId] = useState("")
  const [apiId, setApiId] = useState("")
  const [stage, setStage] = useState("")
  // Stages belong to the chosen API, so this re-reads when it changes.
  const { data: stages } = useStages(apiId || undefined)

  const keyNames = new Map((allKeys ?? []).map((key) => [key.apiKeyId, key.name]))
  const apiNames = new Map((apis ?? []).map((api) => [api.apiId, api.name || api.apiId]))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete plan
        </Button>
      </div>

      <section>
        <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase">
          Keys on this plan
        </div>
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <Label>API key</Label>
            <Select value={keyId} onValueChange={setKeyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a key" />
              </SelectTrigger>
              <SelectContent>
                {(allKeys ?? []).map((key) => (
                  <SelectItem key={key.apiKeyId} value={key.apiKeyId}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="gold"
            disabled={!keyId || attachKey.isPending}
            onClick={() => {
              attachKey.mutate(keyId, {
                onSuccess: () => {
                  setKeyId("")
                },
              })
            }}
          >
            Attach
          </Button>
        </div>
        {(keys ?? []).length === 0 ? (
          <p className="text-muted-foreground text-xs">No keys attached.</p>
        ) : (
          (keys ?? []).map((entry) => (
            <div
              key={entry.id}
              className="border-border/60 flex items-center justify-between border-b py-2 last:border-b-0"
            >
              <span className="font-mono text-[13px]">
                {keyNames.get(entry.apiKeyId) ?? entry.apiKeyId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  detachKey.mutate(entry.id)
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </section>

      <section>
        <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase">
          API stages covered
        </div>
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="flex min-w-44 flex-1 flex-col gap-1.5">
            <Label>API</Label>
            <Select
              value={apiId}
              onValueChange={(next) => {
                setApiId(next)
                // The old stage belongs to the old API and would be refused.
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
          <Button
            variant="gold"
            disabled={!apiId || !stage || attachApi.isPending}
            onClick={() => {
              attachApi.mutate(
                { apiId, stage },
                {
                  onSuccess: () => {
                    setStage("")
                  },
                },
              )
            }}
          >
            <Link2 className="size-3.5" /> Cover
          </Button>
        </div>
        {(entries ?? []).length === 0 ? (
          <p className="text-muted-foreground text-xs">No stages covered.</p>
        ) : (
          (entries ?? []).map((entry) => (
            <div
              key={entry.id}
              className="border-border/60 flex items-center justify-between border-b py-2 last:border-b-0"
            >
              <span className="font-mono text-[13px]">
                {apiNames.get(entry.apiId) ?? entry.apiId}
                <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                  {entry.stage}
                </Badge>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  detachApi.mutate(entry.id)
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
