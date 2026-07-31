import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

/**
 * Base flat config: plain TypeScript, no React.
 * @type {import('eslint').Linter.Config[]}
 */
export const base = [
  // Generated output is never linted. `.vite/**` matters in particular: Vite's
  // dependency pre-bundle lands in the app root in this workspace (not under
  // node_modules), and linting it produced thousands of errors from third-party
  // code nobody edits.
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**', '**/.vite/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  prettier,
]

export default base
