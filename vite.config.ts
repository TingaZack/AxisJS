import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      // Point this to your barrel file
      entry: resolve(__dirname, "src/index.ts"),
      name: "AxisJS",
      fileName: (format) => `axisjs.${format}.js`,
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // e.g., if you ever add lodash or react, put them here
      external: [],
      output: {
        globals: {},
      },
    },
  },
});
