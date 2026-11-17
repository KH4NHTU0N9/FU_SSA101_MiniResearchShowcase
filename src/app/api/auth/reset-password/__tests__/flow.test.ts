import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { hashPasswordMock } = vi.hoisted(() => ({
    hashPasswordMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/security", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/security")>();
    return {
        ...actual,
        hashPassword: hashPasswordMock,
    };
});

import { POST } from "@/app/api/auth/reset-password/route";
import { hashOtp, resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/reset-password — TOCTOU guard & password update", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        hashPasswordMock.mockReset();
        vi.stubEnv("JWT_SECRET", "reset-flow-test-secret-minimum-32-chars");
    });

    it("atomically consumes resetCode via updateMany, increments tokenVersion, and rejects concurrent replays", async () => {
        const otp = "519204";
        const digest = hashOtp("student@fpt.edu.vn", otp);

        prismaMock.user.findUnique.mockResolvedValue({
            id: "u1",
            resetCode: digest,
            resetAttempts: 0,
            resetCodeExpires: new Date(Date.now() + 60_000),
        });
        hashPasswordMock.mockResolvedValue("new_bcrypt_hash");

        // Concurrent caller already consumed the reset code -> count: 0
        prismaMock.user.updateMany.mockResolvedValueOnce({ count: 0 });
        const conflictRes = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/reset-password", {
                body: {
                    email: "student@fpt.edu.vn",
                    code: otp,
                    newPassword: "NewStrongPassword#2026",
                },
            })
        );
        expect(conflictRes.status).toBe(400);

        prismaMock.user.updateMany.mockResolvedValueOnce({ count: 1 });
        const okRes = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/reset-password", {
                body: {
                    email: "student@fpt.edu.vn",
                    code: otp,
                    newPassword: "NewStrongPassword#2026",
                },
            })
        );
        expect(okRes.status).toBe(200);
        expect(prismaMock.user.updateMany).toHaveBeenLastCalledWith({
            where: { id: "u1", resetCode: digest },
            data: {
                password: "new_bcrypt_hash",
                resetCode: null,
                resetAttempts: 0,
                resetCodeExpires: null,
                tokenVersion: { increment: 1 },
            },
        });
    });
});
