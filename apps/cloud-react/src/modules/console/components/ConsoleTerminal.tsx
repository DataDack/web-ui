import { useEffect, useRef, useState } from "react"

import { cn } from "@datadack/common-ui"
import { FitAddon } from "@xterm/addon-fit"
import { Terminal } from "@xterm/xterm"

import "@xterm/xterm/css/xterm.css"

import { consoleApi, consoleWsUrl, type ConsoleTarget } from "../console.api"

type Status = "connecting" | "connected" | "error" | "closed"

const STATUS_LABEL: Record<Status, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  error: "Connection failed",
  closed: "Session ended",
}

const STATUS_DOT: Record<Status, string> = {
  connecting: "bg-amber-500",
  connected: "bg-green-500",
  error: "bg-red-500",
  closed: "bg-red-500",
}

/**
 * ConsoleTerminal opens an SSH-in-browser session into one instance: it mints a
 * single-use ticket, opens the WebSocket, and bridges xterm.js <-> the backend
 * (binary frames = terminal output, JSON = input/resize). Mirrors the verified
 * cloudshell-sandbox wiring.
 */
export function ConsoleTerminal({
  instanceId,
  target = "guest",
  username,
  className,
}: Readonly<{
  instanceId: string
  target?: ConsoleTarget
  /** Guest account for "ssh" sessions; empty → the image's default user. */
  username?: string
  className?: string
}>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>("connecting")
  const [error, setError] = useState("")

  useEffect(() => {
    let disposed = false
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, "SF Mono", "Cascadia Code", Consolas, monospace',
      scrollback: 5000,
      theme: { background: "#0b0e14", foreground: "#c9d1d9", cursor: "#e3b341" },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    let ws: WebSocket | null = null
    const refit = () => {
      try {
        fit.fit()
      } catch {
        /* container not laid out yet */
      }
    }
    const ro = new ResizeObserver(refit)

    const sendSize = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }))
      }
    }
    const onData = term.onData((d) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input", data: d }))
    })
    const onResize = term.onResize(sendSize)

    async function connect() {
      if (!containerRef.current) return
      term.open(containerRef.current)
      refit()
      ro.observe(containerRef.current)
      try {
        const ticket = await consoleApi.mintSession(instanceId, target, username)
        if (disposed) return
        ws = new WebSocket(consoleWsUrl(ticket))
        ws.binaryType = "arraybuffer"
        ws.onopen = () => {
          setStatus("connected")
          refit()
          sendSize() // send initial size right after connect
          term.focus()
        }
        ws.onmessage = (ev) => {
          if (ev.data instanceof ArrayBuffer) {
            term.write(new Uint8Array(ev.data)) // raw PTY output (fast path)
            return
          }
          try {
            const msg = JSON.parse(ev.data as string)
            if (msg.type === "error") {
              setError(msg.message)
              term.writeln(`\r\n\x1b[31m✖ ${msg.message}\x1b[0m`)
            }
          } catch {
            /* ignore non-JSON control frames */
          }
        }
        ws.onclose = () => {
          setStatus((s) => (s === "error" ? s : "closed"))
        }
        ws.onerror = () => {
          setStatus("error")
        }
      } catch (e) {
        if (disposed) return
        setStatus("error")
        setError(e instanceof Error ? e.message : "failed to start console")
      }
    }

    void connect()

    return () => {
      disposed = true
      ro.disconnect()
      onData.dispose()
      onResize.dispose()
      ws?.close()
      term.dispose()
    }
  }, [instanceId, target, username])

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-md border border-border bg-[#0b0e14]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
        <span>{STATUS_LABEL[status]}</span>
        {error && <span className="truncate text-red-400">— {error}</span>}
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 p-2" />
    </div>
  )
}
