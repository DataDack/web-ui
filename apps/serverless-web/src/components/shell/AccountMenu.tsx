import { LogOut, ShieldCheck, User } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { principalLabel, sessionIsSignedIn, useSession, useSignOut } from "@/lib/auth"

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@datadack/common-ui"

/**
 * Who is signed in, and the way out.
 *
 * It renders for the service credential and for an auth-disabled control plane
 * too, because "which credential is this console driving" is worth showing in
 * all three cases — only the sign-out item is conditional, since there is
 * nothing to end in the other two.
 */
export function AccountMenu() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const signOut = useSignOut()

  if (!session) return null

  const label = principalLabel(session)
  const signedIn = sessionIsSignedIn(session)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Account">
          <User className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-[13px] font-medium">{label}</span>
          <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
            {session.platformAdmin ? (
              <>
                <ShieldCheck className="size-3" />
                Platform super admin
              </>
            ) : (
              <>Account {session.accountId || "unscoped"}</>
            )}
          </span>
        </DropdownMenuLabel>

        {signedIn && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signOut.isPending}
              onSelect={() => {
                signOut.mutate(undefined, {
                  // Navigate on settle, not success: a failed sign-out request
                  // has still cleared the local cache, and leaving the operator
                  // on a console whose data is gone is worse than sending them
                  // to a sign-in form that will tell them if they are still in.
                  onSettled: () => {
                    void navigate("/login", { replace: true })
                  },
                })
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
