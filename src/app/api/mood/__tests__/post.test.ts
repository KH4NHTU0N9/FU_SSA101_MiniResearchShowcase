import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMocks } from "@/test/mocks/prisma";
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

import { POST } from "@/app/api/mood/route";

function buildMoodReq(body: unknown, origin = "http://localhost:3000"): NextRequest {
    return new NextRequest("http://localhost:3000/api/mood", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Host: "localhost:3000",
            Origin: origin,
        },
        body: JSON.stringify(body),
    });
}

describe("POST /api/mood", () => {
    beforeEach(() => {
        resetPrismaMocks();
        getSessionMock.mockReset();
    });

    it("enforces origin checks and strict mood/energy/emotion schemas", async () => {
        expect(
            (
                await POST(
                    buildMoodReq(
                        { mood: 4, energy: 70, focus: 80, emotion: "normal" },
                        "https://evil.example"
                    )
                )
            ).status
        ).toBe(403);

        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);

        expect(
            (
                await POST(
                    buildMoodReq({
                        mood: 5,
                        energy: 150,
                        focus: 80,
                        emotion: "excited",
                    })
                )
            ).status
        ).toBe(400);
    });

    it("persists validated mood log entry and returns 201", async () => {
        const user = createMockUser({ id: "u1" });
        getSessionMock.mockResolvedValue(createMockSession({ id: "u1" }));
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.moodLog.create.mockResolvedValue({
            id: "mood_1",
            userId: "u1",
            mood: 4,
            energy: 65,
            focus: 75,
            emotion: "excited",
            note: "Ready for labs",
        });

        const res = await POST(
            buildMoodReq({
                mood: 4,
                energy: 65,
                focus: 75,
                emotion: "excited",
                note: "  Ready for labs  ",
            })
        );
        expect(res.status).toBe(201);
        expect(prismaMock.moodLog.create).toHaveBeenCalledWith({
            data: {
                userId: "u1",
                mood: 4,
                energy: 65,
                focus: 75,
                emotion: "excited",
                note: "Ready for labs",
            },
        });
    });
});
