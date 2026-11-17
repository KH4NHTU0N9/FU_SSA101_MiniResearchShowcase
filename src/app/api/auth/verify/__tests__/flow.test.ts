import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

import { POST } from "@/app/api/auth/verify/route";
import { hashOtp, resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/verify — transactional user activation", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        vi.stubEnv("JWT_SECRET", "verify-flow-test-secret-minimum-32-chars");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("increments failed attempts on incorrect OTP", async () => {
        prismaMock.pendingRegistration.findUnique.mockResolvedValue({
            id: "pr_1",
            email: "student@fpt.edu.vn",
            otpHash: hashOtp("student@fpt.edu.vn", "999111"),
            expiresAt: new Date(Date.now() + 300_000),
            attempts: 1,
        });
        prismaMock.pendingRegistration.update.mockResolvedValue({});

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/verify", {
                body: { email: "student@fpt.edu.vn", code: "000000" },
            })
        );
        expect(res.status).toBe(400);
        expect(prismaMock.pendingRegistration.update).toHaveBeenCalledWith({
            where: { id: "pr_1" },
            data: { attempts: { increment: 1 } },
        });
    });

    it("creates verified user and deletes PendingRegistration atomically on valid OTP", async () => {
        const otp = "482913";
        prismaMock.pendingRegistration.findUnique.mockResolvedValue({
            id: "pr_2",
            email: "student@fpt.edu.vn",
            name: "An Nguyen",
            phone: "0901234567",
            passwordHash: "$2b$12$hashed",
            otpHash: hashOtp("student@fpt.edu.vn", otp),
            expiresAt: new Date(Date.now() + 300_000),
            attempts: 0,
        });
        prismaMock.user.create.mockResolvedValue({ id: "u_new" });
        prismaMock.pendingRegistration.delete.mockResolvedValue({});

        const res = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/verify", {
                body: { email: "STUDENT@FPT.EDU.VN", code: otp },
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(prismaMock.user.create).toHaveBeenCalledWith({
            data: {
                email: "student@fpt.edu.vn",
                name: "An Nguyen",
                phone: "0901234567",
                password: "$2b$12$hashed",
            },
        });
        expect(prismaMock.pendingRegistration.delete).toHaveBeenCalledWith({
            where: { id: "pr_2" },
        });
    });
});
