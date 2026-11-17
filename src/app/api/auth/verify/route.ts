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
import { verifyOtpHash } from "@/lib/security";
import { verifyRegistrationSchema } from "@/lib/validation";

const MAX_VERIFICATION_ATTEMPTS = 5;

export async function POST(req: Request) {
    try {
        const originError = guardOrigin(req);
        if (originError) return originError;

        const rateError = guardRateLimit(req, "auth:verify", {
            windowMs: 15 * 60 * 1000,
            maxRequests: 15,
        });
        if (rateError) return rateError;

        const parsed = await parseJsonBody(req, verifyRegistrationSchema);
        if (parsed.error) return parsed.error;

        const { email, code } = parsed.data;

        const pending = await prisma.pendingRegistration.findUnique({
            where: { email },
        });

        if (!pending) {
            return jsonError("Verification session expired or invalid. Please register again.", 400);
        }

        if (new Date() > pending.expiresAt) {
            await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
            return jsonError("Verification session expired. Please register again.", 400);
        }

        if (pending.attempts >= MAX_VERIFICATION_ATTEMPTS) {
            await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
            return jsonError("Too many failed attempts. Please register again.", 429);
        }

        const matches = verifyOtpHash(email, code, pending.otpHash);
        if (!matches) {
            const nextAttempts = pending.attempts + 1;
            if (nextAttempts >= MAX_VERIFICATION_ATTEMPTS) {
                await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
                return jsonError("Too many failed attempts. Please register again.", 429);
            }
            await prisma.pendingRegistration.update({
                where: { id: pending.id },
                data: { attempts: { increment: 1 } },
            });
            return jsonError("Invalid verification code.", 400);
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.create({
                data: {
                    email: pending.email,
                    name: pending.name,
                    phone: pending.phone,
                    password: pending.passwordHash,
                },
            });
            await tx.pendingRegistration.delete({
                where: { id: pending.id },
            });
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        return handlePrismaError(error, "auth/verify POST");
    }
}
