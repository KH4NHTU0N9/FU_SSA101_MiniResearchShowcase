import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SUBJECT_SEED_DATA, seedSubjects } from "../../../prisma/seed-subjects";

describe("security/db-schema-and-seed-contract", () => {
    it("enforces referential cascade rules and composite performance indexes in schema.prisma", () => {
        const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf-8");

        expect(schema).toContain("tokenVersion     Int       @default(0)");
        expect(schema).toContain("@@unique([userId, postId])");
        expect(schema).toContain("@@index([userId, createdAt])");
        expect(schema).toContain("@@index([status, createdAt])");
        expect(schema).toContain("onDelete: Cascade");
        expect(schema).toContain("onDelete: Restrict");
    });

    it("keeps SUBJECT_SEED_DATA globally unique across all semesters and seeds idempotently", async () => {
        const seenCodes = new Set<string>();
        const duplicates: string[] = [];

        for (const codes of Object.values(SUBJECT_SEED_DATA)) {
            for (const code of codes) {
                if (seenCodes.has(code)) duplicates.push(code);
                seenCodes.add(code);
            }
        }
        expect(duplicates).toEqual([]);
        expect(Object.keys(SUBJECT_SEED_DATA).length).toBeGreaterThanOrEqual(10);

        const upsertMock = vi.fn(async ({ create }: { create: { name: string } }) => ({
            id: `sem-${create.name}`,
            name: create.name,
        }));
        const createManyMock = vi.fn<
            (arg: { skipDuplicates?: boolean; data: unknown[] }) => Promise<{ count: number }>
        >(async () => ({ count: 1 }));

        await seedSubjects({
            semester: { upsert: upsertMock },
            subject: { createMany: createManyMock },
        } as never);

        expect(upsertMock).toHaveBeenCalledTimes(Object.keys(SUBJECT_SEED_DATA).length);
        for (const [arg] of createManyMock.mock.calls) {
            expect(arg.skipDuplicates).toBe(true);
            expect(arg.data.length).toBeGreaterThan(0);
        }
    });
});
