import type { ReactNode } from "react"

import { motion } from "motion/react"

import { DUR, EASE } from "./motion-config"

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}

export function FadeIn({ children, className, delay = 0, y = 4 }: Readonly<FadeInProps>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  )
}
