import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("next.config.ts security and optimization settings", () => {
    it("disables X-Powered-By and configures strict HTTP security headers", async () => {
        expect(nextConfig.poweredByHeader).toBe(false);
        expect(nextConfig.reactStrictMode).toBe(true);

        const headerRules = await nextConfig.headers?.();
        expect(headerRules).toBeDefined();
        const globalRule = headerRules?.[0];
        expect(globalRule?.source).toBe("/:path*");

        const headerMap = new Map(
            globalRule?.headers.map((h) => [h.key, h.value]) ?? []
        );
        expect(headerMap.get("X-XSS-Protection")).toBe("0");
        expect(headerMap.get("X-Frame-Options")).toBe("SAMEORIGIN");
        expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
        expect(headerMap.get("Permissions-Policy")).toContain("camera=()");
        expect(headerMap.get("Content-Security-Policy")).toContain("object-src 'none'");
        expect(headerMap.get("Content-Security-Policy")).toContain(
            "*.public.blob.vercel-storage.com"
        );
    });

    it("restricts remote image patterns exclusively to HTTPS Vercel Blob storage", () => {
        expect(nextConfig.images?.remotePatterns).toEqual([
            {
                protocol: "https",
                hostname: "*.public.blob.vercel-storage.com",
            },
        ]);
    });
});
