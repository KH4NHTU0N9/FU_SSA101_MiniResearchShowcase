export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    guardRateLimit,
    handlePrismaError,
    jsonError,
    parseJsonBody,
    requireAuth,
} from "@/lib/api/response";
import { containsProhibitedContent } from "@/lib/community/moderation";
import { fetchCommunityPosts, invalidateCommunityCache } from "@/lib/community/queries";
import { createPostSchema, parsePaginationParams, POST_CATEGORIES } from "@/lib/validation";

const VALID_CATEGORIES = new Set<string>(["ALL", ...POST_CATEGORIES]);

export async function GET(req: Request) {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category") ?? "ALL";
        if (!VALID_CATEGORIES.has(category)) {
            return jsonError("Invalid category filter", 400);
        }

        const { page, limit } = parsePaginationParams(
            searchParams.get("page"),
            searchParams.get("limit"),
            10,
            50
        );

        const posts = await fetchCommunityPosts({
            category,
            page,
            limit,
            currentUserId: auth.ctx.user.id,
        });

        return NextResponse.json(posts);
    } catch (error) {
        return handlePrismaError(error, "community GET");
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const rateError = guardRateLimit(
            req,
            "community:post",
            { windowMs: 10 * 60 * 1000, maxRequests: 15 },
            auth.ctx.user.id
        );
        if (rateError) return rateError;

        const parsed = await parseJsonBody(req, createPostSchema);
        if (parsed.error) return parsed.error;

        const { content, category } = parsed.data;
        if (containsProhibitedContent(content)) {
            return jsonError("Please keep the community supportive. Prohibited words detected.", 400);
        }

        const created = await prisma.post.create({
            data: {
                authorId: auth.ctx.user.id,
                content,
                category,
            },
            select: {
                id: true,
                content: true,
                category: true,
                likes: true,
                createdAt: true,
                authorId: true,
            },
        });

        invalidateCommunityCache();

        return NextResponse.json(
            {
                ...created,
                createdAt: created.createdAt.toISOString(),
                author: { name: "Anonymous" },
                comments: [],
                likedByUser: false,
            },
            { status: 201 }
        );
    } catch (error) {
        return handlePrismaError(error, "community POST");
    }
}
