import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest } from "@/test/mocks/next";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", async () => {
    const mod = await import("@/test/mocks/prisma");
    return { prisma: mod.prismaMock };
});

import { GET } from "@/app/api/keepalive/route";
import { resetRateLimitStore } from "@/lib/security";

describe("GET /api/keepalive", () => {
    beforeEach(() => {
        resetPrismaMocks();
        resetRateLimitStore();
    });

    it("returns 200 warm response with Cache-Control: no-store when SELECT 1 succeeds", async () => {
        prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

        const res = await GET(
            buildJsonRequest("http://localhost:3000/api/keepalive", { method: "GET" })
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ status: "ok", message: "Database is warm" });
    });

    it("returns 503 when database health query fails and 429 on burst flooding", async () => {
        prismaMock.$queryRaw.mockRejectedValue(new Error("Connection terminated"));

        const failRes = await GET(
            buildJsonRequest("http://localhost:3000/api/keepalive", {
                method: "GET",
                ip: "198.51.100.3",
            })
        );
        expect(failRes.status).toBe(503);

        for (let i = 0; i < 14; i++) {
            await GET(
                buildJsonRequest("http://localhost:3000/api/keepalive", {
                    method: "GET",
                    ip: "198.51.100.3",
                })
            );
        }

        const limited = await GET(
            buildJsonRequest("http://localhost:3000/api/keepalive", {
                method: "GET",
                ip: "198.51.100.3",
            })
        );
        expect(limited.status).toBe(429);
    });
});
