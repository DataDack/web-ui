import type { CSSProperties } from "react"

import { Check, FolderTree, Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { IconType } from "react-icons"

import { cn } from "@datadack/common-ui"

import { FRAMEWORK_MARKS } from "../../../components"
import type { RepoDetection } from "../../../managed-apps.types"

/** What a repository can be built as here. `custom` is not buildable yet. */
export type RepoProjectType = "opennext" | "react" | "custom"

interface TypeOption {
  value: RepoProjectType
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

const OPTIONS: TypeOption[] = [
  {
    value: "opennext",
    label: "Next.js",
    sub: "built with OpenNext",
    body: "SSR, API routes and static assets.",
    ...FRAMEWORK_MARKS.opennext,
  },
  {
    value: "react",
    label: "React",
    sub: "static build",
    body: "Vite or CRA, compiled once and served as files.",
    ...FRAMEWORK_MARKS.react,
  },
  {
    value: "custom",
    label: "Custom",
    sub: "your own Dockerfile",
    body: "Bring any stack. Not available yet.",
    ...FRAMEWORK_MARKS.custom,
    comingSoon: true,
  },
]

/** How many monorepo candidates are worth offering before it is a file browser. */
const MAX_CANDIDATES = 6

interface ProjectTypePickerProps {
  value: RepoProjectType | undefined
  onChange: (type: RepoProjectType) => void
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
  onChange,
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

  const labelOf = (type: RepoProjectType) =>
    OPTIONS.find((option) => option.value === type)?.label ?? type

  // We read the tree and there is no package.json under this root: the
  // repository is not a Next.js or React app, and no choice on these cards can
  // make it one. Distinct from a failed lookup, which proves nothing.
  const unbuildable = detection != null && !detection.detected && !detectionFailed

  const blockedReason = (option: TypeOption): string | undefined => {
    if (option.comingSoon) return "Coming soon"
    if (detecting) return "Checking the repository…"
    if (unbuildable) return "Nothing to build here"
    if (!detected || detected === option.value) return undefined
    return `This repository looks like ${labelOf(detected)}`
  }

  // Directories that hold a package.json. Offering them is what turns "no
  // package.json here" from a dead end into the one click that fixes it —
  // detection re-runs against the chosen directory.
  const candidates = (detection?.root_candidates ?? [])
    .filter((dir) => dir !== "" && dir !== ".")
    .slice(0, MAX_CANDIDATES)
  const atRoot = rootDir === "" || rootDir === "."

  const unreadableMessage =
    "We could not read this repository, so pick the type yourself — an incorrect one fails during the build."
  const unbuildableMessage = `No package.json at ${atRoot ? "the repository root" : rootDir}. DataDack builds Next.js and React apps, so this cannot be deployed as it is.`

  return (
    <div className="space-y-3">
      {/* Above the cards, where guidance is read — FieldRow puts its own
			    description underneath, which is after the decision has been made. */}
      <p className="text-[12px] text-muted-foreground">
        {t("managedApps.projectTypePicker.weReadTheRepositoryToWorkThisOutPickOneIfWeC")}
      </p>

      <div className="grid items-stretch gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const reason = blockedReason(option)
          const disabled = Boolean(reason)
          const selected = value === option.value
          const isDetected = detected === option.value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => {
                onChange(option.value)
              }}
              className={cn(
                "group relative flex h-full flex-col gap-2.5 overflow-hidden rounded-xl border glass-1-bg p-3.5 text-left shadow-xs",
                "motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-150 motion-safe:ease-out",
                "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected
                  ? "border-primary/70 shadow-sm ring-1 ring-primary/20"
                  : "border-border/60",
                !disabled &&
                  "hover:border-primary/35 hover:glass-1-bg-raised hover:shadow-sm motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.96]",
                disabled && "cursor-not-allowed opacity-45 hover:border-border/60 hover:shadow-xs",
              )}
            >
              {/* Selection stays visible without tinting the entire surface. */}
              {selected && (
                <>
                  <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-foreground/10 to-transparent opacity-0 motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:translate-x-[600%] motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:translate-x-[600%] motion-safe:group-focus-visible:opacity-100"
                  />
                </>
              )}

              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-lg transition-colors",
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
                  {/* The mark keeps its own colour in every state — it is how
                      the card is recognised before the label is read, and
                      recolouring it on selection lost that. The tile is tinted
                      from the mark itself, so the accent never has to fight a
                      brand colour. */}
                  <Icon className="size-[18px]" aria-hidden />
                </span>

                {selected && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-primary uppercase">
                    <Check className="size-2.5" strokeWidth={3} />
                    {isDetected ? "Detected" : "Chosen"}
                  </span>
                )}
                {!selected && isDetected && (
                  <span className="rounded-full bg-status-success-bg px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-status-success uppercase">
                    Detected
                  </span>
                )}
                {!selected && option.comingSoon && (
                  <span className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-brand-gold/90 uppercase">
                    Soon
                  </span>
                )}
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

              {reason && !option.comingSoon && !detecting && (
                <p className="text-[11px] text-status-warning">{reason}</p>
              )}
            </button>
          )
        })}
      </div>

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
