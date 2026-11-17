import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostItem } from "@/components/features/community/post-item";
import type { CommunityPost } from "@/types";

const categories = [
    { id: "ALL", label: "All Topics" },
    { id: "ACADEMIC", label: "Academic Stress" },
];

const samplePost: CommunityPost = {
    id: "p1",
    content: "Preparing for finals week",
    category: "ACADEMIC",
    authorId: "u1",
    author: { name: "Anonymous" },
    likes: 4,
    likedByUser: false,
    createdAt: "2026-03-01T12:00:00.000Z",
    comments: [
        {
            id: "c1",
            authorId: "u2",
            author: { name: "Anonymous" },
            content: "Stay steady!",
            createdAt: "2026-03-01T12:15:00.000Z",
        },
    ],
};

describe("features/community/PostItem", () => {
    it("renders post category badge, comments, owner delete, and reply submission", () => {
        const onLike = vi.fn();
        const onDelete = vi.fn();
        const onReply = vi.fn();
        const setReplyContent = vi.fn();
        const onSubmitReply = vi.fn();

        const { rerender } = render(
            <PostItem
                post={samplePost}
                currentUserId="u1"
                likedByUser={false}
                onLike={onLike}
                onDelete={onDelete}
                onReply={onReply}
                isReplying={true}
                replyContent="You got this"
                setReplyContent={setReplyContent}
                onSubmitReply={onSubmitReply}
                categories={categories}
            />
        );

        expect(screen.getByText("Academic Stress")).toBeInTheDocument();
        expect(screen.getByText("Stay steady!")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Like post" }));
        expect(onLike).toHaveBeenCalledWith("p1", false);

        fireEvent.click(screen.getByRole("button", { name: "Delete post" }));
        expect(onDelete).toHaveBeenCalledWith("p1");

        fireEvent.submit(screen.getByLabelText("Write a supportive reply").closest("form")!);
        expect(onSubmitReply).toHaveBeenCalledWith("p1");

        rerender(
            <PostItem
                post={samplePost}
                currentUserId="other-user"
                likedByUser={true}
                onLike={onLike}
                onDelete={onDelete}
                onReply={onReply}
                isReplying={false}
                replyContent=""
                setReplyContent={setReplyContent}
                onSubmitReply={onSubmitReply}
                categories={categories}
            />
        );
        expect(screen.queryByRole("button", { name: "Delete post" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Unlike post" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
    });
});
