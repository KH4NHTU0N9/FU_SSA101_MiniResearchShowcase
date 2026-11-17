export type BitwiseLogicOp = "AND" | "OR" | "XOR" | "NOT";
export type BitShiftOp = "LSL" | "ASL" | "LSR" | "ASR" | "ROL" | "ROR";
export type ArithmeticOp = "ADD" | "SUB";

/**
 * Formats a number into an 8-bit unsigned binary string.
 */
export function toBin8(num: number): string {
    return (num >>> 0).toString(2).padStart(8, "0").slice(-8);
}

/**
 * Parses an 8-bit unsigned binary string to an integer in [0, 255].
 */
export function toUnsigned(bin: string): number {
    return parseInt(bin, 2);
}

/**
 * Interprets an 8-bit binary string as a signed two's complement integer in [-128, 127].
 */
export function toTwoComplement(bin: string): number {
    const val = parseInt(bin, 2);
    return val > 127 ? val - 256 : val;
}

/**
 * Interprets an 8-bit binary string as a sign-and-magnitude number (preserving "-0").
 */
export function toSignMagnitude(bin: string): number | "-0" {
    const sign = bin[0] === "1" ? -1 : 1;
    const mag = parseInt(bin.slice(1), 2);
    if (sign === -1 && mag === 0) return "-0";
    return sign * mag;
}

/**
 * Decodes a 32-bit IEEE 754 bit pattern into a single-precision floating-point number.
 */
export function binToFloat32(binStr: string): number {
    if (binStr.length !== 32 || !/^[01]{32}$/.test(binStr)) return 0;
    const intVal = parseInt(binStr, 2);
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, intVal, false);
    return new DataView(buffer).getFloat32(0, false);
}

/**
 * Flips a single bit at `index` inside a binary bitstring.
 */
export function toggleBit(bin: string, index: number): string {
    if (index < 0 || index >= bin.length) return bin;
    const arr = bin.split("");
    arr[index] = arr[index] === "1" ? "0" : "1";
    return arr.join("");
}

/**
 * Evaluates 8-bit bitwise logic operations (AND, OR, XOR, NOT).
 */
export function computeBitwiseLogic(aBin: string, bBin: string, op: BitwiseLogicOp): string {
    const a = parseInt(aBin, 2);
    const b = parseInt(bBin, 2);
    let res = 0;
    if (op === "AND") res = a & b;
    else if (op === "OR") res = a | b;
    else if (op === "XOR") res = a ^ b;
    else if (op === "NOT") res = ~a;
    return toBin8(res & 0xff);
}

/**
 * Evaluates single-bit 8-bit shift and rotation operations (LSL, ASL, LSR, ASR, ROL, ROR).
 */
export function computeBitShift(bin: string, op: BitShiftOp): string {
    const a = parseInt(bin, 2);
    let res = 0;
    if (op === "LSL" || op === "ASL") res = a << 1;
    else if (op === "LSR") res = a >>> 1;
    else if (op === "ASR") {
        const signedA = a > 127 ? a - 256 : a;
        res = signedA >> 1;
    } else if (op === "ROL") {
        res = (a << 1) | (a >>> 7);
    } else if (op === "ROR") {
        res = (a >>> 1) | ((a & 1) << 7);
    }
    return toBin8(res & 0xff);
}

/**
 * Evaluates 8-bit modular two's complement addition or subtraction.
 */
export function computeTwoComplementArithmetic(
    aBin: string,
    bBin: string,
    op: ArithmeticOp
): string {
    const a = parseInt(aBin, 2);
    const b = parseInt(bBin, 2);
    const res = op === "ADD" ? a + b : a - b;
    return toBin8(res & 0xff);
}
