"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { PostItem } from "@/components/features/community/post-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { containsProhibitedContent } from "@/lib/community/moderation";
import type {
    CommunityCategoryFilter,
    CommunityComment,
    CommunityPost,
    PostCategoryValue,
} from "@/types";

const CATEGORIES: ReadonlyArray<{ id: CommunityCategoryFilter; label: string }> = [
    { id: "ALL", label: "All Topics" },
    { id: "ACADEMIC", label: "Academic Stress" },
    { id: "PSYCHOLOGY", label: "Psychology Q&A" },
    { id: "RESOURCES", label: "Study Resources" },
    { id: "OTHER", label: "General Support" },
];

const PAGE_LIMIT = 10;

export function CommunityFeed({ initialPosts }: { initialPosts: CommunityPost[] }) {
    const { user } = useAuth();
    const { showToast, confirmAction } = useToast();

    const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
    const [newPost, setNewPost] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<CommunityCategoryFilter>("ALL");
    const [postCategory, setPostCategory] = useState<PostCategoryValue>("ACADEMIC");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialPosts.length >= PAGE_LIMIT);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const fetchAbortRef = useRef<AbortController | null>(null);
    const pendingLikesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        return () => {
            fetchAbortRef.current?.abort();
        };
    }, []);

    const handleLoadMore = async () => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        const nextPage = page + 1;

        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        try {
            const res = await fetch(
                `/api/community?page=${nextPage}&limit=${PAGE_LIMIT}&category=${selectedCategory}`,
                { signal: controller.signal }
            );
            if (!res.ok) {
                showToast("Could not load more posts.", "error");
                return;
            }
            const newPosts = (await res.json()) as CommunityPost[];
            if (newPosts.length < PAGE_LIMIT) setHasMore(false);
            setPosts((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                return [...prev, ...newPosts.filter((p) => !seen.has(p.id))];
            });
            setPage(nextPage);
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") {
                showToast("Network error while loading posts.", "error");
            }
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleCategoryChange = async (catId: CommunityCategoryFilter) => {
        setSelectedCategory(catId);
        setPage(1);
        setIsLoadingMore(true);

        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        try {
            const res = await fetch(
                `/api/community?page=1&limit=${PAGE_LIMIT}&category=${catId}`,
                { signal: controller.signal }
            );
            if (!res.ok) {
                showToast("Failed to filter category.", "error");
                return;
            }
            const newPosts = (await res.json()) as CommunityPost[];
            setPosts(newPosts);
            setHasMore(newPosts.length >= PAGE_LIMIT);
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") {
                showToast("Network error while loading category.", "error");
            }
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handlePost = async () => {
        const trimmed = newPost.trim();
        if (!trimmed || isSubmitting) return;

        if (containsProhibitedContent(trimmed)) {
            setError("Please keep the community supportive. Prohibited words detected.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/community", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: trimmed, category: postCategory }),
            });

            if (res.ok) {
                const created = (await res.json()) as CommunityPost;
                if (selectedCategory === "ALL" || selectedCategory === created.category) {
                    setPosts((prev) => [created, ...prev]);
                } else {
                    void handleCategoryChange("ALL");
                }
                setNewPost("");
                setError("");
                showToast("Post published anonymously.", "success");
            } else {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                setError(errData.error || "Failed to post. Please try again.");
            }
        } catch {
            setError("Network error while publishing post.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (id: string, currentlyLiked: boolean) => {
        if (pendingLikesRef.current.has(id)) return;
        pendingLikesRef.current.add(id);

        setPosts((prev) =>
            prev.map((p) =>
                p.id === id
                    ? {
                          ...p,
                          likes: currentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
                          likedByUser: !currentlyLiked,
                      }
                    : p
            )
        );

        try {
            const res = await fetch(`/api/community/${id}/like`, { method: "POST" });
            if (!res.ok) {
                throw new Error("Failed to update like");
            }
            const data = (await res.json()) as { likes: number; liked: boolean };
            setPosts((currentPosts) =>
                currentPosts.map((p) =>
                    p.id === id ? { ...p, likes: data.likes, likedByUser: data.liked } : p
                )
            );
        } catch {
            setPosts((currentPosts) =>
                currentPosts.map((p) =>
                    p.id === id
                        ? {
                              ...p,
                              likes: currentlyLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
                              likedByUser: currentlyLiked,
                          }
                        : p
                )
            );
            showToast("Could not update reaction. Please try again.", "error");
        } finally {
            pendingLikesRef.current.delete(id);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction({
            title: "Delete this post?",
            description: "This post and its replies will be permanently removed.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            destructive: true,
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/community/${id}`, { method: "DELETE" });
            if (res.ok) {
                setPosts((prev) => prev.filter((p) => p.id !== id));
                showToast("Post deleted.", "success");
            } else {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to delete post.", "error");
            }
        } catch {
            showToast("Network error while deleting post.", "error");
        }
    };

    const handleReply = async (postId: string) => {
        const trimmed = replyContent.trim();
        if (!trimmed) return;

        if (containsProhibitedContent(trimmed)) {
            showToast("Please keep replies respectful and supportive.", "error");
            return;
        }

        try {
            const res = await fetch(`/api/community/${postId}/comment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: trimmed }),
            });

            if (res.ok) {
                const newComment = (await res.json()) as CommunityComment;
                setPosts((prev) =>
                    prev.map((p) =>
                        p.id === postId
                            ? { ...p, comments: [...(p.comments || []), newComment] }
                            : p
                    )
                );
                setReplyContent("");
                setReplyingTo(null);
            } else {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(errData.error || "Failed to post reply.", "error");
            }
        } catch {
            showToast("Network error while posting reply.", "error");
        }
    };

    return (
        <div className="max-w-4xl w-full mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
                    Community Board
                </h1>
                <div
                    role="tablist"
                    aria-label="Filter posts by category"
                    className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto"
                >
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            role="tab"
                            aria-selected={selectedCategory === cat.id}
                            onClick={() => void handleCategoryChange(cat.id)}
                            className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                                selectedCategory === cat.id
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                    : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <Card className="glass-card border-primary/20">
                <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                        <label htmlFor="community-post-input" className="text-sm font-medium block">
                            Create a supportive post
                        </label>
                        <textarea
                            id="community-post-input"
                            className="w-full h-24 bg-background/50 border border-input rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
                            placeholder="Share your thoughts, ask for advice, or vent safely..."
                            value={newPost}
                            maxLength={2000}
                            onChange={(e) => {
                                setNewPost(e.target.value);
                                if (error) setError("");
                            }}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <select
                            aria-label="Post category"
                            className="bg-accent rounded-lg px-3 py-2 text-sm focus:outline-none border border-input"
                            value={postCategory}
                            onChange={(e) => setPostCategory(e.target.value as PostCategoryValue)}
                        >
                            {CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        <Button
                            onClick={() => void handlePost()}
                            disabled={!newPost.trim() || isSubmitting}
                            className="w-full md:w-auto"
                        >
                            {isSubmitting ? "Posting..." : "Post to Community"}
                        </Button>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="text-sm text-rose-500 flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-4">
                {posts.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No posts in this category yet. Be the first!
                    </div>
                )}
                {posts.map((post) => (
                    <PostItem
                        key={post.id}
                        post={post}
                        currentUserId={user?.id}
                        likedByUser={post.likedByUser}
                        onLike={handleLike}
                        onDelete={handleDelete}
                        onReply={(id) => {
                            setReplyingTo(replyingTo === id ? null : id);
                            setReplyContent("");
                        }}
                        isReplying={replyingTo === post.id}
                        replyContent={replyContent}
                        setReplyContent={setReplyContent}
                        onSubmitReply={handleReply}
                        categories={CATEGORIES}
                    />
                ))}

                {hasMore && (
                    <div className="flex justify-center pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => void handleLoadMore()}
                            disabled={isLoadingMore}
                        >
                            {isLoadingMore ? "Loading..." : "Load More Posts"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
