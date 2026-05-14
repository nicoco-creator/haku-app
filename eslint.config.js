import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // ── Vault AI isolation ────────────────────────────────────────────────────
  // 「裁かない倉庫」モジュールからai-bridgeをimportすることをESLintで禁止する
  {
    files: ['src/modules/vault/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/core/ai-bridge', '**/ai-bridge'],
          message: 'Vault module must NOT import ai-bridge. (CLAUDE.md: 裁かない倉庫はAI隔離)',
        }],
      }],
    },
  },
])
