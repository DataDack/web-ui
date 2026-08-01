import { z } from "zod/v4"

import type { NamingRule } from "./governance.types"
import { validatePattern } from "./naming-convention"

/** A Zod schema for a resource name that enforces the org naming convention. Drop
 * this in place of a hardcoded `z.string().min().max().regex()` in any create form:
 *
 *   const makeSchema = (rule: NamingRule) =>
 *       z.object({ name: namingNameSchema(rule), region: z.string().min(1) })
 *   type FormValues = z.infer<ReturnType<typeof makeSchema>>
 *   // in component:
 *   const { rule } = useNamingRule()
 *   const schema = useMemo(() => makeSchema(rule), [rule])
 */
export function namingNameSchema(rule: NamingRule) {
  return z.string().superRefine((value, ctx) => {
    const err = validatePattern(rule.pattern, value)
    if (err) ctx.addIssue({ code: "custom", message: err })
  })
}
