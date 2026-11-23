import { defineConfig } from 'vitest/config';

// Disponibiliza TEST_DATABASE_URL (se existir no .env) para os testes de integração.
try {
  process.loadEnvFile('.env');
} catch {
  // sem .env: os testes de integração são pulados
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
