import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        globals: false,
        css: false,
        include: ["src/**/*.test.{ts,tsx}"],
        exclude: ["node_modules/**", ".next/**"],
        clearMocks: true,
        restoreMocks: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
