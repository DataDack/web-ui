import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { connection } from '@/lib/api'

/**
 * Where the operator token is entered.
 *
 * The console is served from the control plane's own port and its shell is auth
 * exempt, but the API routes it calls are not. Without somewhere to put a token
 * the whole console is unusable the moment auth is turned on, so this lives in
 * the topbar rather than behind a settings page.
 *
 * The token is held in localStorage and sent as a bearer header. It is never put
 * in a URL, so it does not end up in proxy or access logs.
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
        <KeyRound className={connection.token() ? 'size-4' : 'text-status-warning size-4'} />
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
              Bearer token
            </label>
            <Input
              id="api-token"
              type="password"
              value={token}
              onChange={(event) => {
                setToken(event.target.value)
              }}
              placeholder="operator token"
              className="mb-3 h-8 font-mono text-[12px]"
            />

            <p className="text-muted-foreground mb-3 text-[11px]">
              Stored in this browser only and sent as an Authorization header.
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
