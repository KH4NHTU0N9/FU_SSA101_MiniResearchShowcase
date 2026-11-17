import { describe, expect, it } from "vitest";
import { translations } from "@/lib/translations";

describe("lib/translations EN/VN dictionary parity", () => {
    it("maintains identical non-empty keys across English and Vietnamese locales", () => {
        const enKeys = Object.keys(translations.en).sort();
        const vnKeys = Object.keys(translations.vn).sort();

        expect(enKeys).toEqual(vnKeys);
        expect(enKeys.length).toBeGreaterThan(20);

        for (const key of enKeys as Array<keyof typeof translations.en>) {
            expect(translations.en[key].trim().length).toBeGreaterThan(0);
            expect(translations.vn[key].trim().length).toBeGreaterThan(0);
        }
    });
});
