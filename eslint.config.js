import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const layerZones = [
  { target: './src/logic', from: './src/hooks' },
  { target: './src/logic', from: './src/pages' },
  { target: './src/logic', from: './src/app' },
  { target: './src/hooks', from: './src/pages' },
  { target: './src/hooks', from: './src/app' },
  { target: './src/pages', from: './src/logic/*/*Api.ts' },
  { target: './src/shared', from: './src/app' },
  { target: './src/shared', from: './src/pages' },
  { target: './src/shared', from: './src/hooks' },
  { target: './src/shared', from: './src/logic' },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.app.json' }),
      ],
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'import-x/no-restricted-paths': ['error', { zones: layerZones }],
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@(@app|@hooks|@logic|@pages|@shared)/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['src/logic/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-router*', '@tanstack/*'],
              message: 'logic is plain TypeScript: React and React Query belong in src/hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/logic/rules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-router*', '@tanstack/*'],
              message: 'logic/rules must stay pure: no React, no data fetching.',
            },
            {
              group: ['@app/*', '@hooks/*', '@logic/*', '@pages/*', '@shared/*', '../*'],
              message: 'logic/rules imports nothing outside its own folder.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tanstack/*', '@shared/lib/backend', '@shared/lib/supabase', '@shared/lib/queryKeys'],
              message: 'pages are UI only: load and save data through a hook in src/hooks.',
            },
          ],
        },
      ],
    },
  },
])
