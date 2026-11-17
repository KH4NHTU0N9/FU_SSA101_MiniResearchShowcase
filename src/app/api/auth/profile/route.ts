export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { sendEmailChangeVerification } from "@/lib/email";
import {
    guardRateLimit,
    handlePrismaError,
    jsonError,
    parseJsonBody,
    requireAuth,
} from "@/lib/api/response";
import {
    generateNumericOtp,
    hashOtp,
    hashPassword,
    verifyOtpHash,
    verifyPassword,
} from "@/lib/security";
import {
    changePasswordSchema,
    confirmEmailChangeSchema,
    requestEmailChangeSchema,
    updateProfileSchema,
} from "@/lib/validation";

const EMAIL_CHANGE_TTL_MS = 15 * 60 * 1000;
const MAX_EMAIL_CHANGE_ATTEMPTS = 5;

const profilePatchSchema = z.discriminatedUnion("action", [
    updateProfileSchema,
    requestEmailChangeSchema,
    confirmEmailChangeSchema,
    changePasswordSchema,
]);

export async function GET() {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const user = await prisma.user.findUnique({
            where: { id: auth.ctx.user.id },
            select: { id: true, name: true, email: true, phone: true, createdAt: true },
        });

        if (!user) {
            return jsonError("User not found", 404);
        }

        return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        return handlePrismaError(error, "auth/profile GET");
    }
}

export async function PATCH(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const rateError = guardRateLimit(
            req,
            "auth:profile",
            { windowMs: 15 * 60 * 1000, maxRequests: 25 },
            auth.ctx.user.id
        );
        if (rateError) return rateError;

        const parsed = await parseJsonBody(req, profilePatchSchema);
        if (parsed.error) return parsed.error;

        const userId = auth.ctx.user.id;
        const payload = parsed.data;

        if (payload.action === "updateProfile") {
            const updated = await prisma.user.update({
                where: { id: userId },
                data: {
                    ...(payload.name !== undefined ? { name: payload.name } : {}),
                    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    tokenVersion: true,
                },
            });

            await setSession({
                id: updated.id,
                email: updated.email,
                name: updated.name,
                tokenVersion: updated.tokenVersion,
            });

            return NextResponse.json({
                user: {
                    id: updated.id,
                    name: updated.name,
                    email: updated.email,
                    phone: updated.phone,
                },
            });
        }

        if (payload.action === "requestEmailChange") {
            if (payload.newEmail === auth.ctx.user.email) {
                return jsonError("New email matches your current email", 400);
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, password: true },
            });
            if (!user) return jsonError("User not found", 404);

            const valid = await verifyPassword(payload.currentPassword, user.password);
            if (!valid) return jsonError("Current password is incorrect", 400);

            const existing = await prisma.user.findUnique({
                where: { email: payload.newEmail },
                select: { id: true },
            });
            if (existing && existing.id !== userId) {
                return jsonError("Email already in use", 409);
            }

            const otp = generateNumericOtp();
            const otpHash = hashOtp(payload.newEmail, otp);
            const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MS);

            await prisma.pendingEmailChange.upsert({
                where: { userId },
                update: {
                    newEmail: payload.newEmail,
                    otpHash,
                    attempts: 0,
                    expiresAt,
                },
                create: {
                    userId,
                    newEmail: payload.newEmail,
                    otpHash,
                    attempts: 0,
                    expiresAt,
                },
            });

            const sent = await sendEmailChangeVerification(payload.newEmail, otp);
            if (!sent) {
                return jsonError("Failed to send verification code to new email", 503);
            }

            return NextResponse.json({
                pendingVerification: true,
                newEmail: payload.newEmail,
            });
        }

        if (payload.action === "confirmEmailChange") {
            const pending = await prisma.pendingEmailChange.findUnique({
                where: { userId },
            });
            if (!pending) {
                return jsonError("No pending email change request found", 400);
            }

            if (new Date() > pending.expiresAt) {
                await prisma.pendingEmailChange.delete({ where: { userId } }).catch(() => {});
                return jsonError("Verification code expired. Please request a new one.", 400);
            }

            if (pending.attempts >= MAX_EMAIL_CHANGE_ATTEMPTS) {
                await prisma.pendingEmailChange.delete({ where: { userId } }).catch(() => {});
                return jsonError("Too many failed attempts. Please request a new code.", 429);
            }

            if (!verifyOtpHash(pending.newEmail, payload.code, pending.otpHash)) {
                const nextAttempts = pending.attempts + 1;
                if (nextAttempts >= MAX_EMAIL_CHANGE_ATTEMPTS) {
                    await prisma.pendingEmailChange.delete({ where: { userId } }).catch(() => {});
                    return jsonError("Too many failed attempts. Please request a new code.", 429);
                }
                await prisma.pendingEmailChange.update({
                    where: { userId },
                    data: { attempts: { increment: 1 } },
                });
                return jsonError("Invalid verification code", 400);
            }

            const updated = await prisma.$transaction(async (tx) => {
                const u = await tx.user.update({
                    where: { id: userId },
                    data: {
                        email: pending.newEmail,
                        tokenVersion: { increment: 1 },
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        tokenVersion: true,
                    },
                });
                await tx.pendingEmailChange.delete({ where: { userId } });
                return u;
            });

            await setSession({
                id: updated.id,
                email: updated.email,
                name: updated.name,
                tokenVersion: updated.tokenVersion,
            });

            return NextResponse.json({
                user: {
                    id: updated.id,
                    name: updated.name,
                    email: updated.email,
                    phone: updated.phone,
                },
            });
        }

        // action === "changePassword"
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, password: true },
        });
        if (!user) return jsonError("User not found", 404);

        const valid = await verifyPassword(payload.currentPassword, user.password);
        if (!valid) return jsonError("Current password is incorrect", 400);

        const hashed = await hashPassword(payload.newPassword);
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashed,
                tokenVersion: { increment: 1 },
            },
            select: {
                id: true,
                email: true,
                name: true,
                tokenVersion: true,
            },
        });

        await setSession({
            id: updated.id,
            email: updated.email,
            name: updated.name,
            tokenVersion: updated.tokenVersion,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "auth/profile PATCH");
    }
}
