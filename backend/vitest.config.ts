import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2020",
        strict: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
});
