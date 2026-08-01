import { cn } from "@/lib/utils"

interface SetupFlowGraphicProps {
    /** Which stage the project has reached — earlier nodes render as done. */
    stage: "pr" | "merged" | "building"
    className?: string
}

const NODES = [
    { key: "pr", label: "Pull request" },
    { key: "merged", label: "Merged" },
    { key: "building", label: "Builds on push" },
] as const

/**
 * The three-step journey a repository takes before it can build, drawn rather
 * than described.
 *
 * The setup screen otherwise asks the user to hold a whole pipeline in their
 * head from a paragraph of prose. A diagram makes "you are here, one step
 * left" legible at a glance — and it is inline SVG, so it inherits the theme
 * and costs no request.
 */
export function SetupFlowGraphic({ stage, className }: Readonly<SetupFlowGraphicProps>) {
    const reached = NODES.findIndex((node) => node.key === stage)

    return (
        <div className={cn("flex items-center justify-center gap-1.5", className)}>
            {NODES.map((node, index) => {
                const done = index < reached
                const current = index === reached
                return (
                    <div key={node.key} className="flex items-center gap-1.5">
                        <div className="flex flex-col items-center gap-1.5">
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden
                                className={cn(
                                    "size-7 transition-colors",
                                    done && "text-status-success",
                                    current && "text-status-info",
                                    !done && !current && "text-muted-foreground/30"
                                )}
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className={cn(current && "animate-pulse")}
                                />
                                {done ? (
                                    <path
                                        d="m8 12.5 2.5 2.5L16 9.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                ) : (
                                    <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                                )}
                            </svg>
                            <span
                                className={cn(
                                    "text-[10px] whitespace-nowrap",
                                    current
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                {node.label}
                            </span>
                        </div>

                        {index < NODES.length - 1 && (
                            <span
                                aria-hidden
                                className={cn(
                                    "mb-4 h-px w-8 sm:w-14",
                                    index < reached ? "bg-status-success/50" : "bg-border"
                                )}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
