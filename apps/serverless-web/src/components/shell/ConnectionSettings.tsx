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
 * driving one that has no identity service wired by pasting its service
 * credential as "client-id:client-secret".
 *
 * That credential is held in localStorage and sent as a bearer header. It is
 * never put in a URL, so it does not end up in proxy or access logs.
 */
export function ConnectionSettings() {
  const [open, setOpen] = useState(false)
  const [base, setBase] = useState(connection.base())
  const [token, setToken] = useState(connection.token())
  const queryClient = useQueryClient()

  const save = () => {
    connection.set(base.trim(), token.trim())
    setOpen(false)
    void queryClient.invalidateQueries()
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          setOpen((current) => !current)
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
              Service credential
            </label>
            <Input
              id="api-token"
              type="password"
              value={token}
              onChange={(event) => {
                setToken(event.target.value)
              }}
              placeholder="client-id:client-secret"
              className="mb-3 h-8 font-mono text-[12px]"
            />

            <p className="text-muted-foreground mb-3 text-[11px]">
              Optional. Leave empty when signed in — the session covers it. Stored in this browser
              only and sent as an Authorization header.
            </p>

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
