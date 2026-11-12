import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Route-tree imports may initialise the Netlify Drizzle adapter during tests.
// This inert local URL satisfies adapter construction; unit tests must mock
// server actions and must never connect to a real database.
process.env.NETLIFY_DB_URL ??= 'postgres://test:test@127.0.0.1:5432/oxford_test'

afterEach(cleanup)

if (typeof window !== 'undefined') {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
}
