import { createFileRoute } from '@tanstack/react-router'
import { handleCloudflareOxfordApi } from '@/lib/cloudflare-document-api'

export const Route = createFileRoute('/api/oxford-api')({
  server: {
    handlers: {
      GET: async ({ request }) => handleCloudflareOxfordApi(request),
      POST: async ({ request }) => handleCloudflareOxfordApi(request),
    },
  },
})
