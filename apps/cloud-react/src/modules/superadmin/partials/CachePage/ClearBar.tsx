import { Loader2, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

interface ClearBarProps {
    namespaceCount: number
    patternCount: number
    keys: number
    disruptiveCount: number
    pending: boolean
    onClear: () => void
    onReset: () => void
}

// Sticky footer that appears only once something is selected. It states the
// blast radius before the click, not after: how many key families, how many
// live keys, and how many of those families are Redis-only state.
export function ClearBar({
    namespaceCount,
    patternCount,
    keys,
    disruptiveCount,
    pending,
    onClear,
    onReset,
}: Readonly<ClearBarProps>) {
    const { t } = useTranslation()

    return (
        <div className="sticky bottom-4 z-10">
            <div className="glass-2 flex flex-wrap items-center justify-between gap-3 p-3 shadow-lg">
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                        {t("superAdmin.cache.selectionSummary", {
                            namespaces: namespaceCount,
                            patterns: patternCount,
                        })}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                        {/* Pattern key counts are unknown until the clear runs —
						    only registry namespaces are counted server-side. */}
                        {patternCount > 0
                            ? t("superAdmin.cache.selectionKeysPlus", { count: keys })
                            : t("superAdmin.cache.selectionKeys", { count: keys })}
                        {disruptiveCount > 0 &&
                            ` · ${t("superAdmin.cache.selectionDisruptive", { count: disruptiveCount })}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onReset} disabled={pending}>
                        {t("superAdmin.cache.clearSelection")}
                    </Button>
                    <Button className="gap-2" onClick={onClear} disabled={pending}>
                        {pending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        {t("superAdmin.cache.clearSelected")}
                    </Button>
                </div>
            </div>
        </div>
    )
}
