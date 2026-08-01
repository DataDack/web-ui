import { cn } from "@/lib/utils"

/**
 * Two projects on the same repository, with the same branch and the same last
 * commit, are otherwise indistinguishable at a glance — which is exactly what
 * the overview showed. A deterministic mark per project fixes that, and brings
 * colour to a page whose only other colour is status.
 *
 * The hue is derived from the id, so it is stable forever and needs no storage.
 * Two fixed stops apart in hue give each mark depth without a palette to
 * maintain.
 */
function hueOf(seed: string): number {
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) % 360
    }
    return hash
}

interface ProjectAvatarProps {
    /** Stable identity — the project id, never the name (names change). */
    seed: string
    /** Rendered inside the mark; the project's first character. */
    label: string
    className?: string
}

export function ProjectAvatar({ seed, label, className }: Readonly<ProjectAvatarProps>) {
    const hue = hueOf(seed)

    return (
        <span
            aria-hidden
            className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-semibold text-white/95 ring-1 ring-black/5",
                className
            )}
            style={{
                backgroundImage: `linear-gradient(135deg, hsl(${String(hue)} 70% 52%), hsl(${String((hue + 38) % 360)} 68% 42%))`,
            }}
        >
            {label.slice(0, 1).toUpperCase()}
        </span>
    )
}
