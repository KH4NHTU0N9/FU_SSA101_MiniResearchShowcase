import { PostCategory } from "@prisma/client";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CommunityPost } from "@/types";

export const COMMUNITY_CACHE_TAG = "community-posts";

const VALID_CATEGORIES = new Set<string>(Object.values(PostCategory));

interface CachedPostRecord {
    id: string;
    content: string;
    category: PostCategory;
    likes: number;
    createdAt: string;
    authorId: string;
    comments: Array<{
        id: string;
        postId: string;
        authorId: string;
        content: string;
        createdAt: string;
    }>;
}

async function queryPublicPosts(
    category: string | undefined,
    page: number,
    limit: number
): Promise<CachedPostRecord[]> {
    const whereClause =
        category && category !== "ALL" && VALID_CATEGORIES.has(category)
            ? { category: category as PostCategory }
            : {};

    const rows = await prisma.post.findMany({
        where: whereClause,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            content: true,
            category: true,
            likes: true,
            createdAt: true,
            authorId: true,
            comments: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    postId: true,
                    authorId: true,
                    content: true,
                    createdAt: true,
                },
            },
        },
    });

    return rows.map((post) => ({
        id: post.id,
        content: post.content,
        category: post.category,
        likes: post.likes,
        createdAt: post.createdAt.toISOString(),
        authorId: post.authorId,
        comments: post.comments.map((comment) => ({
            id: comment.id,
            postId: comment.postId,
            authorId: comment.authorId,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
        })),
    }));
}

/**
 * Fetches anonymized community posts and overlays user-specific like status without cross-user cache leaks.
 */
export async function fetchCommunityPosts(options: {
    category?: string;
    page: number;
    limit: number;
    currentUserId?: string;
}): Promise<CommunityPost[]> {
    const { category, page, limit, currentUserId } = options;
    const normalizedCat = category && VALID_CATEGORIES.has(category) ? category : "ALL";

    const getCachedSlice = unstable_cache(
        async () => queryPublicPosts(normalizedCat, page, limit),
        [COMMUNITY_CACHE_TAG, normalizedCat, String(page), String(limit)],
        { tags: [COMMUNITY_CACHE_TAG], revalidate: 60 }
    );

    const posts = page === 1 ? await getCachedSlice() : await queryPublicPosts(normalizedCat, page, limit);

    let likedPostIds = new Set<string>();
    if (currentUserId && posts.length > 0) {
        const userLikes = await prisma.postLike.findMany({
            where: {
                userId: currentUserId,
                postId: { in: posts.map((p) => p.id) },
            },
            select: { postId: true },
        });
        likedPostIds = new Set(userLikes.map((like) => like.postId));
    }

    return posts.map((post) => ({
        id: post.id,
        content: post.content,
        category: post.category,
        likes: post.likes,
        createdAt: post.createdAt,
        authorId: post.authorId,
        author: { name: "Anonymous" },
        likedByUser: likedPostIds.has(post.id),
        comments: post.comments.map((comment) => ({
            id: comment.id,
            postId: comment.postId,
            authorId: comment.authorId,
            content: comment.content,
            createdAt: comment.createdAt,
            author: { name: "Anonymous" },
        })),
    }));
}

/**
 * Immediately expires cached community post lists and revalidates the /community route.
 */
export function invalidateCommunityCache(): void {
    revalidateTag(COMMUNITY_CACHE_TAG, { expire: 0 });
    revalidatePath("/community");
}
