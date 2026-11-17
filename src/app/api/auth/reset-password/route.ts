export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    guardOrigin,
    guardRateLimit,
    handlePrismaError,
    jsonError,
    parseJsonBody,
} from "@/lib/api/response";
import { hashPassword, verifyOtpHash } from "@/lib/security";
import { resetPasswordSchema } from "@/lib/validation";

const MAX_RESET_ATTEMPTS = 5;

export async function POST(req: Request) {
    try {
        const originError = guardOrigin(req);
        if (originError) return originError;

        const rateError = guardRateLimit(req, "auth:reset-password", {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
        });
        if (rateError) return rateError;

        const parsed = await parseJsonBody(req, resetPasswordSchema);
        if (parsed.error) return parsed.error;

        const { email, code, newPassword } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                resetCode: true,
                resetAttempts: true,
                resetCodeExpires: true,
            },
        });

        if (!user || !user.resetCode || !user.resetCodeExpires || new Date() > user.resetCodeExpires) {
            return jsonError("Invalid or expired reset code.", 400);
        }

        if (user.resetAttempts >= MAX_RESET_ATTEMPTS) {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetCode: null, resetAttempts: 0, resetCodeExpires: null },
            });
            return jsonError("Too many failed attempts. Please request a new reset code.", 429);
        }

        if (!verifyOtpHash(email, code, user.resetCode)) {
            const nextAttempts = user.resetAttempts + 1;
            if (nextAttempts >= MAX_RESET_ATTEMPTS) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { resetCode: null, resetAttempts: 0, resetCodeExpires: null },
                });
                return jsonError("Too many failed attempts. Please request a new reset code.", 429);
            }
            await prisma.user.update({
                where: { id: user.id },
                data: { resetAttempts: { increment: 1 } },
            });
            return jsonError("Invalid or expired reset code.", 400);
        }

        const hashedPassword = await hashPassword(newPassword);

        // Conditional update prevents TOCTOU race conditions with concurrent reset attempts.
        const updated = await prisma.user.updateMany({
            where: {
                id: user.id,
                resetCode: user.resetCode,
            },
            data: {
                password: hashedPassword,
                resetCode: null,
                resetAttempts: 0,
                resetCodeExpires: null,
                tokenVersion: { increment: 1 },
            },
        });

        if (updated.count !== 1) {
            return jsonError("Reset code has already been used.", 400);
        }

        return NextResponse.json(
            { message: "Password has been successfully reset." },
            { status: 200 }
        );
    } catch (error) {
        return handlePrismaError(error, "auth/reset-password POST");
    }
}
