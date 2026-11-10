import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  // Netlify exposes CONTEXT during the build, but not in Functions at runtime.
  // Freeze the actual deploy context into the server bundle for preview-only safeguards.
  define: {
    'process.env.CONTEXT': JSON.stringify(process.env.CONTEXT ?? 'unknown'),
  },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), netlify(), tanstackStart(), viteReact()],
})

export default config
