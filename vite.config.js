import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // 👈 QUAN TRỌNG NHẤT
  build: {
    outDir: "dist",
  },
});
