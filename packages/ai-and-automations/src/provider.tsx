import {createContext,useContext,type ReactNode} from "react"
import type {AIAutomationsTransport} from "./types"
import {setTransport} from "./runtime"
const Context=createContext<AIAutomationsTransport|null>(null)
export interface AIAutomationsProviderProps {transport:AIAutomationsTransport;children:ReactNode}
export function AIAutomationsProvider({transport,children}:AIAutomationsProviderProps){setTransport(transport);return <Context.Provider value={transport}>{children}</Context.Provider>}
export function useAIAutomations(){const value=useContext(Context);if(!value)throw new Error("useAIAutomations must be used inside AIAutomationsProvider");return value}
