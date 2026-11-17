import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfessionalHelpModal } from "@/components/features/professional-help-modal";

vi.mock("framer-motion", () => ({
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
        div: ({
            children,
            className,
            role,
            "aria-modal": ariaModal,
            "aria-labelledby": ariaLabelledBy,
            onClick,
        }: {
            children?: ReactNode;
            className?: string;
            role?: string;
            "aria-modal"?: boolean;
            "aria-labelledby"?: string;
            onClick?: () => void;
        }) => (
            <div
                className={className}
                role={role}
                aria-modal={ariaModal}
                aria-labelledby={ariaLabelledBy}
                onClick={onClick}
            >
                {children}
            </div>
        ),
    },
}));

describe("features/ProfessionalHelpModal", () => {
    it("displays tailored distress messaging, emergency hotline tel links, and closes on Escape", () => {
        const onOpenChange = vi.fn();
        const { unmount } = render(
            <ProfessionalHelpModal open={true} onOpenChange={onOpenChange} reason="score" />
        );

        expect(screen.getByRole("dialog")).toHaveTextContent(
            /Your assessment results suggest you are experiencing high levels of distress/i
        );
        expect(screen.getByRole("link", { name: /111/ })).toHaveAttribute("href", "tel:111");
        expect(screen.getByRole("link", { name: /096 306 1414/ })).toHaveAttribute(
            "href",
            "tel:0963061414"
        );
        expect(document.body.style.overflow).toBe("hidden");

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onOpenChange).toHaveBeenCalledWith(false);

        unmount();
        expect(document.body.style.overflow).toBe("unset");
    });

    it("renders chat reason copy and closes when acknowledgment button is clicked", () => {
        const onOpenChange = vi.fn();
        render(<ProfessionalHelpModal open={true} onOpenChange={onOpenChange} reason="chat" />);

        expect(
            screen.getByText(/Your recent messages indicate you might need more support/i)
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "I understand, thank you" }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
