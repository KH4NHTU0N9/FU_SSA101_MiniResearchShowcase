import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
import { buildJsonRequest, buildRawRequest } from "@/test/mocks/next";
import { createMockSession, createMockUser } from "@/test/mocks/session";

const { getSessionMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

vi.mock("@/lib/session", () => ({
    getSession: getSessionMock,
}));

import {
    guardOrigin,
    guardRateLimit,
    handlePrismaError,
    jsonError,
    jsonValidationError,
    parseJsonBody,
    requireAuth,
} from "@/lib/api/response";
import { resetRateLimitStore } from "@/lib/security";

describe("lib/api/response helpers", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
        resetRateLimitStore();
    });

    it("formats error and Zod validation responses consistently", async () => {
        const res = jsonError("Forbidden", 403, { "X-Custom": "1" });
        expect(res.status).toBe(403);
        expect(res.headers.get("X-Custom")).toBe("1");
        expect(await res.json()).toEqual({ error: "Forbidden" });

        const schema = z.object({ title: z.string().min(3, "Title too short") });
        const parsed = schema.safeParse({ title: "a" });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            const valRes = jsonValidationError(parsed.error);
            expect(valRes.status).toBe(400);
            expect(await valRes.json()).toEqual({ error: "Title too short" });
        }
    });

    it("validates JSON request bodies and handles malformed JSON gracefully", async () => {
        const schema = z.object({ count: z.number().int().min(1) });

        const badJsonReq = buildRawRequest("http://localhost:3000/api/test", {
            rawBody: "{not-json",
        });
        const badJsonResult = await parseJsonBody(badJsonReq, schema);
        expect(badJsonResult.error?.status).toBe(400);

        const validReq = buildJsonRequest("http://localhost:3000/api/test", {
            body: { count: 5 },
        });
        const validResult = await parseJsonBody(validReq, schema);
        expect(validResult.data).toEqual({ count: 5 });
    });

    it("enforces origin checks and rate limits with Retry-After header", async () => {
        const badOriginReq = buildJsonRequest("http://localhost:3000/api/test", {
            origin: "https://evil.site",
        });
        expect(guardOrigin(badOriginReq)?.status).toBe(403);

        const req = buildJsonRequest("http://localhost:3000/api/test", { ip: "198.51.100.9" });
        expect(guardRateLimit(req, "unit-ns", { windowMs: 60_000, maxRequests: 1 })).toBeNull();
        const blocked = guardRateLimit(req, "unit-ns", { windowMs: 60_000, maxRequests: 1 });
        expect(blocked?.status).toBe(429);
        expect(Number(blocked?.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    });

    it("verifies active session + DB tokenVersion inside requireAuth", async () => {
        getSessionMock.mockResolvedValue(null);
        expect((await requireAuth()).error?.status).toBe(401);

        const staleSession = createMockSession({ tokenVersion: 1 });
        getSessionMock.mockResolvedValue(staleSession);
        prismaMock.user.findUnique.mockResolvedValue(createMockUser({ tokenVersion: 2 }));
        expect((await requireAuth()).error?.status).toBe(401);

        const validSession = createMockSession({ tokenVersion: 2 });
        getSessionMock.mockResolvedValue(validSession);
        const activeUser = createMockUser({ tokenVersion: 2 });
        prismaMock.user.findUnique.mockResolvedValue(activeUser);
        const res = await requireAuth();
        expect(res.error).toBeUndefined();
        expect(res.ctx?.user.id).toBe(activeUser.id);
    });

    it("maps Prisma known error codes P2002/P2025/P2003 and unknown errors", async () => {
        const dup = new Prisma.PrismaClientKnownRequestError("Unique", {
            code: "P2002",
            clientVersion: "6.19.2",
        });
        const missing = new Prisma.PrismaClientKnownRequestError("Missing", {
            code: "P2025",
            clientVersion: "6.19.2",
        });
        const fk = new Prisma.PrismaClientKnownRequestError("FK", {
            code: "P2003",
            clientVersion: "6.19.2",
        });

        expect(handlePrismaError(dup, "ctx").status).toBe(409);
        expect(handlePrismaError(missing, "ctx").status).toBe(404);
        expect(handlePrismaError(fk, "ctx").status).toBe(400);
        expect(handlePrismaError(new Error("boom"), "ctx").status).toBe(500);
    });
});
