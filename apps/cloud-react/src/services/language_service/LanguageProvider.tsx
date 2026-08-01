import { type ReactNode } from "react"

import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next"

import en from "./locales/en.json"
import hi from "./locales/hi.json"

/* ── Init (runs once at module load) ───────────────────────────────────── */

if (!i18n.isInitialized) {
    void i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources: {
                en: { translation: en },
                hi: { translation: hi },
            },
            fallbackLng: "en",
            interpolation: { escapeValue: false },
            detection: {
                order: ["localStorage", "navigator"],
                caches: ["localStorage"],
                lookupLocalStorage: "bsc-language",
            },
        })
}

/* ── Provider ──────────────────────────────────────────────────────────── */

export function LanguageProvider({ children }: Readonly<{ children: ReactNode }>) {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export function useLanguage() {
    const { i18n: instance } = useTranslation()
    return {
        language: instance.resolvedLanguage ?? "en",
        changeLanguage: (code: string) => instance.changeLanguage(code),
    }
}
