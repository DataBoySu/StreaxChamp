import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    emptyOutDir: false,
    ssr: 'index.ts',
    outDir: '../../dist/server',
    target: 'node22',
    sourcemap: true,
    rollupOptions: {
      external: [...builtinModules],

      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
    'process.env.GOOGLE_API_KEY': JSON.stringify(process.env.GOOGLE_API_KEY || ''),
  },
});
