import { useEffect, useRef, useState } from "react"

import { Button, cn } from "@datadack/common-ui"
import RFB from "@novnc/novnc"
import { ClipboardType, Keyboard, Maximize, Minimize } from "lucide-react"
import { useTranslation } from "react-i18next"

import { consoleApi, consoleWsUrl } from "../console.api"
import { CLOSE_CONSOLE_FAILED } from "../console.types"

type Status = "connecting" | "connected" | "error" | "closed"

const STATUS_DOT: Record<Status, string> = {
  connecting: "bg-amber-500",
  connected: "bg-green-500",
  error: "bg-red-500",
  closed: "bg-red-500",
}

/** The close code the server uses when it could not open the display. */

/** Longest clipboard text "Paste as keystrokes" will type. */
const MAX_PASTE = 512

const XK_SHIFT_L = 0xffe1
const XK_RETURN = 0xff0d
// Characters that need Shift on a US layout — the layout QEMU assumes for a
// keysym it has to turn back into a scancode.
const SHIFTED = new Set('~!@#$%^&*()_+{}|:"<>?'.split(""))

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * VncConsole shows a VM's display in the browser (noVNC). It mints a single-use
 * "vnc" console ticket, opens the socket itself — so a refusal's close reason
 * can be shown — and hands the open socket to noVNC. The server has already
 * completed VNC authentication with the node, so no password is involved here.
 */
export function VncConsole({
  instanceId,
  className,
}: Readonly<{ instanceId: string; className?: string }>) {
  const { t } = useTranslation()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const rfbRef = useRef<RFB | null>(null)
  const [status, setStatus] = useState<Status>("connecting")
  const [error, setError] = useState("")
  const [fullscreen, setFullscreen] = useState(false)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    let disposed = false
    let ws: WebSocket | null = null

    // A refusal already set "error"; a plain end of session must not hide it.
    const onDisconnect = () => {
      setStatus((s) => (s === "error" ? s : "closed"))
    }

    const onSocketClose = (ev: CloseEvent) => {
      if (ev.code !== CLOSE_CONSOLE_FAILED) return
      setStatus("error")
      setError(ev.reason || t("vms.windows.console.failed", "The console could not be opened"))
    }

    async function connect() {
      try {
        const ticket = await consoleApi.mintSession(instanceId, "vnc")
        if (disposed || !screenRef.current) return
        ws = new WebSocket(consoleWsUrl(ticket))
        ws.binaryType = "arraybuffer"
        // A listener, not onclose: noVNC takes over the on* handlers.
        ws.addEventListener("close", onSocketClose)

        const rfb = new RFB(screenRef.current, ws, { shared: true })
        rfb.scaleViewport = true
        rfb.resizeSession = false
        rfb.focusOnClick = true
        rfb.background = "#0b0e14"
        rfb.addEventListener("connect", () => {
          setStatus("connected")
          rfb.focus()
        })
        rfb.addEventListener("disconnect", onDisconnect)
        rfb.addEventListener("securityfailure", () => {
          setStatus("error")
        })
        rfbRef.current = rfb
      } catch (e) {
        if (disposed) return
        setStatus("error")
        setError(e instanceof Error ? e.message : "failed to start console")
      }
    }

    void connect()

    return () => {
      disposed = true
      try {
        rfbRef.current?.disconnect()
      } catch {
        /* already disconnected */
      }
      rfbRef.current = null
      ws?.close()
    }
  }, [instanceId, t])

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === wrapperRef.current)
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
    }
  }, [])

  // Types the clipboard into the guest one key at a time. A VNC display has no
  // shared clipboard with Windows, and this is how a password gets onto the
  // sign-in screen without typing it by hand.
  const pasteAsKeys = async () => {
    const rfb = rfbRef.current
    if (!rfb) return
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      setError(
        t("vms.windows.console.clipboardDenied", "The browser did not allow clipboard access"),
      )
      return
    }
    setTyping(true)
    try {
      for (const ch of text.slice(0, MAX_PASTE)) {
        if (ch === "\n") {
          rfb.sendKey(XK_RETURN, "Enter")
        } else if (ch >= " " && ch <= "~") {
          const shift = SHIFTED.has(ch) || (ch >= "A" && ch <= "Z")
          if (shift) rfb.sendKey(XK_SHIFT_L, "ShiftLeft", true)
          rfb.sendKey(ch.charCodeAt(0), null)
          if (shift) rfb.sendKey(XK_SHIFT_L, "ShiftLeft", false)
        }
        await sleep(15)
      }
    } finally {
      setTyping(false)
      rfb.focus()
    }
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void wrapperRef.current?.requestFullscreen()
    }
  }

  const statusLabel: Record<Status, string> = {
    connecting: t("vms.windows.console.connecting", "Connecting…"),
    connected: t("vms.windows.console.connected", "Connected"),
    error: t("vms.windows.console.error", "Connection failed"),
    closed: t("vms.windows.console.closed", "Session ended"),
  }
  const live = status === "connected"

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-md border border-border bg-[#0b0e14]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
        <span>{statusLabel[status]}</span>
        {error && <span className="truncate text-red-400">— {error}</span>}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={!live}
            onClick={() => rfbRef.current?.sendCtrlAltDel()}
          >
            <Keyboard className="size-3.5" />
            {t("vms.windows.console.ctrlAltDel", "Ctrl+Alt+Del")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={!live || typing}
            onClick={() => void pasteAsKeys()}
          >
            <ClipboardType className="size-3.5" />
            {t("vms.windows.console.paste", "Paste as keystrokes")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={toggleFullscreen}
            aria-label={
              fullscreen
                ? t("vms.windows.console.exitFullscreen", "Exit full screen")
                : t("vms.windows.console.fullscreen", "Full screen")
            }
          >
            {fullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          </Button>
        </div>
      </div>
      <div ref={screenRef} className="min-h-0 flex-1" />
    </div>
  )
}
