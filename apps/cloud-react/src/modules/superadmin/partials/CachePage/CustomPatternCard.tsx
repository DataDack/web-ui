import { useState } from "react"

import { Plus, Terminal, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CustomPatternCardProps {
  patterns: string[]
  onChange: (patterns: string[]) => void
  disabled?: boolean
}

// The escape hatch for anything the registry does not name yet — a raw Redis
// glob. Patterns added here compose with the namespace checkboxes: one clear
// sends both.
export function CustomPatternCard({
  patterns,
  onChange,
  disabled = false,
}: Readonly<CustomPatternCardProps>) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState("")

  const add = () => {
    const value = draft.trim()
    if (!value || patterns.includes(value)) {
      setDraft("")
      return
    }
    onChange([...patterns, value])
    setDraft("")
  }

  return (
    <section className="glass-2 p-4">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          {t("superAdmin.cache.custom.title")}
        </h2>
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {t("superAdmin.cache.custom.subtitle")}
      </p>

      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault() // the card sits inside no form, but Enter should add, not submit
            add()
          }}
          placeholder={t("superAdmin.cache.custom.placeholder")}
          className="font-mono text-[13px]"
          disabled={disabled}
        />
        <Button variant="outline" onClick={add} disabled={disabled || !draft.trim()}>
          <Plus className="w-4 h-4" />
          {t("superAdmin.cache.custom.add")}
        </Button>
      </div>

      {patterns.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {patterns.map((p) => (
            <Badge key={p} variant="outline" className="gap-1 font-mono text-[11px]">
              {p}
              <button
                type="button"
                onClick={() => {
                  onChange(patterns.filter((x) => x !== p))
                }}
                disabled={disabled}
                aria-label={t("superAdmin.cache.custom.remove", { pattern: p })}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </section>
  )
}
