import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";

const { cookieJar, resetOutbox, userRecord } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    resetOutbox: [] as Array<{ email: string; code: string }>,
    userRecord: {
        id: "user-rec-1",
        name: "Binh Tran",
        email: "binh@fpt.edu.vn",
        phone: "0909888777",
        password: "hashed:OldPassword123",
        tokenVersion: 1,
        resetCode: null as string | null,
        resetAttempts: 0,
        resetCodeExpires: null as Date | null,
    },
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => {
            const val = cookieJar.get(name);
            return val ? { name, value: val } : undefined;
        },
        set: (name: string, value: string) => {
            if (!value) cookieJar.delete(name);
            else cookieJar.set(name, value);
        },
        delete: (name: string) => {
            cookieJar.delete(name);
        },
    }),
}));

vi.mock("@/lib/email", () => ({
    sendPasswordResetEmail: vi.fn(async (email: string, code: string) => {
        resetOutbox.push({ email, code });
        return true;
    }),
}));

vi.mock("@/lib/security", async () => {
    const actual = await vi.importActual<typeof import("@/lib/security")>("@/lib/security");
    return {
        ...actual,
        hashPassword: vi.fn(async (pw: string) => `hashed:${pw}`),
        verifyPassword: vi.fn(async (pw: string, stored?: string | null) => stored === `hashed:${pw}`),
    };
});

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findFirst: async ({ where }: { where: { email?: string; phone?: string } }) =>
                where.email === userRecord.email || where.phone === userRecord.phone
                    ? userRecord
                    : null,
            findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
                where.id === userRecord.id || where.email === userRecord.email
                    ? userRecord
                    : null,
            update: async ({ data }: { data: Record<string, unknown> }) => {
                if ("resetCode" in data) userRecord.resetCode = data.resetCode as string | null;
                if ("resetAttempts" in data) {
                    const ra = data.resetAttempts as number | { increment: number };
                    userRecord.resetAttempts =
                        typeof ra === "number" ? ra : userRecord.resetAttempts + ra.increment;
                }
                if ("resetCodeExpires" in data) {
                    userRecord.resetCodeExpires = data.resetCodeExpires as Date | null;
                }
                return userRecord;
            },
            updateMany: async ({
                where,
                data,
            }: {
                where: { id: string; resetCode: string | null };
                data: Record<string, unknown>;
            }) => {
                if (where.id !== userRecord.id || where.resetCode !== userRecord.resetCode) {
                    return { count: 0 };
                }
                userRecord.password = data.password as string;
                userRecord.resetCode = null;
                userRecord.resetAttempts = 0;
                userRecord.resetCodeExpires = null;
                userRecord.tokenVersion += 1;
                return { count: 1 };
            },
        },
    },
}));

import { POST as loginPost } from "@/app/api/auth/login/route";
import { GET as meGet } from "@/app/api/auth/me/route";
import { POST as forgotPost } from "@/app/api/auth/forgot-password/route";
import { POST as resetPost } from "@/app/api/auth/reset-password/route";

describe("e2e/auth-password-recovery", () => {
    beforeEach(() => {
        cookieJar.clear();
        resetOutbox.length = 0;
        userRecord.password = "hashed:OldPassword123";
        userRecord.tokenVersion = 1;
        userRecord.resetCode = null;
        userRecord.resetAttempts = 0;
        userRecord.resetCodeExpires = null;
    });

    it("revokes pre-existing sessions upon password reset and accepts login with new password", async () => {
        const headers = { "x-forwarded-for": "198.51.100.11" };

        const firstLogin = await loginPost(
            buildJsonRequest("http://localhost/api/auth/login", {
                method: "POST",
                headers,
                body: { identifier: "binh@fpt.edu.vn", password: "OldPassword123" },
            })
        );
        expect(firstLogin.status).toBe(200);
        expect((await (await meGet()).json()).user.id).toBe("user-rec-1");

        const forgotRes = await forgotPost(
            buildJsonRequest("http://localhost/api/auth/forgot-password", {
                method: "POST",
                headers,
                body: { email: "binh@fpt.edu.vn" },
            })
        );
        expect(forgotRes.status).toBe(200);
        expect(resetOutbox).toHaveLength(1);

        const badAttempt = await resetPost(
            buildJsonRequest("http://localhost/api/auth/reset-password", {
                method: "POST",
                headers,
                body: {
                    email: "binh@fpt.edu.vn",
                    code: "000000",
                    newPassword: "NewPassword123",
                },
            })
        );
        expect(badAttempt.status).toBe(400);
        expect(userRecord.resetAttempts).toBe(1);

        const goodReset = await resetPost(
            buildJsonRequest("http://localhost/api/auth/reset-password", {
                method: "POST",
                headers,
                body: {
                    email: "binh@fpt.edu.vn",
                    code: resetOutbox[0].code,
                    newPassword: "NewPassword123",
                },
            })
        );
        expect(goodReset.status).toBe(200);

        // Old session cookie now has stale tokenVersion (1 !== 2)
        expect((await (await meGet()).json()).user).toBeNull();

        const oldLogin = await loginPost(
            buildJsonRequest("http://localhost/api/auth/login", {
                method: "POST",
                headers,
                body: { identifier: "binh@fpt.edu.vn", password: "OldPassword123" },
            })
        );
        expect(oldLogin.status).toBe(401);

        const newLogin = await loginPost(
            buildJsonRequest("http://localhost/api/auth/login", {
                method: "POST",
                headers,
                body: { identifier: "binh@fpt.edu.vn", password: "NewPassword123" },
            })
        );
        expect(newLogin.status).toBe(200);
        expect((await (await meGet()).json()).user.id).toBe("user-rec-1");
    });
});
