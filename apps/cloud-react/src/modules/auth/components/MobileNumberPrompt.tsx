import { useEffect, useState } from "react"

import { Loader2, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { extractError } from "@/services/api/client"

import { useAuth } from "../auth.context"
import { useUpdatePhone } from "../auth.hooks"
import { usePhoneInput } from "../phone"
import { PhoneField } from "./PhoneField"

// Legacy users signed up before a mobile number was collected. We nudge them to
// add one, but at most once per hour so it stays a reminder rather than a wall:
// the throttle timestamp is persisted so it survives remounts and reloads.
const THROTTLE_KEY = "dd-mobile-prompt-last-shown"
const SAVED_KEY_PREFIX = "dd-mobile-prompt-saved"
const THROTTLE_MS = 60 * 60 * 1000 // 60 minutes

/**
 * MobileNumberPrompt surfaces a dialog asking the signed-in user to add a mobile
 * number when they have none on file. It only appears when the number is missing
 * and, per the product rule, at most once every 60 minutes; dismissing it just
 * defers to the next window. Mounted once in the app shell.
 */
export function MobileNumberPrompt() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const { mutate, isPending } = useUpdatePhone()

    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [locallySavedUserId, setLocallySavedUserId] = useState<string | null>(null)

    const phone = usePhoneInput(user?.country ?? "IN")

    const savedKey = user ? `${SAVED_KEY_PREFIX}:${user.id}` : ""
    const savedForUser =
        !!user && (locallySavedUserId === user.id || localStorage.getItem(savedKey) === "true")
    const needsPhone = !!user && !user.phone && !savedForUser

    useEffect(() => {
        // When the number is already present the dialog is unmounted below, so
        // there is nothing to close here.
        if (!needsPhone) return
        // Show at most once per throttle window. Record the moment we decide to
        // show so the next reminder is a full window away.
        const last = Number(localStorage.getItem(THROTTLE_KEY) ?? 0)
        const now = Date.now()
        if (now - last < THROTTLE_MS) return
        localStorage.setItem(THROTTLE_KEY, String(now))
        // eslint-disable-next-line react-hooks/set-state-in-effect -- surface the reminder once per throttle window; there is no user event to hang this off, it is driven by the persisted session + timestamp
        setOpen(true)
    }, [needsPhone])

    if (!needsPhone) return null

    const submit = () => {
        if (!phone.selectedCountry) {
            setError(t("auth.mobilePrompt.countriesUnavailable"))
            return
        }
        if (!phone.e164) {
            setError(t("auth.mobilePrompt.invalid"))
            return
        }
        setError(null)
        mutate(phone.e164, {
            onSuccess: () => {
                localStorage.setItem(`${SAVED_KEY_PREFIX}:${user.id}`, "true")
                setLocallySavedUserId(user.id)
                setOpen(false)
            },
            onError: (e) => {
                setError(extractError(e, t("auth.mobilePrompt.invalid")))
            },
        })
    }

    // Editing the number clears a stale validation message.
    const field = {
        ...phone,
        setRaw: (v: string) => {
            phone.setRaw(v)
            if (error) setError(null)
        },
        setCountryIso: (v: string) => {
            phone.setCountryIso(v)
            if (error) setError(null)
        },
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md glass-3">
                <DialogHeader>
                    <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ShieldCheck className="size-5" />
                    </div>
                    <DialogTitle>{t("auth.mobilePrompt.title")}</DialogTitle>
                    <DialogDescription>{t("auth.mobilePrompt.description")}</DialogDescription>
                </DialogHeader>

                <PhoneField
                    input={field}
                    error={error}
                    disabled={isPending}
                    onEnter={submit}
                    idPrefix="mobile"
                />

                <div className="mt-2 flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setOpen(false)
                        }}
                        disabled={isPending}
                    >
                        {t("auth.mobilePrompt.later")}
                    </Button>
                    <Button variant="gold" onClick={submit} disabled={isPending}>
                        {isPending && <Loader2 className="size-4 animate-spin" />}
                        {t("auth.mobilePrompt.save")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
