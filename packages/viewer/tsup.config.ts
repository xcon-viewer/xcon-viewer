import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: false,
    clean: true,
  },
  {
    entry: { 'web-component': 'src/web-component.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: false,
  },
]);

