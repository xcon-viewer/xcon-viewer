import { defineConfig } from 'tsup';
export default defineConfig({
    entry: {
        cli: 'src/cli.ts',
        index: 'src/index.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: true,
    banner: {
        js: '#!/usr/bin/env node',
    },
});
//# sourceMappingURL=tsup.config.js.map