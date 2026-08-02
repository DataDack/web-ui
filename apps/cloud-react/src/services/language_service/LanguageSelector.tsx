import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

const LANGUAGES = [
  { code: "en", label: "English", native: "English", script: "EN" },
  { code: "hi", label: "Hindi", native: "हिंदी", script: "HI" },
] as const

export function LanguageSelector() {
  const { i18n, t } = useTranslation()
  const currentLang = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2.5 h-8 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t("nav.language")}
        >
          <Globe className="h-4 w-4" />
          <span className="font-mono text-xs hidden sm:inline">{currentLang.script}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("nav.language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => void i18n.changeLanguage(lang.code)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="font-mono text-[11px] w-6 text-muted-foreground shrink-0">
              {lang.script}
            </span>
            <span className="font-medium">{lang.native}</span>
            <span className="text-muted-foreground text-xs ml-auto">{lang.label}</span>
            {i18n.resolvedLanguage === lang.code && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
