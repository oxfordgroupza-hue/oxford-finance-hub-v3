import { env } from 'cloudflare:workers'

/**
 * Cloudflare Worker bindings (including secret_text bindings) are exposed
 * through the Workers env module. process.env remains a fallback for local
 * Node-based tooling and non-Workers test environments.
 */
export function getServerEnv(name: string): string | undefined {
  const workerBindings = env as unknown as Record<string, string | undefined>
  return workerBindings[name] ?? process.env[name]
}
