import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: "node",
                    environment: "node",
                    setupFiles: ["./src/test/setup-node.ts"],
                    include: ["src/**/*.test.ts"],
                    exclude: ["node_modules/**", ".next/**"],
                    clearMocks: true,
                    restoreMocks: true,
                },
            },
            {
                extends: true,
                plugins: [react()],
                test: {
                    name: "dom",
                    environment: "jsdom",
                    setupFiles: ["./src/test/setup.ts"],
                    include: ["src/**/*.test.tsx"],
                    exclude: ["node_modules/**", ".next/**"],
                    clearMocks: true,
                    restoreMocks: true,
                },
            },
        ],
    },
});
