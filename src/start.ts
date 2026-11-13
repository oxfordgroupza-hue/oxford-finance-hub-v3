import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'

/** Apply the same browser security headers to SSR pages and Start server functions. */
const securityHeadersMiddleware = createMiddleware({ type: 'request' }).server(({ next }) => {
  setResponseHeader('X-Content-Type-Options', 'nosniff')
  setResponseHeader('X-Frame-Options', 'DENY')
  setResponseHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  return next()
})

/** Preserve Start's default same-origin protection when registering global middleware. */
const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, csrfMiddleware],
}))
