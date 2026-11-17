import { describe, expect, it } from "vitest";
import {
    generateBinarySearchFrames,
    generateLinearSearchFrames,
} from "@/lib/it-support/algorithms";

describe("lib/it-support/algorithms searching frame generators", () => {
    it("finds target index and emits terminal found frame in Linear and Binary search", () => {
        const unsorted = [45, 10, 72, 19, 33];
        const linearFrames = generateLinearSearchFrames(unsorted, 19);
        expect(linearFrames.at(-1)).toMatchObject({ type: "found", indices: [3] });

        const sorted = [10, 19, 33, 45, 72];
        const binaryFrames = generateBinarySearchFrames(sorted, 45);
        expect(binaryFrames.at(-1)).toMatchObject({ type: "found", indices: [3] });
    });

    it("emits not_found frame when target does not exist or array is empty", () => {
        expect(generateLinearSearchFrames([1, 2, 3], 99).at(-1)?.type).toBe("not_found");
        expect(generateBinarySearchFrames([1, 2, 3, 4], 0).at(-1)?.type).toBe("not_found");
        expect(generateBinarySearchFrames([], 5).at(-1)?.type).toBe("not_found");
    });
});
