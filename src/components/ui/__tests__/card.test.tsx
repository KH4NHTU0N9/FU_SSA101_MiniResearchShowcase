import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

describe("ui/card", () => {
    it("composes CardHeader, CardTitle, CardDescription, CardContent, and CardFooter cleanly", () => {
        render(
            <Card data-testid="card-root">
                <CardHeader>
                    <CardTitle>Study Overview</CardTitle>
                    <CardDescription>Weekly progress metrics</CardDescription>
                </CardHeader>
                <CardContent>Details body</CardContent>
                <CardFooter>Footer actions</CardFooter>
            </Card>
        );

        expect(screen.getByTestId("card-root").className).toContain("glass-card");
        expect(screen.getByRole("heading", { name: "Study Overview" })).toBeInTheDocument();
        expect(screen.getByText("Weekly progress metrics")).toBeInTheDocument();
        expect(screen.getByText("Details body")).toBeInTheDocument();
        expect(screen.getByText("Footer actions")).toBeInTheDocument();
    });
});
