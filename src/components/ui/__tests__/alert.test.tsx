import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

describe("ui/alert", () => {
    it("renders default alert role, title, and description", () => {
        render(
            <Alert>
                <AlertTitle>Notice</AlertTitle>
                <AlertDescription>Session saved cleanly.</AlertDescription>
            </Alert>
        );
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent("Notice");
        expect(alert).toHaveTextContent("Session saved cleanly.");
    });

    it("applies destructive variant styling", () => {
        render(<Alert variant="destructive">Failure</Alert>);
        expect(screen.getByRole("alert").className).toContain("border-destructive/50");
    });
});
