import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" — GitHub Pages などサブパス配信でもそのまま動くようにする
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
});
