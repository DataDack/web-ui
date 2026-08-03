import { useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { Building2, Layers3 } from "lucide-react"

import { connection } from "@/lib/api"
import { useSession } from "@/lib/auth"
import { useTenants } from "@/lib/queries"

/**
 * Tenant and namespace selection.
 *
 * The control plane decides whether switching is even possible: a credential
 * pinned to an account gets `switchable: false` and a one-entry list, and the
 * switcher renders as a static label rather than a control that cannot do
 * anything. Selecting a tenant sets the header every request carries and clears
 * the cache, so nothing from the previous tenant survives the switch.
 *
 * The list itself comes from the identity service when the operator signed in,
 * and from the control plane's own tenant list otherwise. The difference
 * matters: the control plane only knows an account once it owns a function, so
 * a switcher built from it cannot offer an account you have not deployed to
 * yet — which is exactly the account you need to select in order to deploy the
 * first one.
 */
export function ScopeSwitcher() {
  const { data } = useTenants()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [accountId, setAccountId] = useState(connection.accountId())
  const [namespace, setNamespace] = useState(connection.namespace())

  // Merge, rather than pick one: the identity service knows every account the
  // operator belongs to, the control plane knows how many functions each holds.
  const deployed = data?.accounts ?? []
  const membership = session?.accounts ?? []
  const byId = new Map(deployed.map((account) => [account.accountId, account]))
  const accounts = [
    ...membership.map((account) => ({
      accountId: account.id,
      label: account.name || account.accountNumber || account.id,
      namespaces: byId.get(account.id)?.namespaces ?? [],
      functions: byId.get(account.id)?.functions ?? 0,
    })),
    // Anything the control plane knows about that the operator is not a member
    // of — visible to a super admin, and dropping it would hide real tenants.
    ...deployed
      .filter((account) => !membership.some((m) => m.id === account.accountId))
      .map((account) => ({
        accountId: account.accountId,
        label: account.accountId,
        namespaces: account.namespaces,
        functions: account.functions,
      })),
  ]
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
            apply(event.target.value, "")
          }}
          className="border-border bg-card text-foreground h-7 rounded-md border px-1.5 font-mono text-[11px]"
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>
              {account.label} ({account.functions})
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
