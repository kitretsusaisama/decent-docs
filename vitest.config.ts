import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
    // Per-file isolation cold-starts shiki under parallel spawn pressure on
    // Windows, which surfaces a theme-registration race (wrong token colors).
    // Serial file execution is deterministic; keep gates green everywhere.
    fileParallelism: false,
    // Windows per-file cold starts occasionally stall past vitest's 5s
    // default (AV/disk latency); tests are green well within 15s when
    // they run to completion.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'packages/*/test/**',
        'packages/*/dist/**',
        'packages/*/node_modules/**',
        'scripts/**',
        'examples/**',
        'apps/**',
        '**/*.d.ts',
        'vitest.config.ts',
      ],
    },
  },
});
