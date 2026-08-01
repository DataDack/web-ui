import { cn } from "@/lib/utils"

/**
 * GitHub's own language colours, for the languages this product actually
 * deploys. Anything unlisted falls back to a neutral dot rather than a random
 * hue — a wrong colour is worse than no colour, because these are recognised
 * on sight.
 */
const LANGUAGE_COLORS: Record<string, string> = {
	TypeScript: "#3178c6",
	JavaScript: "#f1e05a",
	CSS: "#663399",
	HTML: "#e34c26",
	SCSS: "#c6538c",
	Vue: "#41b883",
	Svelte: "#ff3e00",
	Astro: "#ff5a03",
	MDX: "#fcb32c",
	Go: "#00add8",
	Python: "#3572a5",
	Rust: "#dea584",
	Shell: "#89e051",
}

interface LanguageDotProps {
	language: string
	className?: string
}

/**
 * A repository's primary language, as GitHub renders it: a coloured dot and the
 * name. Cheap to scan and instantly familiar — in a list of twenty repositories
 * the colour finds the one you want before the text does.
 */
export function LanguageDot({ language, className }: Readonly<LanguageDotProps>) {
	if (!language) return null

	return (
		<span className={cn("flex items-center gap-1", className)}>
			<span
				aria-hidden
				className="size-2 shrink-0 rounded-full ring-1 ring-border/40"
				style={{ backgroundColor: LANGUAGE_COLORS[language] ?? "var(--status-neutral)" }}
			/>
			{language}
		</span>
	)
}
