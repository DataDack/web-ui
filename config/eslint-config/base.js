import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import importX from 'eslint-plugin-import-x'
import promise from 'eslint-plugin-promise'
import sonarjs from 'eslint-plugin-sonarjs'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

/**
 * Base flat config: plain TypeScript, no React.
 *
 * Type-aware by default. The rules that catch the defects which actually reach
 * production — floating promises, misused promises, unawaited thenables —
 * cannot be expressed without type information, so this config pays for a
 * TypeScript program rather than linting syntax alone.
 *
 * Severity is split deliberately: a latent defect is an error, a code-health
 * signal is a warning. An inherited `any` should not block a release, an
 * unhandled promise rejection should.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const base = defineConfig([
  // Generated output is never linted. `.vite/**` matters in particular: Vite's
  // dependency pre-bundle lands in the app root in this workspace (not under
  // node_modules), and linting it produced thousands of errors from third-party
  // code nobody edits.
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**', '**/.vite/**', '**/coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        // The TypeScript Project Service (the same mechanism tsserver uses)
        // rather than a static `project` array. The array builds a separate,
        // long-lived program that drifts out of sync in the editor's ESLint
        // server as sibling files change, surfacing as phantom "error typed
        // value" diagnostics on correct code. projectService stays in sync and
        // needs no per-project wiring, which matters in an Nx workspace where
        // every app and package carries its own tsconfig.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
      'import-x': importX,
      sonarjs,
      promise,
    },
    rules: {
      ...promise.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,

      // --- Correctness: defects, not style ---
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',

      // --- Type health: signals, not blockers ---
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        { allowNumber: true, allowBoolean: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Inline type imports keep emitted JS free of dead imports and make it
      // obvious at the call site what is erased at compile time.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // unused-imports owns unused detection so the autofix can strip the
      // import rather than only report it.
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/naming-convention': [
        'error',
        // Hungarian-style `IFoo` interfaces read as C#, not TypeScript.
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
      ],

      // --- Import architecture ---
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'after' },
            { pattern: '@serverless-ui/**', group: 'internal', position: 'after' },
            { pattern: '@datadack/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // --- Maintainability ---
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/max-switch-cases': ['error', 10],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/prefer-immediate-return': 'error',

      // --- Adoption baseline ---
      //
      // These rules arrived with this config and each already fires somewhere
      // in existing code. Landing them as errors would have made CI red on the
      // commit that introduced them, which teaches everyone to bypass the
      // linter rather than to fix anything.
      //
      // They are warnings so the backlog is visible and does not grow: new
      // violations show up in review, and each rule gets promoted to 'error'
      // once its existing hits are cleared. Rules that catch outright defects
      // — no-floating-promises, no-misused-promises, await-thenable — are
      // errors above and already pass, so nothing real is being deferred.
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/no-undefined-argument': 'warn',
      'sonarjs/prefer-read-only-props': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/no-nested-functions': 'warn',
      'sonarjs/function-return-type': 'warn',
      'sonarjs/deprecation': 'warn',
      'promise/always-return': 'warn',
      'promise/param-names': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
    },
  },

  // Config and script files are plain Node and belong to no app's TypeScript
  // program, so type-aware rules have nothing to resolve against.
  {
    files: ['**/*.config.{js,ts,mjs}', '**/*.cjs', '**/*.mjs', 'scripts/**'],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,
])

export default base
