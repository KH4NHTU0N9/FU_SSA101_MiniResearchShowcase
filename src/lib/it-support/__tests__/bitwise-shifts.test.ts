import { describe, expect, it } from "vitest";
import {
    computeBitShift,
    computeBitwiseLogic,
    computeTwoComplementArithmetic,
} from "@/lib/it-support/binary";

describe("lib/it-support/binary bitwise, shift, and two's complement arithmetic", () => {
    it("evaluates 8-bit AND, OR, XOR, and NOT bitwise operations", () => {
        expect(computeBitwiseLogic("01011010", "00111100", "AND")).toBe("00011000");
        expect(computeBitwiseLogic("01011010", "00111100", "OR")).toBe("01111110");
        expect(computeBitwiseLogic("01011010", "00111100", "XOR")).toBe("01100110");
        expect(computeBitwiseLogic("01011010", "00000000", "NOT")).toBe("10100101");
    });

    it("evaluates logical, arithmetic, and circular 8-bit shifts preserving sign bit in ASR", () => {
        expect(computeBitShift("10110100", "LSL")).toBe("01101000");
        expect(computeBitShift("10110100", "LSR")).toBe("01011010");
        expect(computeBitShift("10110100", "ASR")).toBe("11011010");
        expect(computeBitShift("10110100", "ROL")).toBe("01101001");
        expect(computeBitShift("10110101", "ROR")).toBe("11011010");
    });

    it("evaluates modular 8-bit ADD and SUB in two's complement", () => {
        // 5 + (-3) = 2
        expect(computeTwoComplementArithmetic("00000101", "11111101", "ADD")).toBe("00000010");
        // 2 - 5 = -3 (11111101)
        expect(computeTwoComplementArithmetic("00000010", "00000101", "SUB")).toBe("11111101");
    });
});
