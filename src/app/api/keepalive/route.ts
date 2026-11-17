export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRateLimit } from "@/lib/api/response";

export async function GET(req: Request) {
    const rateError = guardRateLimit(req, "system:keepalive", {
        windowMs: 60 * 1000,
        maxRequests: 15,
    });
    if (rateError) return rateError;

    const noStore = { "Cache-Control": "no-store" };

    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json(
            { status: "ok", message: "Database is warm" },
            { status: 200, headers: noStore }
        );
    } catch (error) {
        console.error("[keepalive GET]", error);
        return NextResponse.json(
            { status: "error", message: "Database unavailable" },
            { status: 503, headers: noStore }
        );
    }
}
