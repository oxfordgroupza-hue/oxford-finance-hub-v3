import { env } from 'cloudflare:workers'

/**
 * Resolve Cloudflare Worker bindings first. The compatibility flag also exposes
 * bindings through process.env in supported Worker runtimes, which is retained
 * as a fallback for framework/server adapters that do not surface env directly.
 */
export function getServerEnv(name: string): string | undefined {
  const workerBindings = env as unknown as Record<string, unknown>
  const binding = workerBindings[name]
  if (typeof binding === 'string') return binding
  const processValue = process.env[name]
  return typeof processValue === 'string' ? processValue : undefined
}
