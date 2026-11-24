import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

const browserServerDatabaseBoundary = {
  name: 'browser-server-database-boundary',
  enforce: 'pre' as const,
  resolveId(source: string, _importer: string | undefined, options: { ssr?: boolean }) {
    if (options.ssr === false && (source === '../../db' || source === '../../db/index')) {
      return resolve(projectRoot, 'src/lib/db-client-stub.ts')
    }
    return null
  },
}

export default defineConfig({
  define: {
    // No Netlify deploy context exists on Workers. Unknown fails closed for preview-only safeguards.
    'process.env.CONTEXT': JSON.stringify('unknown'),
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    browserServerDatabaseBoundary,
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
