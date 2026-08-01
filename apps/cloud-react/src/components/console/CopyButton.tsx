import { useEffect, useRef, useState } from "react"

import { Check, Copy } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

interface CopyButtonProps {
    value: string
    /** Visible text; defaults to the copied value */
    label?: string
    mono?: boolean
    className?: string
}

export function CopyButton({ value, label, mono = true, className }: Readonly<CopyButtonProps>) {
    const { t } = useTranslation()
    const [copied, setCopied] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(
        () => () => {
            clearTimeout(timer.current)
        },
        []
    )

    const copy = async (event: React.MouseEvent) => {
        event.stopPropagation()
        await navigator.clipboard.writeText(value)
        setCopied(true)
        toast.success(t("console.copy.copied"))
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
            setCopied(false)
        }, 1500)
    }

    return (
        <button
            type="button"
            onClick={(e) => void copy(e)}
            className={cn(
                "group inline-flex items-center gap-1.5 max-w-full text-left text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded",
                mono && "font-mono text-[12px]",
                className
            )}
        >
            <span className="truncate">{label ?? value}</span>
            <span className="relative size-3.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                        <motion.span
                            key="check"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="absolute inset-0"
                        >
                            <Check className="size-3.5 text-status-success" />
                        </motion.span>
                    ) : (
                        <motion.span
                            key="copy"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="absolute inset-0"
                        >
                            <Copy className="size-3.5" />
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        </button>
    )
}
