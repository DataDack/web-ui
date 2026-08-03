import { useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { KeyRound } from "lucide-react"

import { connection } from "@/lib/api"

import { Button, Input } from "@datadack/common-ui"
/**
 * The escape hatch, not the front door.
 *
 * Signing in is the normal way into the console, and it puts the session in an
 * HttpOnly cookie this file cannot touch. What stays here is for the cases
 * sign-in does not cover: pointing the console at a different control plane, and
 * pasting an access token copied from the identity service.
 *
 * That token is held in localStorage and sent as a bearer header — weaker than
 * the cookie, which page scripts cannot read at all. It is never put in a URL,
 * so it does not end up in proxy or access logs, and it is dropped as soon as
 * the control plane rejects it.
 */
export function ConnectionSettings() {
  const [open, setOpen] = useState(false)
  const [base, setBase] = useState("")
  const [token, setToken] = useState("")
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  /**
   * Re-reads storage every time the panel opens.
   *
   * Initialising this state once at mount let it drift: storage changes
   * underneath the component — a token dropped on expiry, or cleared by another
   * tab — while the field kept showing the value captured at page load. The
   * operator then saw a token that was no longer being sent, and "fixed" it by
   * pressing Save, which silently re-wrote the same string. That made a storage
   * problem look like a server one.
   */
  const openPanel = () => {
    setBase(connection.base())
    setToken(connection.token())
    setExpiresAt(connection.tokenExpiresAt())
    setError("")
    setOpen(true)
  }

  const save = () => {
    if (!connection.set(base.trim(), token.trim())) {
      // The panel deliberately stays open: closing it would look like success.
      setError("Could not save — this browser is blocking local storage.")
      return
    }
    setError("")
    setExpiresAt(connection.tokenExpiresAt())
    setOpen(false)
    void queryClient.invalidateQueries()
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          if (open) setOpen(false)
          else openPanel()
        }}
        aria-label="Connection settings"
        aria-expanded={open}
      >
        {/* No warning tint when unset: an empty field is the expected state for
            a signed-in operator, and flagging it would train them to ignore it. */}
        <KeyRound className="size-4" />
      </Button>

      {open && (
        <>
          {/* Click-away layer, so the popover closes without a global listener. */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close connection settings"
            onClick={() => {
              setOpen(false)
            }}
          />
          <div className="border-border bg-popover text-popover-foreground absolute right-0 z-50 mt-2 w-80 rounded-xl border p-3 shadow-lg">
            <p className="mb-2 text-[13px] font-medium">Connection</p>

            <label className="text-muted-foreground mb-1 block text-[11px]" htmlFor="api-base">
              API base
            </label>
            <Input
              id="api-base"
              value={base}
              onChange={(event) => {
                setBase(event.target.value)
              }}
              placeholder="same origin"
              className="mb-3 h-8 text-[12px]"
            />

            <label className="text-muted-foreground mb-1 block text-[11px]" htmlFor="api-token">
              Access token
            </label>
            <Input
              id="api-token"
              type="password"
              value={token}
              onChange={(event) => {
                setToken(event.target.value)
              }}
              placeholder="paste an access token"
              className="mb-3 h-8 font-mono text-[12px]"
            />

            <p className="text-muted-foreground mb-3 text-[11px]">
              {/* The expiry is shown because it is the one thing that silently
                  invalidates a token, and an operator staring at a rejected
                  request has no other way to tell a spent token from a server
                  fault. */}
              {expiresAt
                ? `Valid until ${expiresAt.toLocaleString()}. Stored in this browser only and sent as an Authorization header.`
                : "Stored in this browser only and sent as an Authorization header."}
            </p>

            {error && (
              <p role="alert" className="text-status-danger mb-3 text-[11px]">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={save}>
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
