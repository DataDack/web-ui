import { Trans, useTranslation } from "react-i18next"

import { Checkbox } from "@/components/ui/checkbox"

import { POLICY_URLS } from "../auth.constants"

const policyLink =
    "font-medium text-brand-gold underline-offset-2 hover:underline focus-visible:underline outline-none"

/**
 * Required "I agree to the Privacy Policy & Terms" consent. Shown at signup and
 * at account creation; the parent gates its primary action on `checked`. The
 * two policy links open the public policy pages in a new tab.
 */
export function PolicyConsent({
    checked,
    onCheckedChange,
    disabled = false,
    id = "policy-consent",
}: Readonly<{
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    id?: string
}>) {
    const { t } = useTranslation()
    return (
        <label
            htmlFor={id}
            className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground"
        >
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(v) => { onCheckedChange(v === true); }}
                className="mt-0.5"
            />
            <span>
                <Trans
                    i18nKey="auth.consent.label"
                    t={t}
                    components={{
                        // Children are placeholders — <Trans> substitutes the
                        // translated link text from the i18n template at runtime.
                        privacy: (
                            <a
                                href={POLICY_URLS.privacy}
                                target="_blank"
                                rel="noreferrer"
                                className={policyLink}
                                onClick={(e) => { e.stopPropagation(); }}
                            >
                                Privacy Policy
                            </a>
                        ),
                        terms: (
                            <a
                                href={POLICY_URLS.terms}
                                target="_blank"
                                rel="noreferrer"
                                className={policyLink}
                                onClick={(e) => { e.stopPropagation(); }}
                            >
                                Terms of Service
                            </a>
                        ),
                    }}
                />
            </span>
        </label>
    )
}
