import { useState } from "react"

import { Eye, KeyRound, Plus, Trash2 } from "lucide-react"

import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Switch,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useRevealApiKey,
  useUpdateApiKey,
} from "../data/queries"
import type { ApiKey } from "../data/schemas"

/**
 * API keys, and the one place their secret is ever shown.
 *
 * A generated key comes back exactly twice: once from the create call, and once
 * from an explicit reveal. Everything else — the list, a get, this table —
 * carries only a mask. That is not the console being cautious; it is the
 * surface refusing to return it, so a screenshot of this page or a proxy log of
 * the list cannot leak a customer's credential.
 *
 * Which is why create shows the key inline afterwards rather than a toast: a
 * toast that times out loses the one unprompted sight of it, and the operator's
 * only recovery is a reveal they then have to justify.
 */
export function ApiKeysPage() {
  const { data, error, isLoading } = useApiKeys()
  const create = useCreateApiKey()
  const update = useUpdateApiKey()
  const remove = useDeleteApiKey()
  const reveal = useRevealApiKey()

  const [name, setName] = useState("")
  const [customerId, setCustomerId] = useState("")
  /** The key just created, held until the operator navigates away. */
  const [issued, setIssued] = useState<{ name: string; value: string } | undefined>()
  /** Revealed secrets, keyed by id, for keys created in an earlier session. */
  const [revealed, setRevealed] = useState<Record<string, string>>({})

  const keys = data ?? []

  return (
    <>
      <PageHeader
        title="API keys"
        icon={KeyRound}
        description="Keys a caller presents, and the usage plans they are counted against."
      />

      <div className="border-border/60 bg-card/40 mb-4 rounded-lg border p-3">
        <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase">
          Create key
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              placeholder="mobile-app"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <div className="flex min-w-44 flex-col gap-1.5">
            <Label htmlFor="key-customer">Customer ID (optional)</Label>
            <Input
              id="key-customer"
              placeholder="cust-1024"
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value)
              }}
            />
          </div>
          <Button
            variant="gold"
            disabled={!name.trim() || create.isPending}
            onClick={() => {
              create.mutate(
                { name: name.trim(), customerId: customerId.trim() || undefined },
                {
                  onSuccess: (key) => {
                    setIssued({ name: key.name, value: key.value ?? "" })
                    setName("")
                    setCustomerId("")
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
            {errorMessage(create.error, "Could not create the key")}
          </p>
        ) : null}
      </div>

      {issued ? (
        <div className="border-brand-gold/40 bg-brand-gold/5 mb-4 rounded-lg border p-3">
          <div className="mb-1 text-[13px] font-medium">Key created: {issued.name}</div>
          <p className="text-muted-foreground mb-2 text-xs">
            This is the only time it is shown unprompted. Copy it now — reading it again takes an
            explicit reveal.
          </p>
          <div className="flex items-center gap-1.5">
            <code className="bg-card rounded px-2 py-1 font-mono text-[12px]">{issued.value}</code>
            <CopyButton value={issued.value} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIssued(undefined)
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <ApiKeyList
        keys={keys}
        loading={isLoading}
        error={error ? errorMessage(error, "Could not load") : undefined}
        revealed={revealed}
        onToggle={(apiKeyId, enabled) => {
          update.mutate({ apiKeyId, input: { enabled } })
        }}
        onReveal={(apiKeyId) => {
          reveal.mutate(apiKeyId, {
            onSuccess: (value) => {
              setRevealed((current) => ({ ...current, [apiKeyId]: value }))
            },
          })
        }}
        onDelete={(apiKeyId) => {
          remove.mutate(apiKeyId)
        }}
      />
    </>
  )
}

/**
 * The key list, and the two states that are not a list.
 *
 * Extracted for the same reason as the domain list: a three-way ternary in JSX
 * is where a reader loses track of which arm they are in, and a failed load
 * must never be rendered as "nothing here yet".
 */
function ApiKeyList({
  keys,
  loading,
  error,
  revealed,
  onToggle,
  onReveal,
  onDelete,
}: Readonly<{
  keys: readonly ApiKey[]
  loading: boolean
  error?: string
  revealed: Record<string, string>
  onToggle: (apiKeyId: string, enabled: boolean) => void
  onReveal: (apiKeyId: string) => void
  onDelete: (apiKeyId: string) => void
}>) {
  if (error) {
    return <EmptyState icon={KeyRound} title="Could not load API keys" description={error} />
  }
  if (keys.length === 0 && !loading) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No API keys"
        description="A key identifies a caller so a usage plan can throttle and count it."
      />
    )
  }
  return (
    <div>
      {keys.map((key) => (
        <ApiKeyRow
          key={key.apiKeyId}
          apiKey={key}
          secret={revealed[key.apiKeyId]}
          onToggle={onToggle}
          onReveal={onReveal}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function ApiKeyRow({
  apiKey,
  secret,
  onToggle,
  onReveal,
  onDelete,
}: Readonly<{
  apiKey: ApiKey
  secret?: string
  onToggle: (apiKeyId: string, enabled: boolean) => void
  onReveal: (apiKeyId: string) => void
  onDelete: (apiKeyId: string) => void
}>) {
  return (
    <div className="border-border/60 flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="font-mono text-[13px] font-medium">{apiKey.name}</div>
        <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]">
          {secret ?? apiKey.maskedValue}
          {secret ? <CopyButton value={secret} /> : null}
          {apiKey.customerId ? <span>· {apiKey.customerId}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">
          {apiKey.apiKeyId}
        </Badge>
        {/* A toggle rather than an edit form: enabled is the only field an
            operator changes in a hurry, and the hurry is "turn this off". */}
        <Switch
          checked={apiKey.enabled}
          onCheckedChange={(enabled) => {
            onToggle(apiKey.apiKeyId, enabled)
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          title="Reveal the key"
          onClick={() => {
            onReveal(apiKey.apiKeyId)
          }}
        >
          <Eye className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onDelete(apiKey.apiKeyId)
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
