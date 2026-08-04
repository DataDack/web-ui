import { useEffect, useId, useMemo, useState } from "react"

import { toast } from "sonner"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  css,
  cx,
  fontMono,
  glass3,
  timeAgo,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import type { FunctionDetailLabels } from "./labels"
import { usePutAlias } from "../../data/queries"
import type { FunctionVersion, PutAliasInput } from "../../data/types"

const content = css`
  max-width: 28rem;
`

const fields = css`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const monoText = css`
  font-family: ${fontMono};
  font-size: 13px;
`

const inlineError = css`
  margin: 0;
  font-size: 13px;
  color: var(--destructive);
`

const switchRow = css`
  display: flex;
  align-items: center;
  gap: 10px;
`

const weightedBlock = css`
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-radius: 0.5rem;
  padding: 2px 0 0;
`

const splitLine = css`
  margin: 0;
  font-family: ${fontMono};
  font-size: 12px;
  color: var(--muted-foreground);
`

export interface AliasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  functionName: string
  scope?: string
  labels: FunctionDetailLabels
  /** Newest-first; passed by the tab (already fetched) — the dialog fetches nothing. */
  versions: readonly FunctionVersion[]
  /** Prefill: the alias being edited, or { functionVersion } from the Versions tab action. */
  initial?: Partial<PutAliasInput>
}

/**
 * Create/edit an alias: a stable name pointing at a version, optionally
 * splitting a percentage of traffic to a second version. Submits only the four
 * keys the PUT accepts — the backend rejects anything else.
 */
export function AliasDialog({
  open,
  onOpenChange,
  mode,
  functionName,
  scope,
  labels,
  versions,
  initial,
}: Readonly<AliasDialogProps>) {
  const putAlias = usePutAlias(functionName, scope)
  const fieldId = useId()

  const [name, setName] = useState("")
  const [version, setVersion] = useState("")
  const [description, setDescription] = useState("")
  const [weighted, setWeighted] = useState(false)
  const [secondVersion, setSecondVersion] = useState("")
  const [weight, setWeight] = useState("10")
  const [submitted, setSubmitted] = useState(false)

  // Reseed on every open so a reused dialog never leaks the previous draft.
  useEffect(() => {
    if (!open) return
    const weights = Object.entries(initial?.additionalVersionWeights ?? {})
    setName(initial?.name ?? "")
    setVersion(initial?.functionVersion ?? "")
    setDescription(initial?.description ?? "")
    setWeighted(weights.length > 0)
    setSecondVersion(weights[0]?.[0] ?? "")
    setWeight(weights[0] ? String(weights[0][1]) : "10")
    setSubmitted(false)
  }, [open, initial])

  const weightValue = Number(weight)
  const weightValid = Number.isInteger(weightValue) && weightValue >= 1 && weightValue <= 99

  const errors = useMemo(() => {
    const found: Record<string, string> = {}
    if (mode === "create" && name.trim() === "") found.name = labels.aliases.nameRequired
    if (version === "") found.version = labels.aliases.versionRequired
    if (weighted) {
      if (secondVersion === "") found.secondVersion = labels.aliases.versionRequired
      else if (secondVersion === version) found.secondVersion = labels.aliases.sameVersion
      if (!weightValid) found.weight = labels.aliases.weightRange
    }
    return found
  }, [mode, name, version, weighted, secondVersion, weightValid, labels])

  const visible = submitted ? errors : {}

  const submit = () => {
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return

    // Exactly the keys the backend accepts — it 400s unknown ones.
    const input: PutAliasInput = { name: name.trim(), functionVersion: version }
    const trimmedDescription = description.trim()
    if (trimmedDescription !== "") input.description = trimmedDescription
    if (weighted && secondVersion) input.additionalVersionWeights = { [secondVersion]: weightValue }

    putAlias.mutate(input, {
      onSuccess: () => {
        toast.success(labels.aliases.saved(input.name))
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(errorMessage(error, labels.errors.saveFailed))
      },
    })
  }

  const versionItem = (candidate: FunctionVersion) =>
    candidate.createdAt
      ? `v${candidate.version} · ${timeAgo(candidate.createdAt)}`
      : `v${candidate.version}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cx(glass3, content)}>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? labels.aliases.create : labels.aliases.edit}
          </DialogTitle>
          <DialogDescription>{labels.aliases.emptyHint}</DialogDescription>
        </DialogHeader>

        <div className={fields}>
          <div className={field}>
            <Label htmlFor={`${fieldId}-name`}>{labels.aliases.columns.name}</Label>
            <Input
              id={`${fieldId}-name`}
              value={name}
              placeholder={labels.aliases.namePlaceholder}
              // The alias name is the row's identity — renames are a delete+create.
              disabled={mode === "edit"}
              aria-invalid={!!visible.name || undefined}
              className={monoText}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
            {visible.name && <p className={inlineError}>{visible.name}</p>}
          </div>

          <div className={field}>
            <Label>{labels.aliases.version}</Label>
            <Select value={version} onValueChange={setVersion}>
              <SelectTrigger
                aria-label={labels.aliases.version}
                aria-invalid={!!visible.version || undefined}
              >
                <SelectValue placeholder={labels.aliases.version} />
              </SelectTrigger>
              <SelectContent>
                {versions.map((candidate) => (
                  <SelectItem
                    key={candidate.version}
                    value={candidate.version}
                    className={monoText}
                  >
                    {versionItem(candidate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {visible.version && <p className={inlineError}>{visible.version}</p>}
          </div>

          <div className={field}>
            <Label htmlFor={`${fieldId}-description`}>{labels.aliases.description}</Label>
            <Input
              id={`${fieldId}-description`}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
              }}
            />
          </div>

          <div className={switchRow}>
            <Switch
              id={`${fieldId}-weighted`}
              checked={weighted}
              onCheckedChange={setWeighted}
            />
            <Label htmlFor={`${fieldId}-weighted`}>{labels.aliases.weighted}</Label>
          </div>

          {weighted && (
            <div className={weightedBlock}>
              <div className={field}>
                <Label>{labels.aliases.version}</Label>
                <Select value={secondVersion} onValueChange={setSecondVersion}>
                  <SelectTrigger
                    aria-label={labels.aliases.version}
                    aria-invalid={!!visible.secondVersion || undefined}
                  >
                    <SelectValue placeholder={labels.aliases.version} />
                  </SelectTrigger>
                  <SelectContent>
                    {versions
                      .filter((candidate) => candidate.version !== version)
                      .map((candidate) => (
                        <SelectItem
                          key={candidate.version}
                          value={candidate.version}
                          className={monoText}
                        >
                          {versionItem(candidate)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {visible.secondVersion && <p className={inlineError}>{visible.secondVersion}</p>}
              </div>

              <div className={field}>
                <Label htmlFor={`${fieldId}-weight`}>{labels.aliases.weight}</Label>
                <Input
                  id={`${fieldId}-weight`}
                  type="number"
                  min={1}
                  max={99}
                  value={weight}
                  aria-invalid={!!visible.weight || undefined}
                  className={monoText}
                  onChange={(event) => {
                    setWeight(event.target.value)
                  }}
                />
                {visible.weight && <p className={inlineError}>{visible.weight}</p>}
              </div>

              {version && secondVersion && weightValid && (
                <p className={splitLine}>
                  v{version} {100 - weightValue}% · v{secondVersion} {weightValue}%
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {labels.configuration.cancel}
          </Button>
          <Button variant="gold" loading={putAlias.isPending} onClick={submit}>
            {labels.aliases.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
