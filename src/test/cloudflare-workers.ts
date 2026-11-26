/** Node/jsdom stand-in for the Cloudflare Workers env module used by unit tests. */
export const env = new Proxy({} as Record<string, string | undefined>, {
  get(_target, property) {
    return typeof property === 'string' ? process.env[property] : undefined
  },
})
