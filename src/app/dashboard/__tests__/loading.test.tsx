import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardLoading from "@/app/dashboard/loading";

describe("app/dashboard/loading", () => {
    it("renders animated skeleton placeholders while dashboard data loads", () => {
        const { container } = render(<DashboardLoading />);
        const skeletons = container.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBeGreaterThanOrEqual(8);
    });
});
