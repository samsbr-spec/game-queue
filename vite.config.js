import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standard Vite + React setup. Vercel auto-detects this and needs no extra config.
export default defineConfig({
  plugins: [react()],
});
