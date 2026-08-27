import { createContext, useContext, type ReactNode } from "react"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

import { setTransport } from "./runtime"
import type { AIAutomationsTransport } from "./types"
const Context = createContext<AIAutomationsTransport | null>(null)
export interface AIAutomationsProviderProps {
  transport: AIAutomationsTransport
  children: ReactNode
}
export function AIAutomationsProvider({
  transport,
  children,
}: Readonly<AIAutomationsProviderProps>) {
  setTransport(transport)
  return (
    <Context.Provider value={transport}>
      {children}
      <ToastContainer position="bottom-right" newestOnTop />
    </Context.Provider>
  )
}
export function useAIAutomations() {
  const value = useContext(Context)
  if (!value) throw new Error("useAIAutomations must be used inside AIAutomationsProvider")
  return value
}
