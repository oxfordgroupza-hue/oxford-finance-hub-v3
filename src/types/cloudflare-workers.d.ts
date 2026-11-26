/**
 * The Cloudflare Vite plugin resolves this virtual module at Worker build time.
 * Plain tsc does not load the plugin's virtual-module resolver, so provide the
 * minimal ambient shape used by the server runtime without weakening app types.
 */
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>
}
