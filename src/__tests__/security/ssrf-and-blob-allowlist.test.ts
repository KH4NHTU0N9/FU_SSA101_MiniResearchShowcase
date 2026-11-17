import { describe, expect, it, vi } from "vitest";
import { isAllowedBlobUrl } from "@/lib/security/headers";
import { buildRawRequest } from "@/test/mocks/next";
import { prismaMock } from "@/test/mocks/prisma";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
    prisma: prismaMock,
}));

import { GET as fileGet } from "@/app/api/exam-materials/file/route";

describe("security/ssrf-and-blob-allowlist", () => {
    it("blocks loopback, link-local cloud metadata, credentialed, and bare Vercel Blob URLs", () => {
        const blockedUrls = [
            "http://127.0.0.1/secret",
            "http://169.254.169.254/latest/meta-data/",
            "https://169.254.169.254/latest/meta-data/",
            "https://localhost/admin",
            "https://public.blob.vercel-storage.com/no-store-prefix.pdf",
            "https://user:pass@store1.public.blob.vercel-storage.com/doc.pdf",
            "https://store1.public.blob.vercel-storage.com.attacker.example/doc.pdf",
            "javascript:alert(1)",
            "file:///etc/passwd",
        ];

        for (const bad of blockedUrls) {
            expect(isAllowedBlobUrl(bad), bad).toBe(false);
        }

        expect(isAllowedBlobUrl("https://store1.public.blob.vercel-storage.com/notes.pdf")).toBe(
            true
        );
        expect(isAllowedBlobUrl("https://team1.blob.vercel-storage.com/notes.pdf")).toBe(true);
    });

    it("returns 403 Forbidden storage origin before fetching untrusted stored URLs", async () => {
        getSessionMock.mockResolvedValue({ user: { id: "u1", tokenVersion: 1 } });
        prismaMock.user.findUnique.mockResolvedValue({ id: "u1", tokenVersion: 1 } as never);
        prismaMock.materialFile.findUnique.mockResolvedValue({
            fileUrl: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
            fileContent: null,
            name: "ssrf.txt",
            materialId: "m1",
        } as never);

        const fetchSpy = vi.spyOn(globalThis, "fetch");
        const res = await fileGet(
            buildRawRequest("http://localhost/api/exam-materials/file?fileId=f-ssrf", {
                method: "GET",
            })
        );
        expect(res.status).toBe(403);
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });
});
