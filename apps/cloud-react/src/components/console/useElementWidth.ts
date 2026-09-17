import { useEffect, useState } from "react"

/**
 * Measures an element's content width. Returns a callback ref rather than a ref
 * object so the observer re-attaches whenever the element mounts — e.g. a chart
 * that first rendered an empty placeholder and only later received data.
 */
export function useElementWidth(): [(element: HTMLElement | null) => void, number] {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!element) return
    setWidth(element.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [element])

  return [setElement, width]
}
