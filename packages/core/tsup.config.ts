import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/parser/index.ts',
    'src/model/index.ts',
    'src/validator/index.ts',
    'src/converter/index.ts',
  ],
  format: ['esm'],
  dts: false,
  sourcemap: false,
  clean: true,
});

