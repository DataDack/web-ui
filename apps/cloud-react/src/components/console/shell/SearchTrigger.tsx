import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@datadack/common-ui"
import { cn } from "@/lib/utils"

interface SearchTriggerProps {
  onOpen: () => void
  /** Rounded-full styling for the floating home navbar */
  pill?: boolean
}

export function SearchTrigger({ onOpen, pill = false }: Readonly<SearchTriggerProps>) {
  const { t } = useTranslation()

  return (
    <>
      <button
        onClick={onOpen}
        className={cn(
          "hidden md:flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left transition-all hover:opacity-80 border border-border-glass bg-input/50",
          pill ? "max-w-md rounded-full px-3.5 py-2" : "max-w-xs rounded-lg",
        )}
      >
        <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-muted-foreground text-[13px] truncate">{t("nav.search")}</span>
        <kbd className="hidden lg:inline-flex font-mono text-[10px] px-1.5 py-0.5 rounded border border-border-glass bg-surface-variant text-on-surface-variant">
          ⌘K
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpen}
        className="md:hidden rounded-lg text-muted-foreground hover:text-foreground"
        aria-label={t("nav.search")}
      >
        <Search className="w-4 h-4" />
      </Button>
    </>
  )
}
