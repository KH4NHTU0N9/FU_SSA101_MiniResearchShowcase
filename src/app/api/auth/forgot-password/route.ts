export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import {
    guardOrigin,
    guardRateLimit,
    handlePrismaError,
    parseJsonBody,
} from "@/lib/api/response";
import { generateNumericOtp, hashOtp } from "@/lib/security";
import { forgotPasswordSchema } from "@/lib/validation";

const RESET_TTL_MS = 15 * 60 * 1000;
const UNIFORM_RESPONSE = {
    message: "If your email is in our system, you will receive a reset code.",
};

export async function POST(req: Request) {
    try {
        const originError = guardOrigin(req);
        if (originError) return originError;

        const rateError = guardRateLimit(req, "auth:forgot-password", {
            windowMs: 15 * 60 * 1000,
            maxRequests: 5,
        });
        if (rateError) return rateError;

        const parsed = await parseJsonBody(req, forgotPasswordSchema);
        if (parsed.error) return parsed.error;

        const { email } = parsed.data;
        const code = generateNumericOtp();
        const codeHash = hashOtp(email, code);
        const expires = new Date(Date.now() + RESET_TTL_MS);

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true },
        });

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetCode: codeHash,
                    resetAttempts: 0,
                    resetCodeExpires: expires,
                },
            });

            const sent = await sendPasswordResetEmail(user.email, code);
            if (!sent) {
                console.error("[auth/forgot-password] SMTP delivery failed for password reset request");
            }
        }

        return NextResponse.json(UNIFORM_RESPONSE, { status: 200 });
    } catch (error) {
        return handlePrismaError(error, "auth/forgot-password POST");
    }
}
