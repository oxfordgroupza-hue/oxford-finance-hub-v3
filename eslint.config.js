import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  {
    // Wrangler generates this file during the release build; it is not source code.
    ignores: ['dist/**', '.netlify/**', '.tanstack/**', '.wrangler/**', 'src/routeTree.gen.ts', 'worker-configuration.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
)
