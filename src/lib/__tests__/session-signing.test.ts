import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    SESSION_AUDIENCE,
    SESSION_ISSUER,
    SESSION_TOKEN_TYPE,
    decryptSessionToken,
    encryptSessionToken,
} from "@/lib/session";

const TEST_SECRET = "super-secret-jwt-signing-key-at-least-32-chars";

describe("lib/session JWT signing and verification", () => {
    beforeEach(() => {
        vi.stubEnv("JWT_SECRET", TEST_SECRET);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("encrypts and decrypts valid session payloads preserving user fields and tokenVersion", async () => {
        const token = await encryptSessionToken({
            id: "user_42",
            email: "student@fpt.edu.vn",
            name: "An Nguyen",
            tokenVersion: 3,
        });

        const payload = await decryptSessionToken(token);
        expect(payload).not.toBeNull();
        expect(payload?.typ).toBe(SESSION_TOKEN_TYPE);
        expect(payload?.user).toEqual({
            id: "user_42",
            email: "student@fpt.edu.vn",
            name: "An Nguyen",
            tokenVersion: 3,
        });
    });

    it("rejects tampered tokens or tokens missing required typ/issuer/audience claims", async () => {
        const valid = await encryptSessionToken({
            id: "user_1",
            email: "a@b.com",
            name: null,
            tokenVersion: 0,
        });
        expect(await decryptSessionToken(`${valid}tampered`)).toBeNull();

        const wrongTypeJwt = await new SignJWT({
            typ: "otp",
            user: { id: "user_1", email: "a@b.com", name: null, tokenVersion: 0 },
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuer(SESSION_ISSUER)
            .setAudience(SESSION_AUDIENCE)
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode(TEST_SECRET));

        expect(await decryptSessionToken(wrongTypeJwt)).toBeNull();
    });

    it("throws in production if JWT_SECRET is missing or shorter than 32 chars", async () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("JWT_SECRET", "too-short");
        await expect(
            encryptSessionToken({
                id: "u1",
                email: "a@b.com",
                name: null,
                tokenVersion: 0,
            })
        ).rejects.toThrow(/JWT_SECRET/);
    });
});
