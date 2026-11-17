import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { buildContentDisposition, sanitizeFilename } from "@/lib/security/headers";

describe("security/xss-and-header-sanitization", () => {
    it("neutralizes path traversal, quotes, and CRLF header injection in Content-Disposition", () => {
        const malicious = '../../secret"\r\nX-Injected: true\0.pdf';
        const cleaned = sanitizeFilename(malicious);
        expect(cleaned).not.toContain("..");
        expect(cleaned).not.toContain("\r");
        expect(cleaned).not.toContain("\n");
        expect(cleaned).not.toContain('"');

        const header = buildContentDisposition("attachment", malicious);
        expect(header.startsWith('attachment; filename="')).toBe(true);
        expect(header).not.toMatch(/[\r\n]/);
        expect(header).toContain("; filename*=UTF-8''");
    });

    it("enforces defensive Content-Security-Policy and browser hardening headers in Next config", async () => {
        expect(typeof nextConfig.headers).toBe("function");
        const rules = await nextConfig.headers!();
        const globalRule = rules.find((r) => r.source === "/:path*");
        expect(globalRule).toBeDefined();

        const headerMap = new Map(
            globalRule!.headers.map((h) => [h.key.toLowerCase(), h.value])
        );
        expect(headerMap.get("x-content-type-options")).toBe("nosniff");
        expect(headerMap.get("x-frame-options")).toBe("SAMEORIGIN");
        expect(headerMap.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
        expect(headerMap.get("content-security-policy")).toContain("frame-ancestors 'self'");
        expect(headerMap.get("content-security-policy")).toContain("object-src 'none'");
    });
});
