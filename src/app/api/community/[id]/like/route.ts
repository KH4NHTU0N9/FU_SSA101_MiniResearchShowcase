export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, requireAuth } from "@/lib/api/response";
import { invalidateCommunityCache } from "@/lib/community/queries";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await params;
        const userId = auth.ctx.user.id;

        const result = await prisma.$transaction(async (tx) => {
            const post = await tx.post.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!post) {
                return null;
            }

            const existingLike = await tx.postLike.findUnique({
                where: { userId_postId: { userId, postId: id } },
                select: { id: true },
            });

            let liked: boolean;
            if (existingLike) {
                await tx.postLike.delete({ where: { id: existingLike.id } });
                liked = false;
            } else {
                await tx.postLike.create({
                    data: { userId, postId: id },
                });
                liked = true;
            }

            const likesCount = await tx.postLike.count({ where: { postId: id } });
            await tx.post.update({
                where: { id },
                data: { likes: likesCount },
            });

            return { likes: likesCount, liked };
        });

        if (!result) {
            return jsonError("Post not found", 404);
        }

        invalidateCommunityCache();

        return NextResponse.json(result);
    } catch (error) {
        return handlePrismaError(error, "community like POST");
    }
}
