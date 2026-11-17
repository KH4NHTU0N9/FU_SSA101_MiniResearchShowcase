import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CommunityError from "@/app/community/error";
import ExamMaterialsError from "@/app/exam-materials/error";

describe("Segment Error Boundaries", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("renders CommunityError with digest and hides raw error messages in production", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.spyOn(console, "error").mockImplementation(() => {});
        const reset = vi.fn();
        const err = Object.assign(new Error("Raw internal stack"), { digest: "comm-500" });

        render(<CommunityError error={err} reset={reset} />);
        expect(screen.getByText("Community Service Unavailable")).toBeInTheDocument();
        expect(screen.getByText("Reference: comm-500")).toBeInTheDocument();
        expect(screen.queryByText("Raw internal stack")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
        expect(reset).toHaveBeenCalledTimes(1);
    });

    it("renders ExamMaterialsError with digest and retry action", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.spyOn(console, "error").mockImplementation(() => {});
        const reset = vi.fn();
        const err = Object.assign(new Error("Blob failure"), { digest: "exam-502" });

        render(<ExamMaterialsError error={err} reset={reset} />);
        expect(screen.getByText("Unable to load Exam Materials")).toBeInTheDocument();
        expect(screen.getByText("Reference: exam-502")).toBeInTheDocument();
        expect(screen.queryByText("Blob failure")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(reset).toHaveBeenCalledTimes(1);
    });
});
