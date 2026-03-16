import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "caido-wordsmith-backend",
      formats: ["es"],
      fileName: () => "script.js",
    },
    outDir: "../../dist/backend",
    rollupOptions: {
      external: [/^caido:/, /^node:/],
      output: {
        manualChunks: undefined,
      },
    },
  },
});
