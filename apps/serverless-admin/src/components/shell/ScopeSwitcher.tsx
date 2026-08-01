import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Building2, Layers3 } from 'lucide-react'

import { connection } from '@/lib/api'
import { useTenants } from '@/lib/queries'

/**
 * Tenant and namespace selection.
 *
 * The control plane decides whether switching is even possible: a credential
 * pinned to an account gets `switchable: false` and a one-entry list, and the
 * switcher renders as a static label rather than a control that cannot do
 * anything. Selecting a tenant sets the header every request carries and clears
 * the cache, so nothing from the previous tenant survives the switch.
 */
export function ScopeSwitcher() {
  const { data } = useTenants()
  const queryClient = useQueryClient()
  const [accountId, setAccountId] = useState(connection.accountId())
  const [namespace, setNamespace] = useState(connection.namespace())

  const accounts = data?.accounts ?? []
  const current = accounts.find((account) => account.accountId === accountId)
  const namespaces = current?.namespaces ?? accounts[0]?.namespaces ?? []

  const apply = (nextAccount: string, nextNamespace: string) => {
    connection.setScope(nextAccount, nextNamespace)
    setAccountId(nextAccount)
    setNamespace(nextNamespace)
    // Everything on screen was fetched for the previous scope.
    void queryClient.invalidateQueries()
  }

  if (accounts.length === 0) return null

  if (!data?.switchable) {
    return (
      <span className="text-muted-foreground hidden items-center gap-1.5 font-mono text-[11px] lg:flex">
        <Building2 className="size-3.5" />
        {data?.current ?? accounts[0]?.accountId}
      </span>
    )
  }

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <label className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Building2 className="size-3.5" />
        <span className="sr-only">Account</span>
        <select
          value={accountId}
          onChange={(event) => {
            // Namespaces belong to an account, so a stale one must not carry
            // across the switch.
            apply(event.target.value, '')
          }}
          className="border-border bg-card text-foreground h-7 rounded-md border px-1.5 font-mono text-[11px]"
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>
              {account.accountId} ({account.functions})
            </option>
          ))}
        </select>
      </label>

      {namespaces.length > 0 && (
        <label className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <Layers3 className="size-3.5" />
          <span className="sr-only">Namespace</span>
          <select
            value={namespace}
            onChange={(event) => {
              apply(accountId, event.target.value)
            }}
            className="border-border bg-card text-foreground h-7 rounded-md border px-1.5 font-mono text-[11px]"
          >
            <option value="">All namespaces</option>
            {namespaces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
