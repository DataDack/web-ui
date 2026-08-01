import { useEffect, useRef, useState } from "react"

import { animate, useReducedMotion } from "motion/react"

import { DUR, EASE } from "./motion-config"

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  className?: string
}

export function AnimatedNumber({ value, format, className }: Readonly<AnimatedNumberProps>) {
  const reduced = useReducedMotion()
  const previous = useRef(0)
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    if (reduced) {
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: DUR.slow,
      ease: EASE.out,
      onUpdate: (v) => {
        setAnimated(v)
      },
    })
    previous.current = value
    return () => {
      controls.stop()
    }
  }, [value, reduced])

  // Reduced motion renders the target value directly — no animation state
  const rounded = Math.round(reduced ? value : animated)
  return <span className={className}>{format ? format(rounded) : rounded}</span>
}
