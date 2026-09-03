import { useEffect, useState } from "react"

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
  Textarea,
} from "@datadack/common-ui"
import { Boxes, GitBranch } from "lucide-react"

import { BRANCH_MODE_OPTIONS } from "./environment-meta"
import { useCreateEnvironment, useUpdateEnvironment } from "../../../managed-apps.hooks"
import type { BranchMode, ProjectEnvironment } from "../../../managed-apps.types"

interface EnvironmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** Every environment on the project — for the import picker and to warn about
   *  a catch-all another one already holds. */
  environments: ProjectEnvironment[]
  /** The row being edited. Null creates a new one. */
  editing: ProjectEnvironment | null
}

const NAME_RE = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/

/**
 * Create or edit a pre-production environment.
 *
 * The NAME IS NOT EDITABLE once created, and the field is absent rather than
 * disabled when editing. A build records the environment it ran for by name, so
 * a rename would silently reattach that history to something else — the honest
 * answer to "I named it wrong" is a new environment and a deleted one, which
 * leaves the history true.
 *
 * "Import variables from" is create-only for the same reason it exists: it
 * copies a starting point. Offering it on an edit would read as a live link
 * between two environments, and it is a one-time copy.
 */
export function EnvironmentDialog({
  open,
  onOpenChange,
  projectId,
  environments,
  editing,
}: Readonly<EnvironmentDialogProps>) {
  const create = useCreateEnvironment(projectId)
  const update = useUpdateEnvironment(projectId)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tracking, setTracking] = useState(false)
  const [mode, setMode] = useState<BranchMode>("exact")
  const [value, setValue] = useState("")
  const [importing, setImporting] = useState(false)
  const [importFrom, setImportFrom] = useState("")
  const [touched, setTouched] = useState(false)

  // Seeded per row, not once: opening the dialog on a second environment must
  // show that one's rule, not the one left over from the first.
  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? "")
    setDescription(editing?.description ?? "")
    const tracked = editing ? editing.branch_mode !== "none" : false
    setTracking(tracked)
    setMode(tracked && editing ? editing.branch_mode : "exact")
    setValue(editing?.branch_value ?? "")
    setImporting(false)
    setImportFrom(environments.find((e) => e.kind === "production")?.name ?? "")
    setTouched(false)
  }, [open, editing, environments])

  const busy = create.isPending || update.isPending
  const normalized = name.trim().toLowerCase()
  const nameTaken =
    !editing && environments.some((e) => e.name.toLowerCase() === normalized && normalized !== "")
  const nameValid = NAME_RE.test(normalized)
  // A second catch-all is refused by the server; saying so here saves a round
  // trip and, more to the point, says WHICH environment already holds it.
  const catchAllHolder = environments.find(
    (e) => e.branch_mode === "unassigned" && e.name !== editing?.name,
  )
  const catchAllTaken = tracking && mode === "unassigned" && catchAllHolder !== undefined
  const needsBranch = tracking && (mode === "exact" || mode === "prefix") && value.trim() === ""

  const blocked =
    busy ||
    catchAllTaken ||
    needsBranch ||
    (!editing && (!nameValid || nameTaken)) ||
    normalized === ""

  const submit = () => {
    setTouched(true)
    if (blocked) return
    const branchMode: BranchMode = tracking ? mode : "none"
    const branchValue = tracking && mode !== "unassigned" ? value.trim() : ""
    if (editing) {
      update.mutate(
        { name: editing.name, description, branch_mode: branchMode, branch_value: branchValue },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        },
      )
      return
    }
    create.mutate(
      {
        name: normalized,
        description,
        branch_mode: branchMode,
        branch_value: branchValue,
        import_from: importing ? importFrom : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  const nameError = touched && !editing && (nameTaken || (!nameValid && normalized !== ""))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="size-4" />
            {editing ? `Edit ${editing.name}` : "Create environment"}
          </DialogTitle>
          <DialogDescription>
            A place to develop and review deployed changes without touching production.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Absent, not disabled, when editing — see the component note. */}
          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="environment-name">Environment name</Label>
              <Input
                id="environment-name"
                value={name}
                placeholder="staging"
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
                onChange={(event) => {
                  setName(event.target.value)
                }}
              />
              {nameError ? (
                <p className="text-[12px] text-destructive">
                  {nameTaken
                    ? `This project already has an environment called ${normalized}.`
                    : "Use lowercase letters, digits and hyphens, starting with a letter."}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Lowercase, and permanent — builds record the environment they ran for.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="environment-description">Description</Label>
            <Textarea
              id="environment-description"
              value={description}
              rows={2}
              placeholder="A place for all staging deployments"
              className="resize-none text-[13px]"
              onChange={(event) => {
                setDescription(event.target.value)
              }}
            />
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">Branch tracking</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {tracking
                    ? "Pushes to a matching branch build this environment."
                    : "Off — nothing builds this environment from a push."}
                </p>
              </div>
              <Switch
                checked={tracking}
                onCheckedChange={setTracking}
                aria-label="Branch tracking"
              />
            </div>

            {tracking && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <Select
                    value={mode}
                    onValueChange={(next) => {
                      setMode(next as BranchMode)
                    }}
                  >
                    <SelectTrigger className="w-56">
                      <GitBranch className="size-3.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCH_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mode !== "unassigned" && (
                    <Input
                      value={value}
                      placeholder={mode === "prefix" ? "release/" : "main"}
                      spellCheck={false}
                      autoComplete="off"
                      className="flex-1 font-mono"
                      onChange={(event) => {
                        setValue(event.target.value)
                      }}
                    />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {BRANCH_MODE_OPTIONS.find((option) => option.value === mode)?.hint ?? ""}
                </p>
                {catchAllTaken && (
                  <p className="text-[12px] text-destructive">
                    {catchAllHolder.name} already tracks all unassigned branches. Two would make
                    which one builds a branch depend on row order.
                  </p>
                )}
                {touched && needsBranch && (
                  <p className="text-[12px] text-destructive">
                    Name the branch this environment tracks.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Create-only. A one-time copy, not a live link — see the note above. */}
          {!editing && environments.length > 0 && (
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">Import variables</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Copy another environment&apos;s variables in, once, as a starting point.
                  </p>
                </div>
                <Switch
                  checked={importing}
                  onCheckedChange={setImporting}
                  aria-label="Import variables"
                />
              </div>
              {importing && (
                <Select value={importFrom} onValueChange={setImportFrom}>
                  <SelectTrigger className="mt-3 w-full">
                    <SelectValue placeholder="Choose an environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((environment) => (
                      <SelectItem key={environment.name} value={environment.name}>
                        {environment.name} · {environment.var_count} variables
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button type="button" variant="gold" loading={busy} onClick={submit}>
            {editing ? "Save changes" : "Create environment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
