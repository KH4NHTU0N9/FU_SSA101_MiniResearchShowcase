import { afterEach, describe, expect, it, vi } from "vitest";
import { validateOrigin } from "@/lib/security/csrf";

describe("security/csrf validateOrigin", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("always permits safe read-only HTTP methods", () => {
        for (const method of ["GET", "HEAD", "OPTIONS"]) {
            const req = new Request("http://localhost:3000/api/community", {
                method,
                headers: { Origin: "https://evil.example", "sec-fetch-site": "cross-site" },
            });
            expect(validateOrigin(req)).toBe(true);
        }
    });

    it("rejects cross-site Fetch Metadata and opaque null origins on mutations", () => {
        const crossSite = new Request("http://localhost:3000/api/mood", {
            method: "POST",
            headers: { "sec-fetch-site": "cross-site", Origin: "http://localhost:3000" },
        });
        expect(validateOrigin(crossSite)).toBe(false);

        const nullOrigin = new Request("http://localhost:3000/api/mood", {
            method: "POST",
            headers: { Host: "localhost:3000", Origin: "null" },
        });
        expect(validateOrigin(nullOrigin)).toBe(false);
    });

    it("accepts matching Origin or Referer against Host, x-forwarded-host, or NEXT_PUBLIC_APP_URL", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://study-support.vercel.app");

        const sameHost = new Request("https://study-support.vercel.app/api/mood", {
            method: "POST",
            headers: {
                Host: "study-support.vercel.app",
                Origin: "https://study-support.vercel.app",
            },
        });
        expect(validateOrigin(sameHost)).toBe(true);

        const matchingReferer = new Request("https://internal.proxy/api/mood", {
            method: "DELETE",
            headers: {
                "x-forwarded-host": "app.example.com",
                Referer: "https://app.example.com/dashboard?tab=1",
            },
        });
        expect(validateOrigin(matchingReferer)).toBe(true);
    });

    it("rejects mismatched external Origin and Referer headers", () => {
        const badOrigin = new Request("https://app.example.com/api/flashcards", {
            method: "POST",
            headers: {
                Host: "app.example.com",
                Origin: "https://attacker.example.com",
            },
        });
        expect(validateOrigin(badOrigin)).toBe(false);

        const badReferer = new Request("https://app.example.com/api/flashcards", {
            method: "PATCH",
            headers: {
                Host: "app.example.com",
                Referer: "https://phishing.example.net/form",
            },
        });
        expect(validateOrigin(badReferer)).toBe(false);
    });
});
