import { useEffect, type ReactNode } from "react"

import { Skeleton } from "@datadack/common-ui"
import { useParams, useSearchParams } from "react-router-dom"

import { ConsoleTerminal } from "@/modules/console/components/ConsoleTerminal"
import { VncConsole } from "@/modules/console/components/VncConsole"
import type { ConsoleTarget } from "@/modules/console/console.api"
import { useScreen } from "@/services/api/screen"

import { useInstance } from "../vms.hooks"

// Standalone console tab: nothing but the terminal (or, for target=vnc, the
// guest's display) itself, edge to edge. The tab title carries the instance name
// so the window stays identifiable.
export function InstanceConsolePage() {
  useScreen("vms.vm-console")
  const { id = "" } = useParams()
  const [params] = useSearchParams()
  const rawTarget = params.get("target")
  const target: ConsoleTarget =
    rawTarget === "host" || rawTarget === "guest" || rawTarget === "vnc" ? rawTarget : "ssh"
  // Guest login account for target=ssh, from the Connect page's username field.
  const username = params.get("user") ?? undefined
  const { data: instance, isLoading } = useInstance(id)

  useEffect(() => {
    if (instance) {
      const kind = { guest: "Serial console", vnc: "Console", host: "Host shell", ssh: "SSH" }
      document.title = `${instance.name} — ${kind[target]}`
    }
  }, [instance, target])

  let content: ReactNode
  if (isLoading) {
    content = <Skeleton className="h-full w-full" />
  } else if (target === "vnc") {
    content = <VncConsole key={`${id}:vnc`} instanceId={id} className="rounded-none border-0" />
  } else {
    content = (
      <ConsoleTerminal
        key={`${id}:${target}:${username ?? ""}`}
        instanceId={id}
        target={target}
        username={username}
        className="rounded-none border-0"
      />
    )
  }

  return <div className="h-dvh bg-background">{content}</div>
}
