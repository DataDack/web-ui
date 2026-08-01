import serverlessUi from "@serverless-ui/eslint-config/react"
import { defineConfig, globalIgnores } from "eslint/config"

// The workspace's shared flat config (strictTypeChecked + stylistic, React,
// hooks, a11y, sonarjs, import order, promise rules, react-compiler, prettier
// last) with this app's own tightenings layered on top. Rules below either did
// not exist in the shared config or deliberately differ for this codebase.
export default defineConfig([
    globalIgnores([
        "dist",
        "node_modules",
        ".vscode",
        "scripts",
        "coverage",
        // Generated/vendored design-system sync artifacts (gitignored). Linting
        // them is pure noise and — since they live outside any tsconfig — leaves
        // the type-aware service resolving them against no program, which
        // destabilizes in-editor type info for real source files.
        ".design-sync",
        ".ds-sync",
        "ds-bundle",
    ]),

    ...serverlessUi,

    {
        files: ["**/*.{ts,tsx}"],
        // The shared base disables type-aware linting for config files (they
        // sit outside the app tsconfig programs) — keep them out of this
        // type-aware layer too.
        ignores: ["**/*.config.{js,ts,mjs}"],
        rules: {
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

            // --- Production Quality & Stability ---
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-debugger": "error",
            "no-alert": "error",
            "no-duplicate-imports": "error",

            // --- TypeScript Strictness (softened to warnings on purpose:
            // inherited `any` from API boundaries should not block a release) ---
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/prefer-nullish-coalescing": "warn",
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "interface",
                    format: ["PascalCase"],
                    custom: { regex: "^I[A-Z]", match: false },
                },
                {
                    selector: "typeAlias",
                    format: ["PascalCase"],
                },
                {
                    selector: "variable",
                    format: ["camelCase", "PascalCase", "UPPER_CASE"],
                },
                {
                    selector: "function",
                    format: ["camelCase", "PascalCase"],
                },
            ],

            // --- React Professional Standards ---
            "react/jsx-filename-extension": [1, { extensions: [".tsx"] }],
            "react/function-component-definition": [1, { namedComponents: "function-declaration" }],
            "react/self-closing-comp": "error",
            "react/jsx-no-useless-fragment": "error",
            "react/no-array-index-key": "warn",
            "react/jsx-pascal-case": "error",
            "react/no-multi-comp": ["error", { ignoreStateless: true }],

            // --- Import Architecture ---
            "import-x/order": [
                "error",
                {
                    groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
                    "newlines-between": "always",
                    pathGroups: [
                        { pattern: "react", group: "external", position: "before" },
                        { pattern: "@/**", group: "internal", position: "after" },
                    ],
                    pathGroupsExcludedImportTypes: ["react"],
                    alphabetize: { order: "asc", caseInsensitive: true },
                },
            ],

            // --- Maintainability (SonarJS) ---
            "sonarjs/cognitive-complexity": ["warn", 15],
            "sonarjs/max-switch-cases": ["error", 10],
            "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
            "sonarjs/no-nested-conditional": "error",
            "sonarjs/prefer-immediate-return": "error",
            "sonarjs/no-collapsible-if": "error",
        },
    },
])
