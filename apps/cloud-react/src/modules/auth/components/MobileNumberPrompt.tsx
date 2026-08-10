import { useEffect, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

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
 *
 * This component holds NO hook that fetches: everything the form needs lives in
 * `MobileNumberForm` below, which Radix mounts only while the dialog is open.
 * The split is the whole point. `usePhoneInput` pulls the country list for its
 * dial-code picker, and a hook cannot be called conditionally — so calling it
 * here meant every console page fetched `/countries` to populate a dialog that,
 * for any user who already has a number, never rendered at all.
 */
export function MobileNumberPrompt() {
  const { user } = useAuth()

  const [open, setOpen] = useState(false)
  const [locallySavedUserId, setLocallySavedUserId] = useState<string | null>(null)

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
    setOpen(true)
  }, [needsPhone])

  // `user` is redundant with needsPhone at runtime; it is what narrows the type.
  if (!user || !needsPhone) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md glass-3">
        <MobileNumberForm
          defaultCountryIso={user.country}
          onSaved={() => {
            localStorage.setItem(`${SAVED_KEY_PREFIX}:${user.id}`, "true")
            setLocallySavedUserId(user.id)
            setOpen(false)
          }}
          onDismiss={() => {
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

interface MobileNumberFormProps {
  /** Seeds the dial-code picker; an empty value falls back inside the hook. */
  defaultCountryIso: string
  /** The number was accepted — the prompt is done with this user. */
  onSaved: () => void
  /** "Later": close and let the throttle offer it again next window. */
  onDismiss: () => void
}

/**
 * The dialog's body, and the only place that reaches for the country list.
 *
 * It is rendered inside `DialogContent`, which Radix portals in on open and
 * unmounts on close, so `usePhoneInput`'s `/countries` query runs when someone
 * is actually being asked for a number and at no other time.
 */
function MobileNumberForm({
  defaultCountryIso,
  onSaved,
  onDismiss,
}: Readonly<MobileNumberFormProps>) {
  const { t } = useTranslation()
  const { mutate, isPending } = useUpdatePhone()

  const [error, setError] = useState<string | null>(null)
  const phone = usePhoneInput(defaultCountryIso)

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
      onSuccess: onSaved,
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
    <>
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
        <Button variant="ghost" onClick={onDismiss} disabled={isPending}>
          {t("auth.mobilePrompt.later")}
        </Button>
        <Button variant="gold" onClick={submit} disabled={isPending} loading={isPending}>
          {t("auth.mobilePrompt.save")}
        </Button>
      </div>
    </>
  )
}
