import { describe, expect, it } from "vitest";
import {
    buildContentDisposition,
    isAllowedBlobUrl,
    sanitizeFilename,
} from "@/lib/security/headers";

describe("security/headers", () => {
    it("strips path traversal, control bytes, quotes, and backslashes from filenames", () => {
        expect(sanitizeFilename("../../etc/passwd\r\nX-Header: bad")).toBe(
            "passwd__X-Header: bad"
        );
        expect(sanitizeFilename('dir\\"quote\x00test.pdf')).toBe("_quote_test.pdf");
        expect(sanitizeFilename("///")).toBe("download");
    });

    it("builds RFC 5987 Content-Disposition headers for UTF-8 and ASCII filenames", () => {
        const header = buildContentDisposition("attachment", "Đề thi (CSD201).pdf");
        expect(header).toContain("attachment;");
        expect(header).toContain('filename="');
        expect(header).toContain("filename*=UTF-8''");
        expect(header).toContain("%28CSD201%29.pdf");
        expect(header).not.toMatch(/[\r\n]/);
    });

    it("enforces HTTPS Vercel Blob host allowlist to block SSRF targets", () => {
        expect(
            isAllowedBlobUrl("https://abc123.public.blob.vercel-storage.com/exam.pdf")
        ).toBe(true);
        expect(isAllowedBlobUrl("https://store.blob.vercel-storage.com/note.png")).toBe(true);

        expect(isAllowedBlobUrl("http://abc123.public.blob.vercel-storage.com/exam.pdf")).toBe(
            false
        );
        expect(isAllowedBlobUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
        expect(isAllowedBlobUrl("https://127.0.0.1:8080/secret")).toBe(false);
        expect(
            isAllowedBlobUrl("https://user:pass@abc123.public.blob.vercel-storage.com/a.pdf")
        ).toBe(false);
        expect(isAllowedBlobUrl("https://public.blob.vercel-storage.com/no-subdomain.pdf")).toBe(
            false
        );
        expect(isAllowedBlobUrl("not-a-url")).toBe(false);
    });
});
