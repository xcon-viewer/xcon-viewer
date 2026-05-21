import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: false,
  sourcemap: false,
  clean: true,
  external: ['react', '@xcon-viewer/core', '@xcon-viewer/viewer', '@xcon-viewer/viewer/web-component'],
});

