import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: false,
  sourcemap: false,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});

