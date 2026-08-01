import { useMemo, useState } from "react"

import { Skeleton } from "@DataDack/common-ui"
import { Loader2 } from "lucide-react"

import { ConfirmDialog, Section } from "@/components/console"
import { Button } from "@datadack/common-ui"

import { EnvVarEditor, storedEnvRows, toEnvMap, type EnvRow } from "../../../components"
import { useProjectEnv, useUpdateProjectEnv } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

/**
 * Environment variables for an existing project.
 *
 * This section carries a hazard the create flow does not. `GET /env` returns
 * variable NAMES only — values are sealed at rest and never leave the backend —
 * while `PUT /env` replaces the whole set. So the console genuinely cannot
 * re-send a value it was never given, and saving a variable the user did not
 * retype would blank it.
 *
 * Rather than hide that, the editor tracks which rows are `stored` (known name,
 * unknown value) and the save is gated behind a confirm that names every
 * variable about to be cleared. The real fix is a per-key PATCH on the API;
 * until then this is the honest behaviour.
 */
export function EnvSection({ project }: Readonly<{ project: Project }>) {
  const { data: names = [], isLoading } = useProjectEnv(project.id)
  const update = useUpdateProjectEnv(project.id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Rows are derived from the server's set, with the user's edits layered on
  // top and anchored to the version they were made against. When the server
  // set changes — including after a save — the anchor no longer matches and
  // the rows re-seed as `stored`, so they stop claiming to hold values. Doing
  // this during render rather than in an effect avoids a second pass that
  // would briefly show the previous project's variables.
  const seeded = useMemo(() => storedEnvRows(names), [names])
  const [draft, setDraft] = useState<{ base: EnvRow[]; rows: EnvRow[] } | null>(null)
  const rows = draft?.base === seeded ? draft.rows : seeded
  const setRows = (next: EnvRow[]) => {
    setDraft({ base: seeded, rows: next })
  }

  /** Saved variables the user has not retyped — a save would clear these. */
  const wouldClear = useMemo(
    () => rows.filter((row) => row.state === "stored" && row.key.trim() !== "").map((r) => r.key),
    [rows],
  )

  const save = () => {
    update.mutate(
      { env: toEnvMap(rows) },
      {
        onSuccess: () => {
          setConfirmOpen(false)
        },
      },
    )
  }

  if (isLoading) return <Skeleton className="h-52 rounded-xl" />

  const countLabel = names.length === 1 ? "1 variable set" : `${String(names.length)} variables set`

  return (
    <>
      <Section
        variant="panel"
        title="Environment variables"
        description={`${countLabel}. Values are write-only — only names are returned.`}
      >
        <div className="space-y-4">
          <EnvVarEditor
            rows={rows}
            onChange={setRows}
            description="Available to the build on your GitHub Actions runner and masked in its log. Changes apply to the next build."
          />

          <Button
            size="sm"
            className="gap-1.5"
            disabled={update.isPending}
            onClick={() => {
              if (wouldClear.length > 0) setConfirmOpen(true)
              else save()
            }}
          >
            {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save variables
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Some values will be cleared"
        confirmLabel="Save and clear them"
        loading={update.isPending}
        onConfirm={save}
        description={
          <span className="block space-y-2">
            <span className="block">
              Saving replaces the whole set, and the console was never given the values of variables
              you have not retyped. These would be saved empty:
            </span>
            <span className="block font-mono text-[12px] text-destructive">
              {wouldClear.join(", ")}
            </span>
            <span className="block">Retype a value for any you want to keep, then save again.</span>
          </span>
        }
      />
    </>
  )
}
