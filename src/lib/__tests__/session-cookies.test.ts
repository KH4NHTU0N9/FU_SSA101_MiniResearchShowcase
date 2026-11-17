import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStoreMock = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
};

vi.mock("next/headers", () => ({
    cookies: vi.fn(async () => cookieStoreMock),
}));

import {
    SESSION_COOKIE_NAME,
    clearSession,
    encryptSessionToken,
    getSession,
    setSession,
} from "@/lib/session";

describe("lib/session cookie helpers", () => {
    beforeEach(() => {
        vi.stubEnv("JWT_SECRET", "session-cookie-secret-key-minimum-32-characters");
        cookieStoreMock.get.mockReset();
        cookieStoreMock.set.mockReset();
        cookieStoreMock.delete.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("issues HTTP-only SameSite=lax cookie via setSession", async () => {
        await setSession({
            id: "u1",
            email: "user@fpt.edu.vn",
            name: "User",
            tokenVersion: 1,
        });

        expect(cookieStoreMock.set).toHaveBeenCalledTimes(1);
        const [name, token, options] = cookieStoreMock.set.mock.calls[0] as [
            string,
            string,
            Record<string, unknown>,
        ];
        expect(name).toBe(SESSION_COOKIE_NAME);
        expect(typeof token).toBe("string");
        expect(token.split(".")).toHaveLength(3);
        expect(options.httpOnly).toBe(true);
        expect(options.sameSite).toBe("lax");
        expect(options.path).toBe("/");
    });

    it("reads and decrypts active session cookie via getSession", async () => {
        const token = await encryptSessionToken({
            id: "u9",
            email: "nine@fpt.edu.vn",
            name: "Nine",
            tokenVersion: 2,
        });
        cookieStoreMock.get.mockReturnValue({ value: token });

        const session = await getSession();
        expect(session?.user.id).toBe("u9");
        expect(session?.user.tokenVersion).toBe(2);

        cookieStoreMock.get.mockReturnValue(undefined);
        expect(await getSession()).toBeNull();
    });

    it("deletes session cookie on clearSession", async () => {
        await clearSession();
        expect(cookieStoreMock.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    });
});
