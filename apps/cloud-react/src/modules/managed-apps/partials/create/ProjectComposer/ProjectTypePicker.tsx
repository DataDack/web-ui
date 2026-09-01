import { useState, type CSSProperties } from "react"

import { Check, FolderTree, Loader2, Search, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { IconType } from "react-icons"

import { cn } from "@datadack/common-ui"

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

/** Make punctuation and accents irrelevant while matching catalogue terms. */
function searchTerms(value: string): string[] {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean)
}

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
  value,
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
  const [search, setSearch] = useState("")
  // Only a positive detection gates anything. `n8n` can never be detected from
  // a repository, so it is not a case to handle here.
  const detected =
    detection?.detected && detection.project_type !== "n8n" ? detection.project_type : undefined
  const detectedFramework = detection?.detected ? detection.framework : undefined

  const options = optionsFrom(frameworks, detectedFramework)
  const queryTerms = searchTerms(search)
  const filteredOptions = options.filter((option) => {
    const haystack = searchTerms(
      `${option.label} ${option.sub} ${option.framework} ${option.body} ${option.comingSoon ? "coming soon unavailable" : "available"}`,
    )
    return queryTerms.every((term) => haystack.some((candidate) => candidate.includes(term)))
  })

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

      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={search}
          disabled={frameworksLoading}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          placeholder="Search frameworks…"
          aria-label="Search frameworks"
          aria-controls="framework-card-grid"
          className="h-9 w-full rounded-lg border border-border-glass bg-transparent pr-3 pl-9 text-[12px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        />
      </div>

      <div
        id="framework-card-grid"
        className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {filteredOptions.map((option) => {
          const disabled = Boolean(option.comingSoon) || frameworksLoading || detecting
          // Select per framework rather than per project type: many catalogue
          // entries share the same underlying build profile type.
          const selected = framework ? framework === option.framework : value === option.value
          const isDetected = familyForDetected?.label === option.label
          const Icon = option.icon
          let badge = null
          if (selected) {
            badge = (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-primary uppercase">
                <Check className="size-2.5" strokeWidth={3} aria-hidden />
                {isDetected ? "Detected" : "Chosen"}
              </span>
            )
          } else if (isDetected) {
            badge = (
              <span className="rounded-full bg-status-success-bg px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-status-success uppercase">
                Detected
              </span>
            )
          } else if (option.comingSoon) {
            badge = (
              <span className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-brand-gold/90 uppercase">
                Soon
              </span>
            )
          }

          return (
            <button
              key={option.framework}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => {
                onChange(option.value, option.framework)
              }}
              className={cn(
                "group relative flex h-full min-h-36 flex-col gap-2.5 overflow-hidden rounded-xl border glass-1-bg p-3.5 text-left shadow-xs",
                "motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-150 motion-safe:ease-out",
                "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected
                  ? "border-primary/70 shadow-sm ring-1 ring-primary/20"
                  : "border-border/60",
                !disabled &&
                  "hover:border-primary/35 hover:glass-1-bg-raised hover:shadow-sm motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              {selected && (
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
              )}

              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-lg",
                    "bg-[color-mix(in_srgb,currentColor_10%,transparent)]",
                    "text-[var(--fw-mark)] dark:text-[var(--fw-mark-dark)]",
                    selected
                      ? "ring-1 ring-[color-mix(in_srgb,currentColor_32%,transparent)]"
                      : "ring-1 ring-[color-mix(in_srgb,currentColor_18%,transparent)]",
                  )}
                  style={
                    {
                      "--fw-mark": option.color,
                      "--fw-mark-dark": option.colorDark ?? option.color,
                    } as CSSProperties
                  }
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>

                {badge}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">
                  {option.label}{" "}
                  <span className="font-normal text-muted-foreground">· {option.sub}</span>
                </p>
                <p className="mt-1 text-pretty text-[11px] leading-relaxed text-muted-foreground">
                  {option.body}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {!frameworksLoading && options.length === 0 && (
        <p role="status" className="text-[12px] text-muted-foreground">
          No framework presets are available.
        </p>
      )}

      {!frameworksLoading && options.length > 0 && filteredOptions.length === 0 && (
        <p
          role="status"
          className="rounded-lg border border-border/60 px-3 py-6 text-center text-[12px] text-muted-foreground"
        >
          No frameworks match “{search.trim()}”. Try a framework name, toolchain, or preset ID.
        </p>
      )}

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
