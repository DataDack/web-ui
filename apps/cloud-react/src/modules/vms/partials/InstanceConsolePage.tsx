import { useEffect } from "react"

import { useParams, useSearchParams } from "react-router-dom"

import { ConsoleTerminal } from "@/modules/console/components/ConsoleTerminal"
import type { ConsoleTarget } from "@/modules/console/console.api"
import { useScreen } from "@/services/api/screen"

import { Skeleton } from "@datadack/serverless-ui"

import { useInstance } from "../vms.hooks"

// Standalone terminal tab: nothing but the terminal itself, edge to edge. The
// tab title carries the instance name so the window stays identifiable.
export function InstanceConsolePage() {
  useScreen("vms.vm-console")
  const { id = "" } = useParams()
  const [params] = useSearchParams()
  const rawTarget = params.get("target")
  const target: ConsoleTarget = rawTarget === "host" || rawTarget === "guest" ? rawTarget : "ssh"
  // Guest login account for target=ssh, from the Connect page's username field.
  const username = params.get("user") ?? undefined
  const { data: instance, isLoading } = useInstance(id)

  useEffect(() => {
    if (instance) {
      document.title = `${instance.name} — ${target === "guest" ? "Serial console" : "SSH"}`
    }
  }, [instance, target])

  return (
    <div className="h-dvh bg-background">
      {isLoading ? (
        <Skeleton className="h-full w-full" />
      ) : (
        <ConsoleTerminal
          key={`${id}:${target}:${username ?? ""}`}
          instanceId={id}
          target={target}
          username={username}
          className="rounded-none border-0"
        />
      )}
    </div>
  )
}
