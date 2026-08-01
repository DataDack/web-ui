import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import sonarjs from "eslint-plugin-sonarjs"
import unusedImports from "eslint-plugin-unused-imports"
import importX from "eslint-plugin-import-x"
import reactPlugin from "eslint-plugin-react"
import jsxA11y from "eslint-plugin-jsx-a11y"
import promise from "eslint-plugin-promise"
import reactCompiler from "eslint-plugin-react-compiler"
import prettierConfig from "eslint-config-prettier"
import { defineConfig, globalIgnores } from "eslint/config"

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

    // 1. Base JS Rules
    js.configs.recommended,

    // 2. TypeScript & React Logic (Type-Aware)
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
            reactPlugin.configs.flat.recommended,
            reactPlugin.configs.flat["jsx-runtime"],
            jsxA11y.flatConfigs.recommended,
            sonarjs.configs.recommended,
        ],
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
            "unused-imports": unusedImports,
            "import-x": importX,
            promise: promise,
            "react-compiler": reactCompiler,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
            },
            parserOptions: {
                // Use the TypeScript Project Service (same mechanism as tsserver)
                // instead of a static `project` array. The legacy array builds a
                // separate, long-lived program that drifts out of sync in the
                // editor's ESLint server as sibling files change — surfacing as
                // phantom "error typed value" / "type that could not be resolved"
                // diagnostics on correct code. projectService stays in sync.
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            ...promise.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "react-compiler/react-compiler": "warn",

            // --- Production Quality & Stability ---
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-debugger": "error",
            "no-alert": "error",
            "prefer-const": "error",
            "no-var": "error",
            "no-duplicate-imports": "error",

            // --- TypeScript Strictness ---
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "warn",
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
            "@typescript-eslint/no-unused-vars": "error", // Handled by unused-imports
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "interface",
                    format: ["PascalCase"],
                    custom: { regex: "^I[A-Z]", match: false }, // Avoid 'I' prefix
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

            // --- Unused Imports Cleanup ---
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                {
                    vars: "all",
                    varsIgnorePattern: "^_",
                    args: "after-used",
                    argsIgnorePattern: "^_",
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

    // 3. Disable conflicting rules
    prettierConfig,
])
