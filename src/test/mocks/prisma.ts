import { vi } from "vitest";

function createModelMock() {
    return {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
    };
}

export const prismaMock = {
    user: createModelMock(),
    pendingRegistration: createModelMock(),
    pendingEmailChange: createModelMock(),
    assessment: createModelMock(),
    moodLog: createModelMock(),
    post: createModelMock(),
    comment: createModelMock(),
    postLike: createModelMock(),
    semester: createModelMock(),
    subject: createModelMock(),
    material: createModelMock(),
    materialFile: createModelMock(),
    flashcardDeck: createModelMock(),
    flashcard: createModelMock(),
    fixedEvent: createModelMock(),
    task: createModelMock(),
    chat: createModelMock(),
    message: createModelMock(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === "function") {
            return await (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
        }
        if (Array.isArray(arg)) {
            return await Promise.all(arg);
        }
        return arg;
    }),
};

export function resetPrismaMocks(): void {
    const models = Object.values(prismaMock) as Array<Record<string, unknown> | ReturnType<typeof vi.fn>>;
    for (const entry of models) {
        if (typeof entry === "function" && "mockReset" in entry) {
            entry.mockReset();
        } else if (typeof entry === "object" && entry !== null) {
            for (const fn of Object.values(entry)) {
                if (typeof fn === "function" && "mockReset" in fn) {
                    (fn as ReturnType<typeof vi.fn>).mockReset();
                }
            }
        }
    }
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === "function") {
            return await (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
        }
        if (Array.isArray(arg)) {
            return await Promise.all(arg);
        }
        return arg;
    });
}
