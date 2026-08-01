import { defineConfig } from 'eslint/config'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactPlugin from 'eslint-plugin-react'
import reactCompiler from 'eslint-plugin-react-compiler'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

import { base } from './base.js'

/**
 * React flat config: base plus React semantics, hooks rules, accessibility, and
 * fast-refresh safety.
 *
 * jsx-a11y is on because accessibility defects are invisible in review and
 * expensive to retrofit; react-compiler is a warning because it reports code
 * the compiler cannot optimise, which is guidance rather than breakage.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const react = defineConfig([
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat['jsx-runtime'],
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-compiler/react-compiler': 'warn',

      // --- React conventions ---
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx'] }],
      'react/function-component-definition': ['warn', { namedComponents: 'function-declaration' }],
      'react/self-closing-comp': 'error',
      // Adoption baseline — see the note in base.js. Promote to 'error' once
      // the existing hits are cleared.
      'react/jsx-no-useless-fragment': 'warn',
      'react/jsx-pascal-case': 'error',
      // Index keys silently break reconciliation the moment a list reorders.
      'react/no-array-index-key': 'warn',
      'react/no-multi-comp': ['error', { ignoreStateless: true }],
    },
  },
])

export default react
