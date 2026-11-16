import { defineConfig } from 'vitest/config';

// Testy AI enginu (čistý TypeScript, bez Angularu a prehliadača).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
