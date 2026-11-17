import { describe, expect, it } from "vitest";
import {
    type AlgorithmFrame,
    generateBubbleSortFrames,
    generateInsertionSortFrames,
    generateMergeSortFrames,
    generateQuickSortFrames,
    generateSelectionSortFrames,
} from "@/lib/it-support/algorithms";

function getFinalArrayState(frames: AlgorithmFrame[], fallback: number[]): number[] {
    for (let i = frames.length - 1; i >= 0; i--) {
        if (frames[i].arr) return frames[i].arr!;
    }
    return fallback;
}

describe("lib/it-support/algorithms sorting frame generators", () => {
    const sample = [38, 12, 95, 24, 12, 61, 7];
    const expectedSorted = [7, 12, 12, 24, 38, 61, 95];

    it("produces frames ending in non-decreasing sorted order across all five sorting algorithms", () => {
        const generators = [
            generateBubbleSortFrames,
            generateSelectionSortFrames,
            generateInsertionSortFrames,
            generateMergeSortFrames,
            generateQuickSortFrames,
        ];

        for (const gen of generators) {
            const copy = [...sample];
            const frames = gen(copy);
            expect(copy).toEqual(sample); // must not mutate input
            expect(frames.at(-1)?.type).toBe("all_sorted");
            expect(getFinalArrayState(frames, [])).toEqual(expectedSorted);
        }
    });

    it("handles empty and single-element arrays without crashing", () => {
        expect(generateInsertionSortFrames([])).toHaveLength(1);
        expect(generateMergeSortFrames([42]).at(-1)?.arr).toEqual([42]);
        expect(generateQuickSortFrames([42]).at(-1)?.arr).toEqual([42]);
    });
});
