import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
            // SEO routes are served by the API in dev (lambda.ts aliases them).
            // Production traffic hits them through Vercel rewrites in vercel.json.
            "/sitemap.xml": {target: "http://localhost:3001", changeOrigin: true},
            "/robots.txt": {target: "http://localhost:3001", changeOrigin: true},
            "/ads.txt": {target: "http://localhost:3001", changeOrigin: true},
            "/app-ads.txt": {target: "http://localhost:3001", changeOrigin: true},
        },
    },
});
