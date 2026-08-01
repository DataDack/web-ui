import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

// Globally selected zone (shown in the top bar). Resource creation flows read
// this so a VM/network lands in the zone the user is currently scoped to.
const STORAGE_KEY = "console-active-region"

interface RegionContextValue {
    /** Active zone code, e.g. "noida-1". Null until the catalog resolves one. */
    activeRegionCode: string | null
    setActiveRegionCode: (code: string) => void
}

const RegionContext = createContext<RegionContextValue | null>(null)

export function RegionProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [activeRegionCode, setState] = useState<string | null>(() =>
        localStorage.getItem(STORAGE_KEY)
    )

    const setActiveRegionCode = useCallback((code: string) => {
        setState(code)
        localStorage.setItem(STORAGE_KEY, code)
    }, [])

    return (
        <RegionContext.Provider value={{ activeRegionCode, setActiveRegionCode }}>
            {children}
        </RegionContext.Provider>
    )
}

export function useActiveRegion() {
    const ctx = useContext(RegionContext)
    if (!ctx) throw new Error("useActiveRegion must be used inside RegionProvider")
    return ctx
}
