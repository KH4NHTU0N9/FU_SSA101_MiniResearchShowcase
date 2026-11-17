export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import {
    guardOrigin,
    guardRateLimit,
    handlePrismaError,
    jsonError,
    parseJsonBody,
} from "@/lib/api/response";
import { verifyPassword } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
    try {
        const originError = guardOrigin(req);
        if (originError) return originError;

        const rateError = guardRateLimit(req, "auth:login", {
            windowMs: 15 * 60 * 1000,
            maxRequests: 20,
        });
        if (rateError) return rateError;

        const parsed = await parseJsonBody(req, loginSchema);
        if (parsed.error) return parsed.error;

        const { identifier, password } = parsed.data;
        const isEmail = identifier.includes("@");
        const normalizedEmail = isEmail ? identifier.toLowerCase() : null;
        const normalizedPhone = !isEmail ? identifier.replace(/[\s\-().]+/g, "") : null;

        const user = await prisma.user.findFirst({
            where: normalizedEmail
                ? { email: normalizedEmail }
                : { phone: normalizedPhone ?? "" },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                password: true,
                tokenVersion: true,
            },
        });

        const isValid = await verifyPassword(password, user?.password);
        if (!user || !isValid) {
            return jsonError("Invalid credentials", 401);
        }

        await setSession({
            id: user.id,
            email: user.email,
            name: user.name,
            tokenVersion: user.tokenVersion,
        });

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
            },
        });
    } catch (error) {
        return handlePrismaError(error, "auth/login POST");
    }
}
