import { describe, expect, it } from "vitest";
import { binToFloat32 } from "@/lib/it-support/binary";

describe("lib/it-support/binary IEEE 754 float32 conversion", () => {
    it("decodes exact normal positive and negative single-precision patterns", () => {
        // -12.5 = 1 10000010 10010000000000000000000
        expect(binToFloat32("11000001010010000000000000000000")).toBeCloseTo(-12.5, 6);
        // 1.0 = 0 01111111 00000000000000000000000
        expect(binToFloat32("00111111100000000000000000000000")).toBe(1);
    });

    it("handles IEEE 754 special values (+0, -0, +Infinity, -Infinity, NaN) and invalid strings", () => {
        expect(Object.is(binToFloat32("0".repeat(32)), 0)).toBe(true);
        expect(Object.is(binToFloat32(`1${"0".repeat(31)}`), -0)).toBe(true);
        expect(binToFloat32(`0${"1".repeat(8)}${"0".repeat(23)}`)).toBe(Infinity);
        expect(binToFloat32(`1${"1".repeat(8)}${"0".repeat(23)}`)).toBe(-Infinity);
        expect(Number.isNaN(binToFloat32(`0${"1".repeat(9)}${"0".repeat(22)}`))).toBe(true);
        expect(binToFloat32("short")).toBe(0);
    });
});
