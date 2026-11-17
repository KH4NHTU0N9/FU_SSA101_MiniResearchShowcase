import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fetchCommunityPosts } from "@/lib/community/queries";
import { CommunityFeed } from "@/components/features/community/community-feed";
import type { CommunityPost } from "@/types";

export async function CommunityPosts() {
    const session = await getSession();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const dbUser = await prisma.user
        .findUnique({
            where: { id: session.user.id },
            select: { id: true, tokenVersion: true },
        })
        .catch(() => null);

    if (!dbUser || dbUser.tokenVersion !== session.user.tokenVersion) {
        redirect("/login");
    }

    let initialPosts: CommunityPost[] = [];
    try {
        initialPosts = await fetchCommunityPosts({
            page: 1,
            limit: 10,
            currentUserId: dbUser.id,
        });
    } catch (error) {
        console.error("[CommunityPosts SSR Error]", error);
    }

    return <CommunityFeed initialPosts={initialPosts} />;
}
