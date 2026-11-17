import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ITSearch from "@/app/it-support/page";

describe("app/it-support", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("switches tabs across Bitwise, Integer representations, Floating point, and Sorting visualizer", async () => {
        render(<ITSearch />);

        expect(screen.getByText("CompArch Lab")).toBeInTheDocument();
        expect(screen.getByText("Toán tử Logic (Bitwise Operations)")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /3\. Biểu diễn Số nguyên/i }));
        expect(screen.getByText("Biểu diễn Số Nguyên")).toBeInTheDocument();
        expect(screen.getByText("133")).toBeInTheDocument();
        expect(screen.getByText("-5")).toBeInTheDocument();
        expect(screen.getByText("-123")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /5\. Số thực/i }));
        expect(screen.getByText("Số Thực (IEEE 754 32-bit)")).toBeInTheDocument();
        expect(screen.getByText("-12.50000")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /6\. Sắp xếp/i }));
        expect(screen.getByText(/Thuật toán Sắp xếp/i)).toBeInTheDocument();
    });

    it("requests AI explanation via /api/it-support/ai and renders formatted markdown + error handling", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        explanation: "**Tóm tắt**\n- Bitwise AND giữ nguyên các bit cùng bằng 1.",
                    }),
                    { status: 200 }
                )
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
            );
        vi.stubGlobal("fetch", fetchMock);

        render(<ITSearch />);

        fireEvent.click(screen.getByRole("button", { name: /Giải thích chuyên sâu bằng AI/i }));
        expect(
            await screen.findByText("Bitwise AND giữ nguyên các bit cùng bằng 1.")
        ).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/it-support/ai",
            expect.objectContaining({ method: "POST" })
        );

        fireEvent.click(screen.getByRole("button", { name: "Đóng phản hồi AI" }));
        fireEvent.click(screen.getByRole("button", { name: /Giải thích chuyên sâu bằng AI/i }));

        await waitFor(() => {
            expect(screen.getByText("Rate limited")).toBeInTheDocument();
        });
    });
});
