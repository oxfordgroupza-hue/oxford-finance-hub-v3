/**
 * Node-test substitute for Cloudflare Workers runtime bindings.
 * Tests may set process.env values without requiring a deployed Worker runtime.
 */
export const env = process.env
