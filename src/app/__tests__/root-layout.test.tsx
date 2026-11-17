import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
    Outfit: () => ({ variable: "--font-sans" }),
}));

vi.mock("next/image", () => ({
    default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={className} />
    ),
}));

vi.mock("@/components/layout/navbar", () => ({
    Navbar: () => <nav data-testid="mock-navbar" />,
}));

vi.mock("@/components/features/nudge-system", () => ({
    NudgeSystem: () => <div data-testid="mock-nudge" />,
}));

vi.mock("@/components/features/crisis-button", () => ({
    CrisisFloatingButton: () => <div data-testid="mock-crisis" />,
}));

vi.mock("@/lib/auth-context", () => ({
    AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import RootLayout, { metadata } from "@/app/layout";

describe("app/RootLayout", () => {
    it("exports app metadata and wraps children with providers, branding header, navbar, and safety chrome", () => {
        expect(metadata.title).toBe("CHATGPT Team Support Web");

        const html = renderToStaticMarkup(
            <RootLayout>
                <div data-testid="page-slot">Main Child Content</div>
            </RootLayout>
        );

        expect(html).toContain('lang="en"');
        expect(html).toContain('src="/fptu-logo-custom.png"');
        expect(html).toContain('alt="FPTU Logo"');
        expect(html).toContain('data-testid="mock-navbar"');
        expect(html).toContain("Main Child Content");
        expect(html).toContain('data-testid="mock-nudge"');
        expect(html).toContain('data-testid="mock-crisis"');
    });
});
