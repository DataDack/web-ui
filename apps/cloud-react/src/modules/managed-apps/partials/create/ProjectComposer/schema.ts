import { z } from "zod/v4"

/**
 * The composer's form shape.
 *
 * `name` is optional on purpose: the server derives it from the repository and
 * deduplicates it per account, so the flow does not have to ask. It is offered
 * as an override, not a requirement — one fewer decision between a repo and a
 * deployment.
 *
 * Build fields stay empty when inherited. Empty means "use the server default"
 * everywhere in this product, and materialising the default into the payload
 * would freeze today's value into the project forever.
 */
export const composerSchema = z
    .object({
        /**
         * Where the app comes from: a GitHub repository ("github") or a
         * ready-made public image from the catalog ("image"). Empty until the
         * source step is answered. Part of the form values so it survives the
         * GitHub App install round-trip with the rest of the draft.
         */
        source: z.enum(["", "github", "image"]),

        installation_id: z.number().nullable(),
        /** "owner/name" — the selected repository. */
        repo: z.string(),
        repo_owner: z.string(),
        repo_name: z.string(),
        default_branch: z.string(),
        branch: z.string(),

        project_type: z.enum(["opennext", "react"]),

        // No `plan`: the tier is account-scoped and lives in Managed Apps →
        // Settings. A draft that still carries one from an older build is
        // simply ignored — z.object() strips unknown keys.

        name: z
            .string()
            .max(63, "Keep it under 64 characters")
            .refine(
                (value) => value === "" || /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value),
                "Lowercase letters, digits and hyphens only"
            ),

        root_dir: z.string(),
        install_command: z.string(),
        build_command: z.string(),
        output_dir: z.string(),

        vpc_id: z.string(),
        subnet_id: z.string(),

        env: z.array(z.object({ key: z.string(), value: z.string() })),
    })
    .superRefine((values, ctx) => {
        if (values.installation_id == null) {
            ctx.addIssue({
                code: "custom",
                path: ["installation_id"],
                message: "Choose the GitHub account that owns the repository",
            })
        }
        if (!values.repo_owner || !values.repo_name) {
            ctx.addIssue({ code: "custom", path: ["repo"], message: "Choose a repository" })
        }
        if (!values.branch) {
            ctx.addIssue({ code: "custom", path: ["branch"], message: "Choose a branch" })
        }
        // The backend rejects a subnet without a VPC; catching it here means the
        // user is told beside the control instead of by a toast after a round-trip.
        if (values.subnet_id && !values.vpc_id) {
            ctx.addIssue({
                code: "custom",
                path: ["vpc_id"],
                message: "Choose a VPC before choosing a subnet",
            })
        }
        const keys = values.env.map((row) => row.key.trim()).filter(Boolean)
        if (new Set(keys).size !== keys.length) {
            ctx.addIssue({
                code: "custom",
                path: ["env"],
                message: "Each variable name can only appear once",
            })
        }
    })

export type ComposerValues = z.infer<typeof composerSchema>

export const COMPOSER_DEFAULTS: ComposerValues = {
    source: "",
    installation_id: null,
    repo: "",
    repo_owner: "",
    repo_name: "",
    default_branch: "",
    branch: "",
    project_type: "react",
    name: "",
    root_dir: "",
    install_command: "",
    build_command: "",
    output_dir: "",
    vpc_id: "",
    subnet_id: "",
    env: [],
}
