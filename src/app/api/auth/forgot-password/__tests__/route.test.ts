import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { sendResetMock } = vi.hoisted(() => ({
    sendResetMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/email", () => ({
    sendPasswordResetEmail: sendResetMock,
}));

import { POST } from "@/app/api/auth/forgot-password/route";
import { resetRateLimitStore } from "@/lib/security";

describe("POST /api/auth/forgot-password — non-enumeration & dispatch", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
        sendResetMock.mockReset();
        vi.stubEnv("JWT_SECRET", "forgot-pass-test-secret-minimum-32-chars");
    });

    it("returns identical generic 200 payload for missing and existing accounts", async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);
        const missingRes = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/forgot-password", {
                body: { email: "unknown@fpt.edu.vn" },
            })
        );
        expect(missingRes.status).toBe(200);
        const missingBody = await missingRes.json();
        expect(sendResetMock).not.toHaveBeenCalled();

        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: "u1",
            email: "known@fpt.edu.vn",
        });
        prismaMock.user.update.mockResolvedValue({});
        sendResetMock.mockResolvedValue(true);

        const existingRes = await POST(
            buildJsonRequest("http://localhost:3000/api/auth/forgot-password", {
                body: { email: "KNOWN@FPT.EDU.VN" },
            })
        );
        expect(existingRes.status).toBe(200);
        expect(await existingRes.json()).toEqual(missingBody);
        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ resetAttempts: 0 }),
            })
        );
        expect(sendResetMock).toHaveBeenCalledTimes(1);
    });
});
