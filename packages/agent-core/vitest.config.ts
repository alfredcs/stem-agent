import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@stem-agent/shared": path.resolve(__dirname, "../../shared/src"),
    },
  },
  test: {
    globals: false,
    testTimeout: 15000,
  },
});
