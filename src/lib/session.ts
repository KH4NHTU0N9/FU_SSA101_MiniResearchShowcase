import "server-only";
import crypto from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";
import type { SessionUser } from "@/types";

export type { SessionUser };

export const SESSION_COOKIE_NAME = "session";
export const SESSION_ISSUER = "psych-support-web";
export const SESSION_AUDIENCE = "psych-support-session";
export const SESSION_TOKEN_TYPE = "session";
const SESSION_TTL_SECONDS = 24 * 60 * 60;

const DEV_EPHEMERAL_SECRET = crypto.randomBytes(32).toString("hex");

function getSigningKey(): Uint8Array {
    const configured = process.env.JWT_SECRET;
    if (configured && configured.length >= 32) {
        return new TextEncoder().encode(configured);
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("Server misconfiguration: JWT_SECRET must be at least 32 characters in production.");
    }
    return new TextEncoder().encode(configured || DEV_EPHEMERAL_SECRET);
}

const sessionUserSchema = z.object({
    id: z.string().min(1),
    email: z.string().min(1),
    name: z.string().nullable().default(null),
    tokenVersion: z.number().int().min(0).default(0),
    role: z.string().optional(),
});

const sessionPayloadSchema = z.object({
    typ: z.literal(SESSION_TOKEN_TYPE),
    user: sessionUserSchema,
});

export interface SessionPayload extends JWTPayload {
    typ: typeof SESSION_TOKEN_TYPE;
    user: SessionUser;
}

/**
 * Signs a session JWT with explicit issuer, audience, and token type claims.
 */
export async function encryptSessionToken(user: SessionUser): Promise<string> {
    return await new SignJWT({ typ: SESSION_TOKEN_TYPE, user })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(SESSION_ISSUER)
        .setAudience(SESSION_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
        .sign(getSigningKey());
}

/**
 * Verifies a session JWT signature, claims, and Zod payload shape.
 */
export async function decryptSessionToken(input: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(input, getSigningKey(), {
            algorithms: ["HS256"],
            issuer: SESSION_ISSUER,
            audience: SESSION_AUDIENCE,
        });

        const parsed = sessionPayloadSchema.safeParse(payload);
        if (!parsed.success) {
            return null;
        }

        return {
            ...(payload as JWTPayload),
            typ: parsed.data.typ,
            user: parsed.data.user,
        };
    } catch {
        return null;
    }
}

/**
 * Reads and verifies the session cookie on the server.
 */
export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await decryptSessionToken(token);
}

/**
 * Issues a signed HTTP-only session cookie for an authenticated user.
 */
export async function setSession(user: SessionUser): Promise<void> {
    const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    const token = await encryptSessionToken(user);
    const isProduction = process.env.NODE_ENV === "production";

    (await cookies()).set(SESSION_COOKIE_NAME, token, {
        expires,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
    });
}

/**
 * Clears the authentication session cookie.
 */
export async function clearSession(): Promise<void> {
    (await cookies()).delete(SESSION_COOKIE_NAME);
}
