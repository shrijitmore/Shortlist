import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// Vitest owns *.test.ts; Jest owns *.spec.ts — no overlap.
// unplugin-swc is required so NestJS decorators emit metadata for DI.
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata'],
    include: ['test/**/*.test.ts'],
  },
});
