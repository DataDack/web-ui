import { AppWindow, Atom, Check, FolderTree, Loader2, Settings2, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

import type { RepoDetection } from "../../../managed-apps.types"

/** What a repository can be built as here. `custom` is not buildable yet. */
export type RepoProjectType = "opennext" | "react" | "custom"

interface TypeOption {
  value: RepoProjectType
  label: string
  sub: string
  body: string
  icon: typeof AppWindow
  /** Not shippable yet — visible, never selectable. */
  comingSoon?: boolean
}

const OPTIONS: TypeOption[] = [
  {
    value: "opennext",
    label: "Next.js",
    sub: "built with OpenNext",
    body: "SSR, API routes and static assets.",
    icon: AppWindow,
  },
  {
    value: "react",
    label: "React",
    sub: "static build",
    body: "Vite or CRA, compiled once and served as files.",
    icon: Atom,
  },
  {
    value: "custom",
    label: "Custom",
    sub: "your own Dockerfile",
    body: "Bring any stack. Not available yet.",
    icon: Settings2,
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
        We read the repository to work this out. Pick one if we could not.
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
                "group relative flex h-full flex-col gap-2.5 rounded-xl border p-4 text-left transition-all",
                "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected
                  ? "border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/30"
                  : "border-border/60 hover:border-border hover:bg-muted/20 hover:shadow-sm",
                disabled &&
                  "cursor-not-allowed opacity-50 hover:border-border/60 hover:bg-transparent hover:shadow-none",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-lg border transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/40 text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
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
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
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
          Reading the repository…
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
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
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
              Choose another repository above, or one with a package.json.
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
