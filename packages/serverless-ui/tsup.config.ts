import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // The consumer supplies React and the icon/table libraries so there is
  // exactly one copy of each in an app. radix-ui / cva / clsx / tailwind-merge
  // are regular dependencies and stay external too — npm resolves them.
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'lucide-react',
    '@tanstack/react-table',
    'radix-ui',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ],
})
