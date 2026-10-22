import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": sourceRoot } },
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
});
