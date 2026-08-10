import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths keep the static artifact deployable at a domain root or subpath.
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
