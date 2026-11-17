import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
    checkRateLimit,
    getClientIp,
    validateOrigin,
    type RateLimitConfig,
} from "@/lib/security";
import type { PublicUser } from "@/types";

export interface AuthenticatedContext {
    user: PublicUser & { tokenVersion: number };
}

/**
 * Constructs a standardized JSON error response.
 */
export function jsonError(
    message: string,
    status: number,
    headers?: HeadersInit
): NextResponse {
    return NextResponse.json({ error: message }, { status, headers });
}

/**
 * Formats the first Zod validation failure into a consistent 400 Bad Request response.
 */
export function jsonValidationError(error: z.ZodError): NextResponse {
    const firstIssue = error.issues[0];
    return jsonError(firstIssue?.message || "Invalid request payload", 400);
}

/**
 * Safely parses and validates a JSON request body against a Zod schema.
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
    req: Request,
    schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
    let rawBody: unknown;
    try {
        rawBody = await req.json();
    } catch {
        return { error: jsonError("Invalid JSON request body", 400) };
    }

    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
        return { error: jsonValidationError(parsed.error) };
    }

    return { data: parsed.data };
}

/**
 * Enforces CSRF same-origin validation on state-changing requests.
 */
export function guardOrigin(req: Request): NextResponse | null {
    if (!validateOrigin(req)) {
        return jsonError("Forbidden: invalid request origin", 403);
    }
    return null;
}

/**
 * Enforces sliding-window rate limiting and returns a 429 response with Retry-After when exceeded.
 */
export function guardRateLimit(
    req: Request,
    namespace: string,
    config: RateLimitConfig,
    customKey?: string
): NextResponse | null {
    const identifier = customKey || getClientIp(req);
    const result = checkRateLimit(namespace, identifier, config);
    if (!result.allowed) {
        return jsonError(
            "Too many requests. Please try again later.",
            429,
            { "Retry-After": String(result.retryAfterSeconds) }
        );
    }
    return null;
}

/**
 * Verifies the user's JWT cookie and confirms the account and tokenVersion are active in PostgreSQL.
 */
export async function requireAuth(
    req?: Request
): Promise<{ ctx: AuthenticatedContext; error?: never } | { ctx?: never; error: NextResponse }> {
    if (req) {
        const originError = guardOrigin(req);
        if (originError) return { error: originError };
    }

    const session = await getSession();
    if (!session?.user?.id) {
        return { error: jsonError("Unauthorized", 401) };
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            tokenVersion: true,
        },
    });

    if (!dbUser || dbUser.tokenVersion !== session.user.tokenVersion) {
        return { error: jsonError("Unauthorized", 401) };
    }

    return {
        ctx: {
            user: dbUser,
        },
    };
}

/**
 * Maps known Prisma constraint and not-found errors to accurate HTTP status responses.
 */
export function handlePrismaError(error: unknown, contextLabel: string): NextResponse {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return jsonError("Resource already exists", 409);
        }
        if (error.code === "P2025") {
            return jsonError("Resource not found", 404);
        }
        if (error.code === "P2003") {
            return jsonError("Referenced resource does not exist", 400);
        }
    }
    console.error(`[${contextLabel}]`, error);
    return jsonError("Internal Server Error", 500);
}
