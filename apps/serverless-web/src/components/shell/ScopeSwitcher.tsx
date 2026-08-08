import { useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { Building2, Layers3 } from "lucide-react"

import { connection } from "@/lib/api"
import { useSession } from "@/lib/auth"
import { useTenants } from "@/lib/queries"

/**
 * Tenant and resource-group selection.
 *
 * Both controls always render. An earlier version hid them when there was
 * nothing to pick — a pinned credential collapsed the account control to a
 * static label, and an empty group list dropped that select entirely — which
 * left an operator with no way to tell "this console cannot scope" apart from
 * "this console forgot to show me the control". A disabled select carrying its
 * reason in a tooltip says which.
 *
 * Selecting a tenant sets the header every request carries and clears the
 * cache, so nothing from the previous tenant survives the switch.
 *
 * The account list comes from the identity service when the operator signed in,
 * and from the control plane's own tenant list otherwise. The difference
 * matters: the control plane only knows an account once it owns a function, so
 * a switcher built from it cannot offer an account you have not deployed to
 * yet — which is exactly the account you need to select in order to deploy the
 * first one. Resource groups have the same gap and no second source yet: they
 * are reverse-indexed from functions that already carry one, so the list stays
 * empty until something populates `resourceGroupId` on deploy.
 */
export function ScopeSwitcher() {
  const { data } = useTenants()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [accountId, setAccountId] = useState(connection.accountId())
  const [resourceGroupId, setResourceGroupId] = useState(connection.resourceGroup())

  // Merge, rather than pick one: the identity service knows every account the
  // operator belongs to, the control plane knows how many functions each holds.
  const deployed = data?.accounts ?? []
  const membership = session?.accounts ?? []
  const byId = new Map(deployed.map((account) => [account.accountId, account]))
  const accounts = [
    ...membership.map((account) => ({
      accountId: account.id,
      // Name and number together: a central account's name ("Default Account")
      // is not distinctive enough to tell it apart from the control plane's own
      // local default, and the number is what an operator recognises it by.
      label: [account.name, account.accountNumber].filter(Boolean).join(" · ") || account.id,
      resourceGroupIds: byId.get(account.id)?.resourceGroupIds ?? [],
      functions: byId.get(account.id)?.functions ?? 0,
    })),
    // Anything the control plane knows about that the operator is not a member
    // of — visible to a super admin, and dropping it would hide real tenants.
    ...deployed
      .filter((account) => !membership.some((m) => m.id === account.accountId))
      .map((account) => ({
        accountId: account.accountId,
        label: account.accountId,
        resourceGroupIds: account.resourceGroupIds,
        functions: account.functions,
      })),
  ]
  // Neither source knew anything, but the control plane still named a current
  // account. Showing it beats rendering nothing at all.
  if (accounts.length === 0 && data?.current) {
    accounts.push({
      accountId: data.current,
      label: data.current,
      resourceGroupIds: [],
      functions: 0,
    })
  }

  const current = accounts.find((account) => account.accountId === accountId)
  const resourceGroupIds = current?.resourceGroupIds ?? accounts[0]?.resourceGroupIds ?? []

  // A pinned credential cannot switch accounts, so the control shows which
  // account it is stuck on rather than a selection the operator never made.
  const switchable = data?.switchable ?? false
  const accountValue = switchable ? accountId : (data?.current ?? accounts[0]?.accountId ?? "")
  const noResourceGroups = resourceGroupIds.length === 0

  const apply = (nextAccount: string, nextResourceGroup: string) => {
    connection.setScope(nextAccount, nextResourceGroup)
    setAccountId(nextAccount)
    setResourceGroupId(nextResourceGroup)
    // Everything on screen was fetched for the previous scope.
    void queryClient.invalidateQueries()
  }

  if (accounts.length === 0) return null

  const selectClass =
    "border-border bg-card text-foreground h-7 rounded-md border px-1.5 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-60"

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <label className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Building2 className="size-3.5" />
        <span className="sr-only">Account</span>
        <select
          value={accountValue}
          disabled={!switchable}
          title={switchable ? undefined : "This credential is pinned to a single account"}
          onChange={(event) => {
            // A resource group belongs to an account, so a stale one must not
            // carry across the switch.
            apply(event.target.value, "")
          }}
          className={selectClass}
        >
          {switchable && <option value="">All accounts</option>}
          {accounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>
              {account.label} ({account.functions})
            </option>
          ))}
        </select>
      </label>

      <label className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Layers3 className="size-3.5" />
        <span className="sr-only">Resource group</span>
        <select
          value={resourceGroupId}
          disabled={noResourceGroups}
          title={
            noResourceGroups
              ? "No resource groups — none of this account's functions carry one"
              : undefined
          }
          onChange={(event) => {
            apply(accountId, event.target.value)
          }}
          className={selectClass}
        >
          <option value="">{noResourceGroups ? "No resource groups" : "All resource groups"}</option>
          {resourceGroupIds.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
