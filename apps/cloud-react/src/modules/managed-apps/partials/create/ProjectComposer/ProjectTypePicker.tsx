import { cn } from "@datadack/common-ui"
import { Check, FolderTree, Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { IconType } from "react-icons"

import { SmartSelect, type SmartSelectOption } from "@/components/console"

import { markFor } from "../../../components/framework-marks"
import type { FrameworkOption, RepoDetection } from "../../../managed-apps.types"

/** What a repository can be built as here. `custom` is not buildable yet. */
export type RepoProjectType = "opennext" | "react" | "custom"

interface TypeOption {
  value: RepoProjectType
  /** The catalogue id — what is stored on the project and sent to the runner. */
  framework: string
  /** The framework's own documentation, when the catalogue carries one. */
  docs?: string
  label: string
  sub: string
  body: string
  /** The framework's own mark — recognised before the label is read. */
  icon: IconType
  /** Official brand colour. */
  color: string
  /** Dark-theme override, set only where the official mark is near-black. */
  colorDark?: string
  /** Not shippable yet — visible, never selectable. */
  comingSoon?: boolean
}

/**
 * Catalogue rows as cards, ordered so the detected one leads.
 *
 * Built from the API rather than a constant in this file. The list used to be
 * three hardcoded entries while the platform's catalogue carried thirty-seven,
 * so every framework the build pipeline could already produce was unreachable
 * from the form that chooses one.
 */
function optionsFrom(
  frameworks: FrameworkOption[] | undefined,
  detectedFramework: string | undefined,
): TypeOption[] {
  const rows = (frameworks ?? []).map((row) => {
    const detectedProfile = row.profiles.find((profile) => profile.id === detectedFramework)
    const profile =
      detectedProfile ??
      row.profiles.find((candidate) => candidate.id === row.default_profile) ??
      row.profiles[0]
    const toolchain = profile.toolchain
    return {
      value: profile.project_type,
      // Store the exact internal profile, while rendering only the framework.
      framework: profile.id,
      label: row.label,
      sub: toolchain ? `${toolchain} preset` : "framework preset",
      body: "Build settings are detected from your repository and can be reviewed before deploy.",
      docs: row.docs,
      comingSoon: !row.available,
      ...markFor(row.id),
    } satisfies TypeOption
  })

  // The detected framework first, because it is the answer in the
  // overwhelmingly common case and scrolling past thirty cards to reach it is
  // the form asking a question it has already answered.
  //
  // Matched on the FAMILY that owns the detected profile, resolved ONCE: a card
  // is a family, so "astro-ssr was detected" has to light the Astro card.
  // Deciding it per comparison against the whole catalogue matched whichever
  // row came first rather than the row being compared, which pinned an
  // undetected framework to the top whenever it preceded the detected one.
  const detectedLabel = frameworks?.find((row) =>
    row.profiles.some((profile) => profile.id === detectedFramework),
  )?.label

  return rows.sort((a, b) => {
    const aDetected = detectedLabel != null && a.label === detectedLabel
    const bDetected = detectedLabel != null && b.label === detectedLabel
    if (aDetected !== bDetected) return aDetected ? -1 : 1
    if (a.comingSoon !== b.comingSoon) return a.comingSoon ? 1 : -1
    return a.label.localeCompare(b.label)
  })
}

/** How many monorepo candidates are worth offering before it is a file browser. */
const MAX_CANDIDATES = 6

interface ProjectTypePickerProps {
  value: RepoProjectType | undefined
  /** The catalogue id currently chosen, when one is. */
  framework: string | undefined
  onChange: (type: RepoProjectType, framework: string) => void
  /** The catalogue. Undefined while it loads. */
  frameworks: FrameworkOption[] | undefined
  frameworksLoading: boolean
  detection: RepoDetection | undefined
  detecting: boolean
  detectionFailed: boolean
  /** "" is the repository root. Changing it re-runs detection. */
  rootDir: string
  onRootDirChange: (dir: string) => void
}

/**
 * What this repository is, checked against what it actually contains.
 *
 * The check is the point. Deploying a Vite app down the OpenNext pipeline does
 * not fail here — it fails minutes later inside a GitHub Actions build the user
 * has to read logs to understand, after a pull request has already been opened
 * on their repository. The repository tree answers the question before any of
 * that, so a proven mismatch is refused at the point of choosing.
 *
 * It refuses only what it can PROVE is wrong. When detection found a framework,
 * the other runtime is disabled with the reason. When it found no package.json,
 * or the lookup failed, every buildable option stays open — an unreadable
 * repository is not evidence, and blocking on it would trap users behind a
 * GitHub API hiccup.
 */
export function ProjectTypePicker({
  value: _value,
  framework,
  onChange,
  frameworks,
  frameworksLoading,
  detection,
  detecting,
  detectionFailed,
  rootDir,
  onRootDirChange,
}: Readonly<ProjectTypePickerProps>) {
  const { t } = useTranslation()
  // Only a positive detection gates anything. `n8n` can never be detected from
  // a repository, so it is not a case to handle here.
  const detected =
    detection?.detected && detection.project_type !== "n8n" ? detection.project_type : undefined
  const detectedFramework = detection?.detected ? detection.framework : undefined

  const options = optionsFrom(frameworks, detectedFramework)

  const familyForDetected = frameworks?.find((row) =>
    row.profiles.some((profile) => profile.id === detectedFramework),
  )

  // Prefer the DETECTED framework's own label over the first card that happens
  // to share its type: "this repository looks like SvelteKit" is a sentence
  // somebody can act on; "looks like React" when it is SvelteKit is not.
  const labelOf = (type: RepoProjectType) => {
    const byFramework = options.find((option) => option.label === familyForDetected?.label)
    if (byFramework?.value === type) return byFramework.label
    return options.find((option) => option.value === type)?.label ?? type
  }

  // No package.json means only that Node detection has no answer. It must not
  // block Hugo, Jekyll, Python, Go, Rust or plain HTML presets.
  const unbuildable = detection != null && !detection.detected && !detectionFailed

  const selectOptions: SmartSelectOption<TypeOption>[] = options.map((option) => ({
    value: option.framework,
    item: option,
    searchText: `${option.label} ${option.sub} ${option.framework}`,
    disabled: option.comingSoon,
    disabledReason: option.comingSoon ? "Coming soon" : undefined,
  }))

  // Directories that hold a package.json. Offering them is what turns "no
  // package.json here" from a dead end into the one click that fixes it —
  // detection re-runs against the chosen directory.
  const candidates = (detection?.root_candidates ?? [])
    .filter((dir) => dir !== "" && dir !== ".")
    .slice(0, MAX_CANDIDATES)
  const atRoot = rootDir === "" || rootDir === "."

  const unreadableMessage =
    "We could not read this repository, so pick the type yourself — an incorrect one fails during the build."
  const unbuildableMessage = `No Node framework was detected at ${atRoot ? "the repository root" : rootDir}. Choose the framework that matches this repository.`

  return (
    <div className="space-y-3">
      {/* Above the cards, where guidance is read — FieldRow puts its own
			    description underneath, which is after the decision has been made. */}
      <p className="text-[12px] text-muted-foreground">
        {t("managedApps.projectTypePicker.weReadTheRepositoryToWorkThisOutPickOneIfWeC")}
      </p>

      <SmartSelect<TypeOption>
        ariaLabel="Framework"
        options={selectOptions}
        value={framework}
        loading={frameworksLoading || detecting}
        placeholder="Select a framework"
        searchPlaceholder="Search frameworks…"
        emptyText="No framework presets are available."
        onValueChange={(_next, option) => {
          onChange(option.value, option.framework)
        }}
        renderValue={(option) => option.item.label}
        renderRow={(option) => {
          const Icon = option.item.icon
          const isDetected = familyForDetected?.profiles.some(
            (profile) => profile.id === option.item.framework,
          )
          return {
            leading: <Icon className="size-4 text-muted-foreground" aria-hidden />,
            primary: option.item.label,
            secondary: option.item.sub,
            trailing: isDetected ? (
              <span className="text-[10px] font-medium text-status-success">Detected</span>
            ) : undefined,
          }
        }}
      />

      {detecting && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {t("managedApps.projectTypePicker.readingTheRepository")}
        </p>
      )}

      {!detecting && detected && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Check className="mt-0.5 size-3 shrink-0 text-status-success" />
          {detection?.evidence[0]
            ? `${labelOf(detected)} — ${detection.evidence[0]}`
            : `Detected ${labelOf(detected)} from the repository.`}
        </p>
      )}

      {!detecting && !detected && (
        <div className="space-y-2 rounded-lg border border-border/60 glass-1-bg px-3 py-2.5">
          <p className="flex items-start gap-1.5 text-[11px]">
            <TriangleAlert
              className={cn(
                "mt-0.5 size-3 shrink-0",
                unbuildable ? "text-destructive" : "text-status-warning",
              )}
            />
            <span className={unbuildable ? "text-destructive" : "text-muted-foreground"}>
              {detectionFailed ? unreadableMessage : unbuildableMessage}
            </span>
          </p>

          {/* The fix for the common cause, offered rather than described. */}
          {unbuildable && candidates.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t("managedApps.projectTypePicker.chooseAnotherRepositoryAboveOrOneWithAPackag")}
            </p>
          )}

          {candidates.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <FolderTree className="size-3" />
                {unbuildable ? "Try a subdirectory:" : "Build from:"}
              </span>
              {!atRoot && (
                <button
                  type="button"
                  onClick={() => {
                    onRootDirChange("")
                  }}
                  className="rounded-full border border-border/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  ./
                </button>
              )}
              {candidates.map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => {
                    onRootDirChange(dir)
                  }}
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
                    rootDir === dir
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {dir}
                </button>
              ))}
              {detection?.truncated && (
                <span className="text-[11px] text-muted-foreground">
                  (list truncated by GitHub)
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
