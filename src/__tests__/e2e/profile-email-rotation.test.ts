import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";

const { cookieJar, emailChangeOutbox, userRecord, pendingEmailRef } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    emailChangeOutbox: [] as Array<{ email: string; otp: string }>,
    userRecord: {
        id: "user-prof-1",
        name: "Chi Le",
        email: "chi@fpt.edu.vn",
        phone: "0901112222" as string | null,
        password: "hashed:CurrentPass1!",
        tokenVersion: 1,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
    },
    pendingEmailRef: {
        current: null as null | {
            userId: string;
            newEmail: string;
            otpHash: string;
            attempts: number;
            expiresAt: Date;
        },
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
    sendEmailChangeVerification: vi.fn(async (email: string, otp: string) => {
        emailChangeOutbox.push({ email, otp });
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

vi.mock("@/lib/prisma", () => {
    const models = {
        user: {
            findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
                where.id === userRecord.id || where.email === userRecord.email
                    ? userRecord
                    : null,
            update: async ({ data }: { data: Record<string, unknown> }) => {
                if ("name" in data) userRecord.name = data.name as string;
                if ("phone" in data) userRecord.phone = data.phone as string | null;
                if ("email" in data) userRecord.email = data.email as string;
                if ("password" in data) userRecord.password = data.password as string;
                if ("tokenVersion" in data) {
                    const tv = data.tokenVersion as { increment: number };
                    userRecord.tokenVersion += tv.increment;
                }
                return userRecord;
            },
        },
        pendingEmailChange: {
            upsert: async ({
                create,
            }: {
                create: {
                    userId: string;
                    newEmail: string;
                    otpHash: string;
                    attempts: number;
                    expiresAt: Date;
                };
            }) => {
                pendingEmailRef.current = { ...create };
                return pendingEmailRef.current;
            },
            findUnique: async ({ where }: { where: { userId: string } }) =>
                pendingEmailRef.current?.userId === where.userId ? pendingEmailRef.current : null,
            delete: async () => {
                pendingEmailRef.current = null;
            },
        },
    };
    return {
        prisma: {
            ...models,
            $transaction: async <T,>(cb: (tx: typeof models) => Promise<T>): Promise<T> =>
                cb(models),
        },
    };
});

import { setSession } from "@/lib/session";
import { GET as profileGet, PATCH as profilePatch } from "@/app/api/auth/profile/route";

describe("e2e/profile-email-rotation", () => {
    beforeEach(async () => {
        cookieJar.clear();
        emailChangeOutbox.length = 0;
        pendingEmailRef.current = null;
        userRecord.name = "Chi Le";
        userRecord.email = "chi@fpt.edu.vn";
        userRecord.phone = "0901112222";
        userRecord.password = "hashed:CurrentPass1!";
        userRecord.tokenVersion = 1;

        await setSession({
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            tokenVersion: userRecord.tokenVersion,
        });
    });

    it("rotates profile name/phone, verifies & rotates email, changes password, and preserves active session", async () => {
        const headers = { "x-forwarded-for": "198.51.100.12" };

        const infoRes = await profilePatch(
            buildJsonRequest("http://localhost/api/auth/profile", {
                method: "PATCH",
                headers,
                body: { action: "updateProfile", name: "Chi Updated", phone: "0988777666" },
            })
        );
        expect(infoRes.status).toBe(200);

        const reqEmailRes = await profilePatch(
            buildJsonRequest("http://localhost/api/auth/profile", {
                method: "PATCH",
                headers,
                body: {
                    action: "requestEmailChange",
                    newEmail: "chi.new@fpt.edu.vn",
                    currentPassword: "CurrentPass1!",
                },
            })
        );
        expect(reqEmailRes.status).toBe(200);
        expect(emailChangeOutbox).toHaveLength(1);

        const confirmRes = await profilePatch(
            buildJsonRequest("http://localhost/api/auth/profile", {
                method: "PATCH",
                headers,
                body: { action: "confirmEmailChange", code: emailChangeOutbox[0].otp },
            })
        );
        expect(confirmRes.status).toBe(200);
        expect(userRecord.tokenVersion).toBe(2);

        const passRes = await profilePatch(
            buildJsonRequest("http://localhost/api/auth/profile", {
                method: "PATCH",
                headers,
                body: {
                    action: "changePassword",
                    currentPassword: "CurrentPass1!",
                    newPassword: "RotatedPassword9!",
                },
            })
        );
        expect(passRes.status).toBe(200);
        expect(userRecord.tokenVersion).toBe(3);

        const getRes = await profileGet();
        expect(getRes.status).toBe(200);
        const body = await getRes.json();
        expect(body.user.name).toBe("Chi Updated");
        expect(body.user.email).toBe("chi.new@fpt.edu.vn");
        expect(body.user.phone).toBe("0988777666");
    });
});
