import { useMemo, useState } from "react"

import { Button, cn, Skeleton } from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, Section } from "@/components/console"

import { EnvVarEditor, storedEnvRows, toEnvValues, type EnvRow } from "../../components"
import {
  useEnvironmentEnv,
  useProjectEnvironments,
  useSetEnvironmentEnv,
} from "../../managed-apps.hooks"
import type { Project, ProjectEnvVar } from "../../managed-apps.types"

/**
 * Environment variables, scoped to one environment.
 *
 * ITS OWN TAB. Defining an environment is a once-and-rarely job and sits in
 * Settings; editing what one builds with is the daily one, and it is what
 * somebody opens a project for. The environment picker below is what makes a
 * tab enough — the scope travels with the editor instead of being chosen two
 * levels up.
 *
 * THE ENVIRONMENT IS THE SCOPE NOW, and that replaces something that never
 * worked. Each row used to carry Production/Preview chips, and the backend
 * stored one flat map with no notion of a target — so the scope a user picked
 * was discarded on save, and every variable applied everywhere regardless. The
 * chips are gone (`previewEnabled={false}`) because the picker above the editor
 * is the real thing they were pretending to be: a variable belongs to the
 * environment whose set it is in, and that set is what the build is handed.
 *
 * This section carries a hazard the create flow does not. `GET .../env` returns
 * variable NAMES only — values are sealed at rest and never leave the backend —
 * while `PUT .../env` replaces the whole set. So the console genuinely cannot
 * re-send a value it was never given, and saving a variable the user did not
 * retype would blank it.
 *
 * Rather than hide that, the editor tracks which rows are `stored` (known name,
 * unknown value) and the save is gated behind a confirm that names every
 * variable about to be cleared. The real fix is a per-key PATCH on the API;
 * until then this is the honest behaviour.
 */
export function EnvironmentVariablesTab({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const { data: environments = [], isLoading: loadingEnvironments } = useProjectEnvironments(
    project.id,
  )
  // Production first — the server sorts them that way, and it is the set
  // somebody opening this page is nearly always looking for.
  const [selected, setSelected] = useState("")
  const active = selected !== "" ? selected : (environments[0]?.name ?? "")

  const { data: names = [], isLoading: loadingEnv } = useEnvironmentEnv(project.id, active)
  const update = useSetEnvironmentEnv(project.id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // The editor still speaks ProjectEnvVar, which carries targets. They are
  // filled in as "everywhere" and never rendered — see the component note. Not
  // dropped from the type because the create flow still sends that shape.
  const variables = useMemo<ProjectEnvVar[]>(
    () => names.map((key) => ({ key, targets: [] })),
    [names],
  )

  // Rows are derived from the server's set, with the user's edits layered on
  // top and anchored to the version they were made against. When the server
  // set changes — including after a save, and including on switching
  // environment — the anchor no longer matches and the rows re-seed as
  // `stored`, so they stop claiming to hold values. Doing this during render
  // rather than in an effect avoids a second pass that would briefly show the
  // previous environment's variables.
  const seeded = useMemo(() => storedEnvRows(variables), [variables])
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
      { name: active, env: toEnvValues(rows) },
      {
        onSuccess: () => {
          setConfirmOpen(false)
        },
      },
    )
  }

  if (loadingEnvironments) return <Skeleton className="h-52 rounded-xl" />

  const countLabel = names.length === 1 ? "1 variable set" : `${String(names.length)} variables set`
  const activeEnvironment = environments.find((environment) => environment.name === active)

  return (
    <>
      <Section
        variant="panel"
        title={t("managedApps.envSection.environmentVariables")}
        description={`${countLabel} for ${active || "this project"}. Values are write-only — only names are returned.`}
      >
        <div className="space-y-4">
          {/* The scope, stated once, above the rows it applies to. A picker
              rather than a chip per row: a variable belongs to exactly one
              environment's set, and per-row chips implied it could be in two. */}
          <div
            role="tablist"
            aria-label="Environment"
            className="flex w-fit flex-wrap items-center gap-0.5 rounded-lg border border-border-glass p-0.5"
          >
            {environments.map((environment) => (
              <button
                key={environment.name}
                type="button"
                role="tab"
                aria-selected={environment.name === active}
                onClick={() => {
                  setSelected(environment.name)
                  // Drop the draft: it belongs to the environment being left,
                  // and carrying it across would offer to write one
                  // environment's values into another's set.
                  setDraft(null)
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 font-mono text-[12px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  environment.name === active
                    ? "glass-1-bg-raised text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {environment.name}
                <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {environment.var_count}
                </span>
              </button>
            ))}
          </div>

          {loadingEnv ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <EnvVarEditor
              rows={rows}
              onChange={setRows}
              // The environment picker above IS the scope. Per-row target chips
              // would be a second, contradictory answer to the same question.
              previewEnabled={false}
              description={
                (activeEnvironment?.deploys ?? true)
                  ? "Handed to the build on your GitHub Actions runner and masked in its log. Changes apply to the next build."
                  : "Handed to builds of this environment. Those builds are stored rather than released — this project serves production."
              }
            />
          )}

          <Button
            size="sm"
            className="gap-1.5"
            disabled={update.isPending || active === ""}
            onClick={() => {
              if (wouldClear.length > 0) setConfirmOpen(true)
              else save()
            }}
            loading={update.isPending}
          >
            Save variables
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("managedApps.envSection.someValuesWillBeCleared")}
        confirmLabel={t("managedApps.envSection.saveAndClearThem")}
        loading={update.isPending}
        onConfirm={save}
        description={
          <span className="block space-y-2">
            <span className="block">
              Saving replaces {active}&apos;s whole set, and the console was never given the values
              of variables you have not retyped. These would be saved empty:
            </span>
            <span className="block font-mono text-[12px] text-destructive">
              {wouldClear.join(", ")}
            </span>
            <span className="block">
              {t("managedApps.envSection.retypeAValueForAnyYouWantToKeepThenSaveAgain")}
            </span>
          </span>
        }
      />
    </>
  )
}
