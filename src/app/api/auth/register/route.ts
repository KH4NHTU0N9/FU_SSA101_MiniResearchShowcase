export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import {
    guardOrigin,
    guardRateLimit,
    handlePrismaError,
    jsonError,
    parseJsonBody,
} from "@/lib/api/response";
import { generateNumericOtp, hashOtp, hashPassword } from "@/lib/security";
import { registerSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

const REGISTRATION_TTL_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
    try {
        const originError = guardOrigin(req);
        if (originError) return originError;

        const rateError = guardRateLimit(req, "auth:register", {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
        });
        if (rateError) return rateError;

        const parsed = await parseJsonBody(req, registerSchema);
        if (parsed.error) return parsed.error;

        const { name, email, phone, password } = parsed.data;
        const normalizedPhone = phone ?? null;

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                ],
            },
            select: { id: true },
        });

        if (existing) {
            return jsonError(
                "Unable to register with these credentials. Please verify your details or sign in.",
                409
            );
        }

        const [passwordHash, otp] = await Promise.all([
            hashPassword(password),
            Promise.resolve(generateNumericOtp()),
        ]);

        const otpHash = hashOtp(email, otp);
        const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);

        await prisma.pendingRegistration.upsert({
            where: { email },
            update: {
                name: name ?? null,
                phone: normalizedPhone,
                passwordHash,
                otpHash,
                attempts: 0,
                expiresAt,
            },
            create: {
                email,
                name: name ?? null,
                phone: normalizedPhone,
                passwordHash,
                otpHash,
                attempts: 0,
                expiresAt,
            },
        });

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return jsonError(
                "Unable to send verification email right now. Please try again later.",
                503
            );
        }

        return NextResponse.json({
            requireVerification: true,
            email,
        });
    } catch (error) {
        return handlePrismaError(error, "auth/register POST");
    }
}
