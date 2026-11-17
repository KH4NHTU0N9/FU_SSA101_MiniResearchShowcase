export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, requireAuth } from "@/lib/api/response";
import { invalidateCommunityCache } from "@/lib/community/queries";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await params;

        const post = await prisma.post.findUnique({
            where: { id },
            select: { id: true, authorId: true },
        });

        if (!post) {
            return jsonError("Post not found", 404);
        }

        if (post.authorId !== auth.ctx.user.id) {
            return jsonError("Forbidden", 403);
        }

        await prisma.post.delete({ where: { id } });
        invalidateCommunityCache();

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "community DELETE");
    }
}
