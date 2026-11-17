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

describe("POST /api/auth/register — registration flow", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        sendVerificationEmailMock.mockReset();
        vi.stubEnv("JWT_SECRET", "register-flow-test-secret-minimum-32-chars");
    });

    it("creates PendingRegistration with bcrypt hash & HMAC OTP and sends email", async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.pendingRegistration.upsert.mockResolvedValue({ id: "pr_1" });
        sendVerificationEmailMock.mockResolvedValue(true);

        const req = buildJsonRequest("http://localhost:3000/api/auth/register", {
            body: {
                name: "  Nguyen An  ",
                email: "NewStudent@FPT.EDU.VN",
                phone: "0912-345-678",
                password: "StrongPassword#2026",
            },
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            requireVerification: true,
            email: "newstudent@fpt.edu.vn",
        });

        const upsertArgs = prismaMock.pendingRegistration.upsert.mock.calls[0]?.[0] as {
            create: { email: string; phone: string; passwordHash: string; otpHash: string };
        };
        expect(upsertArgs.create.email).toBe("newstudent@fpt.edu.vn");
        expect(upsertArgs.create.phone).toBe("0912345678");
        expect(upsertArgs.create.passwordHash.startsWith("$2")).toBe(true);
        expect(upsertArgs.create.otpHash).toMatch(/^[a-f0-9]{64}$/);
        expect(sendVerificationEmailMock).toHaveBeenCalledTimes(1);
    });

    it("returns 503 when SMTP verification email delivery fails", async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.pendingRegistration.upsert.mockResolvedValue({ id: "pr_1" });
        sendVerificationEmailMock.mockResolvedValue(false);

        const req = buildJsonRequest("http://localhost:3000/api/auth/register", {
            body: {
                email: "failmail@fpt.edu.vn",
                password: "StrongPassword#2026",
            },
        });
        const res = await POST(req);
        expect(res.status).toBe(503);
    });
});
