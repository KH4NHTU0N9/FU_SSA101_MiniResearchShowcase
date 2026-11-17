import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildRawRequest } from "@/test/mocks/next";

const { cookieJar, delMock, userRecord, materials, materialFiles } = vi.hoisted(() => ({
    cookieJar: new Map<string, string>(),
    delMock: vi.fn().mockResolvedValue(undefined),
    userRecord: {
        id: "u-uploader",
        email: "uploader@fpt.edu.vn",
        name: "An",
        tokenVersion: 1,
    },
    materials: [] as Array<{
        id: string;
        title: string;
        description: string | null;
        fileUrl: string | null;
        size: number;
        type: string;
        semesterId: string;
        subjectId: string;
        uploadedById: string;
        status: string;
        totalDownloads: number;
        createdAt: Date;
    }>,
    materialFiles: [] as Array<{
        id: string;
        materialId: string;
        name: string;
        fileUrl: string;
        fileContent?: string | null;
        type: string;
        size: number;
    }>,
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

vi.mock("@vercel/blob", () => ({
    put: vi.fn(),
    del: delMock,
}));

vi.mock("@/lib/prisma", () => {
    const models = {
        user: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                where.id === userRecord.id ? userRecord : null,
        },
        subject: {
            findFirst: async ({ where }: { where: { id: string; semesterId: string } }) =>
                where.id === "sub-cs" && where.semesterId === "sem-1"
                    ? { id: "sub-cs" }
                    : null,
        },
        material: {
            create: async ({
                data,
            }: {
                data: {
                    title: string;
                    description: string | null;
                    fileUrl: string | null;
                    size: number;
                    type: string;
                    semesterId: string;
                    subjectId: string;
                    uploadedById: string;
                    status: string;
                };
            }) => {
                const row = {
                    id: `mat-${materials.length + 1}`,
                    ...data,
                    totalDownloads: 0,
                    createdAt: new Date(),
                };
                materials.push(row);
                return row;
            },
            findMany: async () =>
                materials.map((m) => ({
                    ...m,
                    semester: { id: m.semesterId, name: "Semester 1" },
                    subject: { id: m.subjectId, code: "CSI104" },
                    uploadedBy: { id: m.uploadedById, name: "An" },
                    files: materialFiles.filter((f) => f.materialId === m.id),
                })),
            count: async () => materials.length,
            findUnique: async ({ where }: { where: { id: string } }) => {
                const found = materials.find((m) => m.id === where.id);
                if (!found) return null;
                return {
                    ...found,
                    files: materialFiles.filter((f) => f.materialId === found.id),
                };
            },
            update: async ({ where, data }: { where: { id: string }; data: { totalDownloads: { increment: number } } }) => {
                const found = materials.find((m) => m.id === where.id);
                if (found) found.totalDownloads += data.totalDownloads.increment;
                return found;
            },
            delete: async ({ where }: { where: { id: string } }) => {
                const idx = materials.findIndex((m) => m.id === where.id);
                if (idx >= 0) materials.splice(idx, 1);
            },
        },
        materialFile: {
            createMany: async ({
                data,
            }: {
                data: Array<{
                    materialId: string;
                    name: string;
                    fileUrl: string;
                    type: string;
                    size: number;
                }>;
            }) => {
                for (const item of data) {
                    materialFiles.push({
                        id: `mf-${materialFiles.length + 1}`,
                        fileContent: null,
                        ...item,
                    });
                }
            },
            findUnique: async ({ where }: { where: { id: string } }) =>
                materialFiles.find((f) => f.id === where.id) ?? null,
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
import { GET as listMaterials, POST as createMaterial } from "@/app/api/exam-materials/route";
import { GET as downloadFile } from "@/app/api/exam-materials/file/route";
import { DELETE as deleteMaterial } from "@/app/api/exam-materials/[id]/route";

describe("e2e/exam-materials-lifecycle", () => {
    const prevBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

    beforeEach(async () => {
        cookieJar.clear();
        delMock.mockClear();
        materials.length = 0;
        materialFiles.length = 0;
        process.env.BLOB_READ_WRITE_TOKEN = "blob-test-token";
        await setSession(userRecord);
    });

    afterEach(() => {
        if (prevBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
        else process.env.BLOB_READ_WRITE_TOKEN = prevBlobToken;
        vi.unstubAllGlobals();
    });

    it("uploads blob metadata, searches catalog, downloads attachment, and cleans up Blob on delete", async () => {
        const blobUrl = "https://store1.public.blob.vercel-storage.com/exam-materials/lab1.pdf";
        const form = new FormData();
        form.append("title", "CSI104 Lab 1");
        form.append("description", "Binary worksheet");
        form.append("semesterId", "sem-1");
        form.append("subjectId", "sub-cs");
        form.append(
            "uploadedFiles",
            JSON.stringify([{ url: blobUrl, name: "lab1.pdf", size: 1200 }])
        );

        const postReq = new NextRequest("http://localhost/api/exam-materials", {
            method: "POST",
            headers: { origin: "http://localhost", "x-forwarded-for": "198.51.100.21" },
            body: form,
        });
        const createdRes = await createMaterial(postReq);
        expect(createdRes.status).toBe(201);
        const created = await createdRes.json();

        const listRes = await listMaterials(
            buildRawRequest("http://localhost/api/exam-materials?search=CSI104", { method: "GET" })
        );
        const listJson = await listRes.json();
        expect(listJson.total).toBe(1);
        const fileId = listJson.materials[0].files[0].id as string;

        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 }))
        );

        const dlRes = await downloadFile(
            buildRawRequest(
                `http://localhost/api/exam-materials/file?fileId=${encodeURIComponent(fileId)}&download=1`,
                { method: "GET" }
            )
        );
        expect(dlRes.status).toBe(200);
        expect(dlRes.headers.get("Content-Disposition")).toContain('attachment; filename="lab1.pdf"');
        expect(materials[0].totalDownloads).toBe(1);

        const delRes = await deleteMaterial(
            buildRawRequest(`http://localhost/api/exam-materials/${created.id}`, {
                method: "DELETE",
                headers: { "x-forwarded-for": "198.51.100.21" },
            }),
            { params: Promise.resolve({ id: created.id }) }
        );
        expect(delRes.status).toBe(200);
        expect(delMock).toHaveBeenCalledWith([blobUrl]);
        expect(materials).toHaveLength(0);
    });
});
