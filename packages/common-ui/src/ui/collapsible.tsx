import { Collapsible as CollapsiblePrimitive } from "radix-ui"

// Unstyled by design. Radix's collapsible ships no visual treatment of its own,
// and every caller in the consoles supplies its own trigger and content styles,
// so wrapping these in emotion rules would only add a class to override.
const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
