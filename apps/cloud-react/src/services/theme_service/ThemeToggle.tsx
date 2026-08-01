import { Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme()
    const { t } = useTranslation()
    const isDark = resolvedTheme === "dark"

    return (
        <div
            role="group"
            aria-label={t("nav.toggleTheme")}
            className="flex items-center gap-0.5 rounded-full border border-border-glass bg-surface-glass p-0.5"
        >
            <button
                type="button"
                onClick={() => { setTheme("dark"); }}
                aria-pressed={isDark}
                aria-label="Dark"
                className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-colors",
                    isDark ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Moon className="size-4" />
            </button>
            <button
                type="button"
                onClick={() => { setTheme("light"); }}
                aria-pressed={!isDark}
                aria-label="Light"
                className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-colors",
                    !isDark ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Sun className="size-4" />
            </button>
        </div>
    )
}
