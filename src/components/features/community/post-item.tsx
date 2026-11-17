"use client";

import { memo } from "react";
import { Heart, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CommunityComment, CommunityPost } from "@/types";

interface PostItemProps {
    post: CommunityPost;
    currentUserId?: string;
    likedByUser?: boolean;
    onLike: (id: string, currentlyLiked: boolean) => void;
    onDelete: (id: string) => void;
    onReply: (id: string) => void;
    isReplying: boolean;
    replyContent: string;
    setReplyContent: (val: string) => void;
    onSubmitReply: (id: string) => void;
    categories: ReadonlyArray<{ id: string; label: string }>;
}

function formatUtcDate(iso: string): string {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

export const PostItem = memo(
    ({
        post,
        currentUserId,
        likedByUser = false,
        onLike,
        onDelete,
        onReply,
        isReplying,
        replyContent,
        setReplyContent,
        onSubmitReply,
        categories,
    }: PostItemProps) => {
        return (
            <Card className="glass-card transition-colors">
                <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between items-start">
                        <span
                            className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded bg-secondary uppercase tracking-wider",
                                post.category === "ACADEMIC" && "text-blue-400 bg-blue-500/10",
                                post.category === "PSYCHOLOGY" && "text-rose-400 bg-rose-500/10",
                                post.category === "RESOURCES" && "text-emerald-400 bg-emerald-500/10"
                            )}
                        >
                            {categories.find((c) => c.id === post.category)?.label || post.category}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                {formatUtcDate(post.createdAt)}
                            </span>
                            {currentUserId === post.authorId && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(post.id)}
                                    className="text-muted-foreground hover:text-rose-500 transition-colors"
                                    title="Delete Post"
                                    aria-label="Delete post"
                                >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    <p className="text-xs text-muted-foreground/70">Posted by Anonymous</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t border-border/20 py-3">
                    <div className="flex justify-between w-full text-sm text-muted-foreground">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => onLike(post.id, likedByUser)}
                                aria-pressed={likedByUser}
                                aria-label={likedByUser ? "Unlike post" : "Like post"}
                                className="flex items-center gap-1 hover:text-rose-500 transition-colors"
                            >
                                <Heart
                                    className={cn("w-4 h-4", likedByUser && "fill-rose-500 text-rose-500")}
                                    aria-hidden="true"
                                />
                                <span>{post.likes}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onReply(post.id)}
                                aria-expanded={isReplying}
                                aria-label="Reply to post"
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                            >
                                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                                <span>{post.comments?.length || 0} Replies</span>
                            </button>
                        </div>
                    </div>

                    {post.comments && post.comments.length > 0 && (
                        <div className="w-full mt-2 space-y-2 pl-4 border-l-2 border-border/30">
                            {post.comments.map((reply: CommunityComment) => (
                                <div key={reply.id} className="bg-secondary/10 p-2 rounded text-sm space-y-1">
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Anonymous</span>
                                        <span>{formatUtcDate(reply.createdAt)}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{reply.content}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {isReplying && (
                        <form
                            className="w-full flex gap-2 mt-2 animate-in slide-in-from-top-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                onSubmitReply(post.id);
                            }}
                        >
                            <input
                                aria-label="Write a supportive reply"
                                className="flex-1 bg-background/50 border border-input rounded px-3 py-2 text-sm focus:ring-primary focus:outline-none"
                                placeholder="Write a supportive reply..."
                                value={replyContent}
                                maxLength={1000}
                                onChange={(e) => setReplyContent(e.target.value)}
                            />
                            <Button type="submit" size="sm" disabled={!replyContent.trim()}>
                                Reply
                            </Button>
                        </form>
                    )}
                </CardFooter>
            </Card>
        );
    }
);

PostItem.displayName = "PostItem";
