import type { ReactNode } from "react"

import { motion } from "motion/react"

import { DUR, EASE } from "./motion-config"

interface StaggerProps {
  children: ReactNode
  className?: string
  stagger?: number
  delayChildren?: number
}

export function Stagger({
  children,
  className,
  stagger = 0.04,
  delayChildren = 0,
}: Readonly<StaggerProps>) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
      }}
    >
      {children}
    </motion.div>
  )
}
