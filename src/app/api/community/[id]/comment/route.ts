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
import { invalidateCommunityCache } from "@/lib/community/queries";
import { createCommentSchema } from "@/lib/validation";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const rateError = guardRateLimit(
            req,
            "community:comment",
            { windowMs: 10 * 60 * 1000, maxRequests: 30 },
            auth.ctx.user.id
        );
        if (rateError) return rateError;

        const { id } = await params;

        const parsed = await parseJsonBody(req, createCommentSchema);
        if (parsed.error) return parsed.error;

        if (containsProhibitedContent(parsed.data.content)) {
            return jsonError("Please keep replies respectful and supportive.", 400);
        }

        const postExists = await prisma.post.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!postExists) {
            return jsonError("Post not found", 404);
        }

        const comment = await prisma.comment.create({
            data: {
                postId: id,
                authorId: auth.ctx.user.id,
                content: parsed.data.content,
            },
            select: {
                id: true,
                postId: true,
                authorId: true,
                content: true,
                createdAt: true,
            },
        });

        invalidateCommunityCache();

        return NextResponse.json(
            {
                ...comment,
                createdAt: comment.createdAt.toISOString(),
                author: { name: "Anonymous" },
            },
            { status: 201 }
        );
    } catch (error) {
        return handlePrismaError(error, "community comment POST");
    }
}
