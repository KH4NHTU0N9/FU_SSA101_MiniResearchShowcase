import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { sendVerificationEmailMock } = vi.hoisted(() => ({
    sendVerificationEmailMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/email", () => ({
    sendVerificationEmail: sendVerificationEmailMock,
}));

import { POST } from "@/app/api/auth/register/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/register — validation & security guards", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        sendVerificationEmailMock.mockReset();
    });

    it("rejects cross-origin CSRF attempts with 403", async () => {
        const req = buildJsonRequest("http://localhost:3000/api/auth/register", {
            origin: "https://evil.attacker",
            body: { email: "a@fpt.edu.vn", password: "Password123!" },
        });
        const res = await POST(req);
        expect(res.status).toBe(403);
    });

    it("rejects weak password and invalid email payloads with 400", async () => {
        const req = buildJsonRequest("http://localhost:3000/api/auth/register", {
            body: { email: "invalid-email", password: "123" },
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("returns 409 without leaking email/phone ownership details when an account matches", async () => {
        prismaMock.user.findFirst.mockResolvedValue({ id: "u_existing" });
        const req = buildJsonRequest("http://localhost:3000/api/auth/register", {
            body: {
                name: "Student",
                email: "taken@fpt.edu.vn",
                phone: "0901234567",
                password: "StrongPassword#2026",
            },
        });
        const res = await POST(req);
        expect(res.status).toBe(409);
        const body = (await res.json()) as { error: string };
        expect(body.error).not.toContain("taken@fpt.edu.vn");
    });

    it("enforces IP rate limiting after 10 registration requests", async () => {
        prismaMock.user.findFirst.mockResolvedValue({ id: "u1" });
        for (let i = 0; i < 10; i++) {
            await POST(
                buildJsonRequest("http://localhost:3000/api/auth/register", {
                    ip: "198.51.100.77",
                    body: { email: "a@fpt.edu.vn", password: "StrongPassword#2026" },
                })
            );
        }
        const blocked = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/register", {
                ip: "198.51.100.77",
                body: { email: "a@fpt.edu.vn", password: "StrongPassword#2026" },
            })
        );
        expect(blocked.status).toBe(429);
    });
});
