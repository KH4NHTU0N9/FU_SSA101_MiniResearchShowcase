import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";

const { cookieJar, emailOutbox, users, pendingRegs, resetRateLimitKey } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    emailOutbox: [] as Array<{ email: string; otp: string }>,
    users: new Map<
        string,
        {
            id: string;
            name: string | null;
            email: string;
            phone: string | null;
            password: string;
            tokenVersion: number;
        }
    >(),
    pendingRegs: new Map<
        string,
        {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
            passwordHash: string;
            otpHash: string;
            attempts: number;
            expiresAt: Date;
        }
    >(),
    resetRateLimitKey: { ip: "198.51.100.10" },
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
    sendVerificationEmail: vi.fn(async (email: string, otp: string) => {
        emailOutbox.push({ email, otp });
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
            findFirst: async ({ where }: { where: Record<string, unknown> }) => {
                for (const u of users.values()) {
                    if (where.OR && Array.isArray(where.OR)) {
                        for (const clause of where.OR as Array<{ email?: string; phone?: string }>) {
                            if (clause.email && u.email === clause.email) return u;
                            if (clause.phone && u.phone === clause.phone) return u;
                        }
                    } else if (where.email && u.email === where.email) {
                        return u;
                    } else if (where.phone && u.phone === where.phone) {
                        return u;
                    }
                }
                return null;
            },
            findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
                if (where.id) return users.get(where.id) ?? null;
                for (const u of users.values()) {
                    if (where.email && u.email === where.email) return u;
                }
                return null;
            },
            create: async ({ data }: { data: { email: string; name: string | null; phone: string | null; password: string } }) => {
                const record = {
                    id: `user-${users.size + 1}`,
                    email: data.email,
                    name: data.name,
                    phone: data.phone,
                    password: data.password,
                    tokenVersion: 1,
                };
                users.set(record.id, record);
                return record;
            },
            updateMany: async ({ where }: { where: { id?: string } }) => {
                const target = where.id ? users.get(where.id) : undefined;
                if (!target) return { count: 0 };
                target.tokenVersion += 1;
                return { count: 1 };
            },
        },
        pendingRegistration: {
            upsert: async ({
                where,
                create,
                update,
            }: {
                where: { email: string };
                create: {
                    email: string;
                    name: string | null;
                    phone: string | null;
                    passwordHash: string;
                    otpHash: string;
                    attempts: number;
                    expiresAt: Date;
                };
                update: Partial<{
                    name: string | null;
                    phone: string | null;
                    passwordHash: string;
                    otpHash: string;
                    attempts: number;
                    expiresAt: Date;
                }>;
            }) => {
                const existing = pendingRegs.get(where.email);
                const next = existing
                    ? { ...existing, ...update }
                    : { id: `preg-${pendingRegs.size + 1}`, ...create };
                pendingRegs.set(where.email, next);
                return next;
            },
            findUnique: async ({ where }: { where: { email: string } }) =>
                pendingRegs.get(where.email) ?? null,
            delete: async ({ where }: { where: { id: string } }) => {
                for (const [k, v] of pendingRegs.entries()) {
                    if (v.id === where.id) pendingRegs.delete(k);
                }
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

import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as verifyPost } from "@/app/api/auth/verify/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { GET as meGet } from "@/app/api/auth/me/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";

describe("e2e/auth-full-lifecycle", () => {
    beforeEach(() => {
        cookieJar.clear();
        emailOutbox.length = 0;
        users.clear();
        pendingRegs.clear();
    });

    it("executes register -> email OTP verify -> phone login -> signed session /me -> logout", async () => {
        const headers = { "x-forwarded-for": resetRateLimitKey.ip };

        const regRes = await registerPost(
            buildJsonRequest("http://localhost/api/auth/register", {
                method: "POST",
                headers,
                body: {
                    name: "An Nguyen",
                    email: "an.e2e@fpt.edu.vn",
                    phone: "0901234567",
                    password: "StrongPassword123",
                },
            })
        );
        expect(regRes.status).toBe(200);
        expect(emailOutbox).toHaveLength(1);

        const otp = emailOutbox[0].otp;
        const verifyRes = await verifyPost(
            buildJsonRequest("http://localhost/api/auth/verify", {
                method: "POST",
                headers,
                body: { email: "an.e2e@fpt.edu.vn", code: otp },
            })
        );
        expect(verifyRes.status).toBe(201);
        expect(pendingRegs.size).toBe(0);
        expect(users.size).toBe(1);

        const loginRes = await loginPost(
            buildJsonRequest("http://localhost/api/auth/login", {
                method: "POST",
                headers,
                body: { identifier: "0901234567", password: "StrongPassword123" },
            })
        );
        expect(loginRes.status).toBe(200);
        expect(cookieJar.size).toBe(1);

        const meRes = await meGet();
        const meJson = await meRes.json();
        expect(meJson.user).toEqual({
            id: "user-1",
            name: "An Nguyen",
            email: "an.e2e@fpt.edu.vn",
            phone: "0901234567",
        });

        const logoutRes = await logoutPost(
            buildJsonRequest("http://localhost/api/auth/logout", {
                method: "POST",
                headers,
            })
        );
        expect(logoutRes.status).toBe(200);

        const meAfterLogout = await (await meGet()).json();
        expect(meAfterLogout.user).toBeNull();
    });
});
