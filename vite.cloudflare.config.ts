import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

const databaseBoundary = {
  name: 'cloudflare-database-runtime-boundary',
  enforce: 'pre' as const,
  resolveId(source: string, _importer: string | undefined, options: { ssr?: boolean }) {
    if (source === '../../db' || source === '../../db/index') {
      if (options.ssr === false) {
        return resolve(projectRoot, 'src/lib/db-client-stub.ts')
      }
      return resolve(projectRoot, 'db/cloudflare.ts')
    }
    return null
  },
}

export default defineConfig({
  define: {
    // Netlify preview-only safeguards remain closed on Cloudflare.
    'process.env.CONTEXT': JSON.stringify('unknown'),
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    databaseBoundary,
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
