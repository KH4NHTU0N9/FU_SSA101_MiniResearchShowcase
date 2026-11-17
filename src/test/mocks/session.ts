import type { SessionPayload } from "@/lib/session";

export interface MockUserRecord {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    tokenVersion: number;
}

export function createMockUser(overrides: Partial<MockUserRecord> = {}): MockUserRecord {
    return {
        id: "user_1",
        email: "student@fpt.edu.vn",
        name: "Test Student",
        phone: "0901234567",
        tokenVersion: 0,
        ...overrides,
    };
}

export function createMockSession(
    userOverrides: Partial<MockUserRecord> = {}
): SessionPayload {
    const user = createMockUser(userOverrides);
    return {
        typ: "session",
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            tokenVersion: user.tokenVersion,
        },
        iss: "psych-support-web",
        aud: "psych-support-session",
    };
}
