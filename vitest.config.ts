import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.js'],
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
  },
})
