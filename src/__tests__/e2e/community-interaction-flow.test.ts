import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJsonRequest, buildRawRequest } from "@/test/mocks/next";

const { cookieJar, activeUserRef, posts, comments, likes } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    activeUserRef: {
        current: { id: "u-author", email: "author@fpt.edu.vn", name: "Author", tokenVersion: 1 },
    },
    posts: [] as Array<{
        id: string;
        authorId: string;
        content: string;
        category: string;
        likes: number;
        createdAt: Date;
    }>,
    comments: [] as Array<{
        id: string;
        postId: string;
        authorId: string;
        content: string;
        createdAt: Date;
    }>,
    likes: [] as Array<{ id: string; userId: string; postId: string }>,
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => {
            const val = cookieJar.get(name);
            return val ? { name, value: val } : undefined;
        },
        set: (name: string, value: string) => {
            cookieJar.set(name, value);
        },
        delete: (name: string) => {
            cookieJar.delete(name);
        },
    }),
}));

vi.mock("next/cache", () => ({
    unstable_cache: <T extends (...args: never[]) => Promise<unknown>>(fn: T) => fn,
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
    const models = {
        user: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                where.id === activeUserRef.current.id ? activeUserRef.current : null,
        },
        post: {
            create: async ({ data }: { data: { authorId: string; content: string; category: string } }) => {
                const row = {
                    id: `post-${posts.length + 1}`,
                    ...data,
                    likes: 0,
                    createdAt: new Date(),
                };
                posts.push(row);
                return row;
            },
            findMany: async ({ where }: { where?: { category?: string } }) =>
                posts
                    .filter((p) => !where?.category || p.category === where.category)
                    .map((p) => ({
                        ...p,
                        comments: comments.filter((c) => c.postId === p.id),
                    })),
            findUnique: async ({ where }: { where: { id: string } }) =>
                posts.find((p) => p.id === where.id) ?? null,
            update: async ({ where, data }: { where: { id: string }; data: { likes: number } }) => {
                const target = posts.find((p) => p.id === where.id);
                if (target) target.likes = data.likes;
                return target;
            },
            delete: async ({ where }: { where: { id: string } }) => {
                const idx = posts.findIndex((p) => p.id === where.id);
                if (idx >= 0) posts.splice(idx, 1);
            },
        },
        postLike: {
            findUnique: async ({
                where,
            }: {
                where: { userId_postId: { userId: string; postId: string } };
            }) =>
                likes.find(
                    (l) =>
                        l.userId === where.userId_postId.userId &&
                        l.postId === where.userId_postId.postId
                ) ?? null,
            findMany: async ({ where }: { where: { userId: string } }) =>
                likes.filter((l) => l.userId === where.userId),
            create: async ({ data }: { data: { userId: string; postId: string } }) => {
                const row = { id: `like-${likes.length + 1}`, ...data };
                likes.push(row);
                return row;
            },
            delete: async ({ where }: { where: { id: string } }) => {
                const idx = likes.findIndex((l) => l.id === where.id);
                if (idx >= 0) likes.splice(idx, 1);
            },
            count: async ({ where }: { where: { postId: string } }) =>
                likes.filter((l) => l.postId === where.postId).length,
        },
        comment: {
            create: async ({ data }: { data: { postId: string; authorId: string; content: string } }) => {
                const row = {
                    id: `cmt-${comments.length + 1}`,
                    ...data,
                    createdAt: new Date(),
                };
                comments.push(row);
                return row;
            },
        },
    };
    return {
        prisma: {
            ...models,
            $transaction: async <T,>(cb: (tx: typeof models) => Promise<T>): Promise<T> =>
                cb(models),
        },
    };
});

import { setSession } from "@/lib/session";
import { GET as listPosts, POST as createPost } from "@/app/api/community/route";
import { POST as toggleLike } from "@/app/api/community/[id]/like/route";
import { POST as addComment } from "@/app/api/community/[id]/comment/route";
import { DELETE as deletePost } from "@/app/api/community/[id]/route";

describe("e2e/community-interaction-flow", () => {
    beforeEach(async () => {
        cookieJar.clear();
        posts.length = 0;
        comments.length = 0;
        likes.length = 0;
        activeUserRef.current = {
            id: "u-author",
            email: "author@fpt.edu.vn",
            name: "Author",
            tokenVersion: 1,
        };
        await setSession(activeUserRef.current);
    });

    it("creates post, toggles like, appends comment, enforces owner-only deletion, and deletes post", async () => {
        const headers = { "x-forwarded-for": "198.51.100.20" };

        const createRes = await createPost(
            buildJsonRequest("http://localhost/api/community", {
                method: "POST",
                headers,
                body: { content: "Sharing revision tips for midterms", category: "ACADEMIC" },
            })
        );
        expect(createRes.status).toBe(201);
        const created = await createRes.json();

        const like1 = await toggleLike(
            buildRawRequest(`http://localhost/api/community/${created.id}/like`, {
                method: "POST",
                headers,
            }),
            { params: Promise.resolve({ id: created.id }) }
        );
        expect(await like1.json()).toEqual({ likes: 1, liked: true });

        const cmtRes = await addComment(
            buildJsonRequest(`http://localhost/api/community/${created.id}/comment`, {
                method: "POST",
                headers,
                body: { content: "Helpful thread, thanks!" },
            }),
            { params: Promise.resolve({ id: created.id }) }
        );
        expect(cmtRes.status).toBe(201);

        const feedRes = await listPosts(
            buildRawRequest("http://localhost/api/community?category=ACADEMIC&page=1", {
                method: "GET",
            })
        );
        const feed = await feedRes.json();
        expect(feed).toHaveLength(1);
        expect(feed[0].likes).toBe(1);
        expect(feed[0].likedByUser).toBe(true);
        expect(feed[0].comments).toHaveLength(1);

        // Switch user to verify non-owner deletion gets 403
        activeUserRef.current = {
            id: "u-other",
            email: "other@fpt.edu.vn",
            name: "Other",
            tokenVersion: 1,
        };
        await setSession(activeUserRef.current);

        const forbiddenDel = await deletePost(
            buildRawRequest(`http://localhost/api/community/${created.id}`, {
                method: "DELETE",
                headers,
            }),
            { params: Promise.resolve({ id: created.id }) }
        );
        expect(forbiddenDel.status).toBe(403);

        // Switch back to owner and delete
        activeUserRef.current = {
            id: "u-author",
            email: "author@fpt.edu.vn",
            name: "Author",
            tokenVersion: 1,
        };
        await setSession(activeUserRef.current);

        const ownerDel = await deletePost(
            buildRawRequest(`http://localhost/api/community/${created.id}`, {
                method: "DELETE",
                headers,
            }),
            { params: Promise.resolve({ id: created.id }) }
        );
        expect(ownerDel.status).toBe(200);
        expect(posts).toHaveLength(0);
    });
});
