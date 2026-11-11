import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

/**
 * The Netlify database adapter is server-only. TanStack server-function
 * modules are imported by client routes, so prevent their static database
 * imports from pulling the Node/Postgres driver into the browser bundle.
 * The stub fails closed if any code accidentally attempts client DB access.
 */
const browserServerDatabaseBoundary = {
  name: 'browser-server-database-boundary',
  enforce: 'pre' as const,
  resolveId(source: string, _importer: string | undefined, options: { ssr?: boolean }) {
    if (
      options.ssr === false &&
      (source === '../../db' || source === '../../db/index')
    ) {
      return resolve(projectRoot, 'src/lib/db-client-stub.ts')
    }
    return null
  },
}

const config = defineConfig({
  // Netlify exposes CONTEXT during the build, but not in Functions at runtime.
  // Freeze the actual deploy context into the server bundle for preview-only safeguards.
  define: {
    'process.env.CONTEXT': JSON.stringify(process.env.CONTEXT ?? 'unknown'),
  },
  resolve: { tsconfigPaths: true },
  plugins: [browserServerDatabaseBoundary, tailwindcss(), netlify(), tanstackStart(), viteReact()],
})

export default config
