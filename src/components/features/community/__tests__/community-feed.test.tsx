import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityFeed } from "@/components/features/community/community-feed";
import type { CommunityPost } from "@/types";

const { showToastMock, confirmActionMock } = vi.hoisted(() => ({
    showToastMock: vi.fn(),
    confirmActionMock: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
    useAuth: () => ({
        user: { id: "u1", name: "An Nguyen", email: "an@fpt.edu.vn", phone: null },
    }),
}));

vi.mock("@/components/ui/toast", () => ({
    useToast: () => ({
        showToast: showToastMock,
        confirmAction: confirmActionMock,
    }),
}));

const initialPosts: CommunityPost[] = [
    {
        id: "p1",
        content: "Looking for study partners",
        category: "ACADEMIC",
        authorId: "u1",
        author: { name: "Anonymous" },
        likes: 1,
        likedByUser: false,
        createdAt: "2026-03-01T10:00:00.000Z",
        comments: [],
    },
];

describe("features/community/CommunityFeed", () => {
    beforeEach(() => {
        showToastMock.mockReset();
        confirmActionMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("blocks prohibited content client-side, publishes new posts, and reconciles optimistic likes", async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === "/api/community" && init?.method === "POST") {
                return new Response(
                    JSON.stringify({
                        id: "p2",
                        content: "Encouraging each other before midterms",
                        category: "ACADEMIC",
                        authorId: "u1",
                        likes: 0,
                        likedByUser: false,
                        createdAt: "2026-03-02T10:00:00.000Z",
                        comments: [],
                    }),
                    { status: 201 }
                );
            }
            if (url === "/api/community/p1/like" && init?.method === "POST") {
                return new Response(JSON.stringify({ likes: 2, liked: true }), { status: 200 });
            }
            if (url.startsWith("/api/community?page=1&limit=10&category=PSYCHOLOGY")) {
                return new Response(JSON.stringify([]), { status: 200 });
            }
            return new Response("{}", { status: 404 });
        });
        vi.stubGlobal("fetch", fetchMock);

        render(<CommunityFeed initialPosts={initialPosts} />);

        const textarea = screen.getByLabelText("Create a supportive post");
        fireEvent.change(textarea, { target: { value: "kill yourself" } });
        fireEvent.click(screen.getByRole("button", { name: "Post to Community" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/Prohibited words detected/i);
        expect(fetchMock).not.toHaveBeenCalled();

        fireEvent.change(textarea, {
            target: { value: "Encouraging each other before midterms" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Post to Community" }));

        expect(await screen.findByText("Encouraging each other before midterms")).toBeInTheDocument();
        expect(showToastMock).toHaveBeenCalledWith("Post published anonymously.", "success");

        const likeButtons = screen.getAllByRole("button", { name: "Like post" });
        fireEvent.click(likeButtons[1]);
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith("/api/community/p1/like", { method: "POST" });
        });

        fireEvent.click(screen.getByRole("tab", { name: "Psychology Q&A" }));
        expect(await screen.findByText(/No posts in this category yet/i)).toBeInTheDocument();
    });
});
