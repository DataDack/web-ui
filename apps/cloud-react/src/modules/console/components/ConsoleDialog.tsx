import { Server, TerminalIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"

import type { ConsoleTarget } from "../console.api"
import { ConsoleTerminal } from "./ConsoleTerminal"

interface ConsoleDialogProps {
  instanceId: string
  instanceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "guest" (default) opens a shell into the VM; "host" opens a shell into the
   *  Proxmox hypervisor node itself. */
  target?: ConsoleTarget
}

/** A modal terminal. In "guest" mode it's the "Connect to VM" flow; in "host"
 *  mode it's an SSH/PTY shell into the Proxmox node running the hypervisor.
 *  Keyed on instanceId+target so the ConsoleTerminal (and its WebSocket) is
 *  freshly created each time it opens and torn down on close. */
export function ConsoleDialog({
  instanceId,
  instanceName,
  open,
  onOpenChange,
  target = "guest",
}: Readonly<ConsoleDialogProps>) {
  const isHost = target === "host"
  const Icon = isHost ? Server : TerminalIcon
  const title = isHost ? "Proxmox Host Shell" : `Connect to ${instanceName}`
  const description = isHost
    ? "Browser shell into the Proxmox hypervisor node. Closing the window ends the session."
    : "Browser SSH session into this instance. Closing the window ends the session."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] max-w-4xl flex-col gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          {open && (
            <ConsoleTerminal
              key={`${instanceId}:${target}`}
              instanceId={instanceId}
              target={target}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
