import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    SESSION_COOKIE_NAME,
    decryptSessionToken,
    encryptSessionToken,
} from "@/lib/session";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

const { cookieStore } = vi.hoisted(() => ({
    cookieStore: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => {
            const val = cookieStore.get(name);
            return val ? { name, value: val } : undefined;
        },
        set: vi.fn(),
        delete: vi.fn(),
    }),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: prismaMock,
}));

import { GET as assessmentGet } from "@/app/api/assessment/route";
import { GET as moodGet } from "@/app/api/mood/route";
import { GET as chatGet } from "@/app/api/chat/route";
import { GET as flashcardsGet } from "@/app/api/flashcards/route";
import { GET as schedulerGet } from "@/app/api/scheduler/route";
import { GET as profileGet } from "@/app/api/auth/profile/route";

describe("security/auth-token-revocation-matrix", () => {
    beforeEach(() => {
        cookieStore.clear();
        resetPrismaMocks();
    });

    it("rejects tampered JWT tokens cleanly", async () => {
        const token = await encryptSessionToken({
            id: "u1",
            email: "u1@fpt.edu.vn",
            name: "An",
            tokenVersion: 1,
        });
        const parts = token.split(".");
        const tampered = `${parts[0]}.${parts[1]}.tamperedsig000`;
        expect(await decryptSessionToken(tampered)).toBeNull();
    });

    it("returns 401 across all protected endpoints when tokenVersion was incremented server-side", async () => {
        const staleToken = await encryptSessionToken({
            id: "u1",
            email: "u1@fpt.edu.vn",
            name: "An",
            tokenVersion: 1,
        });
        cookieStore.set(SESSION_COOKIE_NAME, staleToken);

        prismaMock.user.findUnique.mockResolvedValue({
            id: "u1",
            email: "u1@fpt.edu.vn",
            name: "An",
            tokenVersion: 2,
        } as never);

        const protectedHandlers = [
            assessmentGet,
            moodGet,
            chatGet,
            flashcardsGet,
            schedulerGet,
            profileGet,
        ];

        for (const handler of protectedHandlers) {
            const res = await handler();
            expect(res.status).toBe(401);
        }
    });
});
