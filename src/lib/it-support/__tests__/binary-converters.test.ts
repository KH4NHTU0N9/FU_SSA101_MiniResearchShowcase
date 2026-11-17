import { describe, expect, it } from "vitest";
import {
    toBin8,
    toggleBit,
    toSignMagnitude,
    toTwoComplement,
    toUnsigned,
} from "@/lib/it-support/binary";

describe("lib/it-support/binary base converters", () => {
    it("formats unsigned integers into 8-bit binary strings", () => {
        expect(toBin8(0)).toBe("00000000");
        expect(toBin8(5)).toBe("00000101");
        expect(toBin8(255)).toBe("11111111");
        expect(toBin8(-1)).toBe("11111111");
    });

    it("interprets unsigned, two's complement, and sign-magnitude 8-bit values", () => {
        expect(toUnsigned("10000101")).toBe(133);
        expect(toTwoComplement("10000101")).toBe(-123);
        expect(toTwoComplement("01111111")).toBe(127);
        expect(toTwoComplement("11111111")).toBe(-1);

        expect(toSignMagnitude("00000101")).toBe(5);
        expect(toSignMagnitude("10000101")).toBe(-5);
        expect(toSignMagnitude("10000000")).toBe("-0");
    });

    it("toggles bits safely and preserves bitstring on out-of-bounds indices", () => {
        expect(toggleBit("0101", 0)).toBe("1101");
        expect(toggleBit("0101", 1)).toBe("0001");
        expect(toggleBit("0101", -1)).toBe("0101");
        expect(toggleBit("0101", 9)).toBe("0101");
    });
});
