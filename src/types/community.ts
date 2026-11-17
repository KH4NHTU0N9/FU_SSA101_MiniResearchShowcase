/**
 * Community post categories matching Prisma PostCategory enum.
 */
export type PostCategoryValue = "ACADEMIC" | "PSYCHOLOGY" | "RESOURCES" | "OTHER";

export type CommunityCategoryFilter = "ALL" | PostCategoryValue;

/**
 * Anonymous author metadata exposed in community responses (never includes PII/email).
 */
export interface CommunityAuthor {
    name: string;
}

/**
 * Comment payload shared between Community API routes, RSCs, and Client Components.
 */
export interface CommunityComment {
    id: string;
    postId?: string;
    authorId: string;
    content: string;
    createdAt: string;
    author: CommunityAuthor;
}

/**
 * Post payload shared between Community API routes, RSCs, and Client Components.
 */
export interface CommunityPost {
    id: string;
    content: string;
    category: PostCategoryValue | string;
    likes: number;
    createdAt: string;
    authorId: string;
    author: CommunityAuthor;
    comments: CommunityComment[];
    likedByUser?: boolean;
}
