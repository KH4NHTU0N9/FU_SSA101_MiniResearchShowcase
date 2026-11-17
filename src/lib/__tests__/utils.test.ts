import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
    it("merges static and conditional class names", () => {
        expect(cn("p-4", true && "text-sm", false && "hidden")).toBe("p-4 text-sm");
    });

    it("resolves conflicting Tailwind utility classes in favor of later entries", () => {
        expect(cn("px-2 py-1 text-red-500", "px-6 text-blue-600")).toBe(
            "py-1 px-6 text-blue-600"
        );
    });

    it("handles arrays, objects, undefined, and null inputs gracefully", () => {
        expect(
            cn(["flex", null], { "items-center": true, "justify-end": false }, undefined)
        ).toBe("flex items-center");
    });
});
