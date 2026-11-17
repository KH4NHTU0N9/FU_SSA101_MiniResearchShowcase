import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/community/loading";

describe("app/community/loading", () => {
    it("renders shimmer skeleton cards while community feed loads", () => {
        const { container } = render(<Loading />);
        expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(10);
    });
});
