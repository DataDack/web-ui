import { useState } from "react"

import { cn } from "@/lib/utils"

import { GitHubMark } from "./GitHubMark"

interface GitHubAvatarProps {
    /** Avatar URL. GitHub serves one per login at github.com/<login>.png. */
    src?: string
    className?: string
}

/**
 * An account's face, with a mark to fall back on.
 *
 * Shared by the row AND the trigger of every GitHub picker, because they have
 * to agree: a list that identifies accounts by their avatar, collapsing to a
 * bare string once chosen, makes the user check they picked the right one by
 * reopening it.
 *
 * A failed image becomes the GitHub mark rather than being hidden — a gap where
 * an avatar should be reads as a broken row, while the mark still says "this is
 * a GitHub account" and keeps the text aligned with every other row.
 */
export function GitHubAvatar({ src, className }: Readonly<GitHubAvatarProps>) {
    const [failed, setFailed] = useState(false)

    if (!src || failed) {
        return (
            <span
                className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full bg-muted",
                    className
                )}
            >
                <GitHubMark className="size-3 text-muted-foreground" />
            </span>
        )
    }

    return (
        <img
            src={src}
            alt=""
            loading="lazy"
            className={cn("size-5 shrink-0 rounded-full bg-muted ring-1 ring-border/50", className)}
            onError={() => {
                setFailed(true)
            }}
        />
    )
}
