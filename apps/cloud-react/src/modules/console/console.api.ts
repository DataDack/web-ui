import { apiPost } from "@/services/api/client"

import type { SessionTicket } from "./console.types"

// The "Connect to VM" console is a Linux-only, SSH-in-browser feature: it opens
// a terminal into a specific instance over a WebSocket bridged to an SSH PTY.

/** An instance is Linux unless its resolved OS label is Windows. The SSH/PTY
 *  console only applies to Linux guests (Windows would use RDP). */
export function isLinuxOS(os: string | undefined): boolean {
  return !!os && !/windows/i.test(os)
}

/** Where/how a console session terminates:
 *   - "ssh"   — GCE-style browser SSH: a throwaway key is generated and injected,
 *               and you land in a shell with no password (the default "Connect").
 *   - "guest" — the VM's own Proxmox serial console (shows a login prompt).
 *   - "host"  — the Proxmox hypervisor node shell (admin). */
export type ConsoleTarget = "ssh" | "guest" | "host"

export const consoleApi = {
  /** Mint a single-use console ticket for an instance (authenticated REST).
   *  Default "ssh" is the keyless browser login; "guest"/"host" open the
   *  Proxmox serial console / node shell. `username` overrides the guest
   *  account an "ssh" session logs in as (empty → image default). */
  mintSession: (
    instanceId: string,
    target: ConsoleTarget = "ssh",
    username?: string,
  ): Promise<SessionTicket> =>
    apiPost<SessionTicket>("/console/terminal/sessions", {
      instance_id: instanceId,
      target,
      ...(username ? { username } : {}),
    }),
}

/** Build the absolute WebSocket URL for a minted ticket. Uses the ws_origin the
 *  backend returned when the API ingress can't carry WebSocket upgrades (AWS
 *  API Gateway strips them — CONSOLE_WS_PUBLIC_ORIGIN points at a WS-capable
 *  host instead). Otherwise same-origin: in dev the Vite proxy forwards /api
 *  with ws:true; a prod proxy must pass the Upgrade/Connection headers. */
export function consoleWsUrl(ticket: SessionTicket): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws"
  // ws_origin is omitempty server-side: absent (never "") when unset.
  const origin = ticket.ws_origin ?? `${proto}://${window.location.host}`
  return `${origin}${ticket.ws_path}?ticket=${encodeURIComponent(ticket.ticket)}`
}
