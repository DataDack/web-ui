import { createContext, useContext, useState, type ReactNode } from "react"

import { STORAGE_KEY_ACTIVE_RG } from "@/modules/resource-groups/resource-groups.constants"
import type { ResourceGroup } from "@/modules/resource-groups/resource-groups.types"

interface ResourceGroupContextValue {
  activeRG: ResourceGroup | null
  setActiveRG: (rg: ResourceGroup | null) => void
}

const ResourceGroupContext = createContext<ResourceGroupContextValue | null>(null)

function loadStored(): ResourceGroup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_RG)
    return raw ? (JSON.parse(raw) as ResourceGroup) : null
  } catch {
    return null
  }
}

export function ResourceGroupProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [activeRG, setActiveRGState] = useState<ResourceGroup | null>(loadStored)

  const setActiveRG = (rg: ResourceGroup | null) => {
    setActiveRGState(rg)
    if (rg) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_RG, JSON.stringify(rg))
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_RG)
    }
  }

  return (
    <ResourceGroupContext.Provider value={{ activeRG, setActiveRG }}>
      {children}
    </ResourceGroupContext.Provider>
  )
}

export function useResourceGroup() {
  const ctx = useContext(ResourceGroupContext)
  if (!ctx) throw new Error("useResourceGroup must be used inside ResourceGroupProvider")
  return ctx
}
