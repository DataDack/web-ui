import {
    type LucideIcon,
    CreditCard,
    Database,
    EthernetPort,
    FolderTree,
    GitBranch,
    Globe,
    HardDrive,
    Key,
    LayoutDashboard,
    Network,
    Scale,
    Server,
    Shield,
    User,
} from "lucide-react"

import type { SearchResult, SearchResultStatus, SearchResultType } from "../search.types"

/* ── Icon + color maps ─────────────────────────────────────────────────── */

const TYPE_ICON: Record<SearchResultType, LucideIcon> = {
    module: LayoutDashboard,
    vm: Server,
    vpc: Network,
    subnet: GitBranch,
    disk: HardDrive,
    database: Database,
    "ssh-key": Key,
    "load-balancer": Scale,
    "static-ip": Globe,
    "network-interface": EthernetPort,
    "iam-user": User,
    "iam-role": Shield,
    "resource-group": FolderTree,
    invoice: CreditCard,
}

const TYPE_COLOR: Record<SearchResultType, { bg: string; fg: string }> = {
    module: { bg: "rgba(195,198,210,0.12)", fg: "var(--primary)" },
    vm: { bg: "rgba(255,183,123,0.12)", fg: "var(--secondary)" },
    vpc: { bg: "rgba(192,193,255,0.12)", fg: "var(--tertiary)" },
    subnet: { bg: "rgba(192,193,255,0.08)", fg: "var(--bsc-outline)" },
    disk: { bg: "rgba(195,198,210,0.12)", fg: "var(--primary)" },
    database: { bg: "rgba(192,193,255,0.12)", fg: "var(--tertiary)" },
    "ssh-key": { bg: "rgba(192,193,255,0.12)", fg: "var(--success-pulse)" },
    "load-balancer": { bg: "rgba(255,183,123,0.12)", fg: "var(--secondary)" },
    "static-ip": { bg: "rgba(192,193,255,0.08)", fg: "var(--bsc-outline)" },
    "network-interface": { bg: "rgba(192,193,255,0.08)", fg: "var(--bsc-outline)" },
    "iam-user": { bg: "rgba(192,193,255,0.12)", fg: "var(--success-pulse)" },
    "iam-role": { bg: "rgba(192,193,255,0.12)", fg: "var(--success-pulse)" },
    "resource-group": { bg: "rgba(195,198,210,0.12)", fg: "var(--primary)" },
    invoice: { bg: "rgba(255,183,123,0.08)", fg: "var(--secondary)" },
}

const STATUS_STYLE: Record<SearchResultStatus, { label: string; dot: string }> = {
    running: { label: "Running", dot: "var(--success-pulse)" },
    active: { label: "Active", dot: "var(--success-pulse)" },
    optimal: { label: "Optimal", dot: "var(--success-pulse)" },
    paid: { label: "Paid", dot: "var(--success-pulse)" },
    stopped: { label: "Stopped", dot: "var(--bsc-outline)" },
    inactive: { label: "Inactive", dot: "var(--bsc-outline)" },
    pending: { label: "Pending", dot: "var(--secondary)" },
    error: { label: "Error", dot: "var(--destructive)" },
    overdue: { label: "Overdue", dot: "var(--destructive)" },
}

/* ── Component ─────────────────────────────────────────────────────────── */

interface SearchResultItemProps {
    result: SearchResult
    isSelected: boolean
    onSelect: (result: SearchResult) => void
    onHover: (id: string) => void
}

export function SearchResultItem({
    result,
    isSelected,
    onSelect,
    onHover,
}: Readonly<SearchResultItemProps>) {
    const iconType = result.iconType ?? result.type
    const Icon = TYPE_ICON[iconType]
    const color = TYPE_COLOR[iconType]
    const status = result.status ? STATUS_STYLE[result.status] : null

    let meta: React.ReactNode = null
    if (status) {
        meta = (
            <span
                className="flex items-center gap-1.5 text-xs"
                style={{ color: "var(--bsc-outline)" }}
            >
                <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: status.dot }}
                />
                {status.label}
            </span>
        )
    } else if (result.region) {
        meta = (
            <span className="text-xs" style={{ color: "var(--bsc-outline)" }}>
                {result.region}
            </span>
        )
    }

    return (
        <button
            data-result-id={result.id}
            onClick={() => {
                onSelect(result)
            }}
            onMouseEnter={() => {
                onHover(result.id)
            }}
            className="w-full flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-left transition-colors"
            style={{
                width: "calc(100% - 1rem)",
                background: isSelected ? "var(--accent)" : "transparent",
            }}
        >
            {/* Icon */}
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: color.bg }}
            >
                <Icon className="w-4 h-4" style={{ color: color.fg }} />
            </div>

            {/* Name + inline description */}
            <div className="flex-1 min-w-0 flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground shrink-0 truncate max-w-[55%]">
                    {result.label}
                </span>
                {result.description && (
                    <span className="text-xs text-muted-foreground truncate">
                        {result.description}
                    </span>
                )}
            </div>

            {/* Right-aligned meta: status, else region */}
            <div className="flex items-center gap-2 shrink-0">
                {meta}

                {isSelected && (
                    <kbd
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                        style={{
                            background: "var(--muted)",
                            border: "1px solid var(--border)",
                            color: "var(--muted-foreground)",
                        }}
                    >
                        ↵
                    </kbd>
                )}
            </div>
        </button>
    )
}
