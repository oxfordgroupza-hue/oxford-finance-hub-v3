import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const cloudflareContext = process.env.CLOUDFLARE_ENV === 'production' ? 'cloudflare-production' : 'cloudflare-preview'

const databaseBoundary = {
  name: 'cloudflare-database-runtime-boundary',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined, options: { ssr?: boolean }) {
    if (source === './server-runtime-env' && importer?.startsWith(resolve(projectRoot, 'src/lib'))) {
      return resolve(projectRoot, 'src/lib/server-runtime-env.cloudflare.ts')
    }
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
    // Mark this build as a dedicated Cloudflare preview; server-side gates still require
    // the exact preview hostname and explicit runtime feature flags.
    'process.env.CONTEXT': JSON.stringify(cloudflareContext),
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: resolve(projectRoot, 'src/routes'),
      generatedRouteTree: resolve(projectRoot, 'src/routeTree.gen.ts'),
    }),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    databaseBoundary,
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
