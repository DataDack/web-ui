import { SmartSelect, type SmartSelectOption } from "@/components/console"

import { PROJECT_TYPE_META } from "./project-type"
import type { ProjectType } from "../managed-apps.types"

/** The runtimes a repository can be built as. n8n is not one of them. */
type RepoRuntime = Extract<ProjectType, "opennext" | "react">

const RUNTIMES: readonly RepoRuntime[] = ["opennext", "react"]

const RUNTIME_DESCRIPTIONS: Record<RepoRuntime, string> = {
    opennext: "Next.js built with OpenNext — SSR, API routes and static assets.",
    react: "A static build (Vite, CRA) compiled once and served as files.",
}

interface RuntimeSelectProps {
    value: RepoRuntime | undefined
    onChange: (runtime: RepoRuntime) => void
    disabled?: boolean
    invalid?: boolean
    id?: string
}

/**
 * How the repository is built.
 *
 * n8n is deliberately absent. It is a managed instance with no repository and
 * no build pipeline, so offering it beside two build runtimes invites a choice
 * that the rest of the form cannot honour — it belongs to a separate entry
 * point, not this control.
 *
 * There is no auto-detection yet: nothing in the backend reads repository
 * contents. Rather than pre-select a guess that looks authoritative, the field
 * asks. Detection lands as a `detected` badge on the chosen row plus the
 * evidence for it, and the shape of this control does not change when it does.
 */
export function RuntimeSelect({
    value,
    onChange,
    disabled,
    invalid,
    id,
}: Readonly<RuntimeSelectProps>) {
    const options: SmartSelectOption<RepoRuntime>[] = RUNTIMES.map((runtime) => ({
        value: runtime,
        item: runtime,
        searchText: `${runtime} ${PROJECT_TYPE_META[runtime].label}`,
    }))

    return (
        <SmartSelect<RepoRuntime>
            id={id}
            ariaLabel="Runtime"
            options={options}
            value={value}
            disabled={disabled}
            invalid={invalid}
            placeholder="Select a runtime"
            searchPlaceholder="Search runtimes…"
            onValueChange={(_next, runtime) => {
                onChange(runtime)
            }}
            renderValue={(option) => PROJECT_TYPE_META[option.item].label}
            renderRow={(option) => {
                const Icon = PROJECT_TYPE_META[option.item].icon
                return {
                    leading: <Icon className="size-4 text-muted-foreground" />,
                    primary: PROJECT_TYPE_META[option.item].label,
                    secondary: RUNTIME_DESCRIPTIONS[option.item],
                }
            }}
        />
    )
}
