import { z } from "zod";

/**
 * Normalizes and validates an email address.
 */
export const normalizedEmailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email is too long")
    .pipe(z.email({ message: "Invalid email address" }));

/**
 * Normalizes optional phone numbers: trims whitespace and collapses empty strings to null.
 */
export const optionalPhoneSchema = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => {
        if (typeof val !== "string") return null;
        const compact = val.trim().replace(/[\s\-().]+/g, "");
        return compact.length > 0 ? compact : null;
    })
    .refine(
        (val) => val === null || /^\+?[0-9]{8,15}$/.test(val),
        "Phone number must contain 8 to 15 digits"
    );

/**
 * Creates a trimmed, bounded non-empty string schema.
 */
export function boundedString(minLen: number, maxLen: number, label: string) {
    return z
        .string()
        .trim()
        .min(minLen, `${label} must be at least ${minLen} characters`)
        .max(maxLen, `${label} must be at most ${maxLen} characters`);
}

/**
 * Parses bounded positive pagination parameters from query strings.
 */
export function parsePaginationParams(
    pageParam: string | null,
    limitParam: string | null,
    defaultLimit: number = 10,
    maxLimit: number = 50
): { page: number; limit: number; skip: number } {
    const rawPage = Number.parseInt(pageParam ?? "1", 10);
    const rawLimit = Number.parseInt(limitParam ?? String(defaultLimit), 10);

    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 10_000) : 1;
    const limit =
        Number.isFinite(rawLimit) && rawLimit >= 1
            ? Math.min(rawLimit, maxLimit)
            : defaultLimit;

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}
