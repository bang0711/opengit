import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const alias = {
  "@": resolve(__dirname, "src"),
  "@shared": resolve(__dirname, "shared"),
};

export default defineConfig({
  main: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "electron/main/index.ts"),
        // electron is provided by the runtime — never bundle it (a devDep, so
        // externalizeDepsPlugin won't catch it). CJS so __dirname works.
        external: ["electron"],
        output: { format: "cjs", entryFileNames: "[name].js" },
      },
    },
  },
  preload: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "electron/preload/index.ts"),
        external: ["electron"],
        output: { format: "cjs", entryFileNames: "[name].js" },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src"),
    resolve: { alias },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/index.html"),
      },
    },
  },
});
