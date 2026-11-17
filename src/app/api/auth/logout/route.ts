export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSession, getSession } from "@/lib/session";
import { guardOrigin } from "@/lib/api/response";

export async function POST(req: Request) {
    const originError = guardOrigin(req);
    if (originError) return originError;

    const session = await getSession();
    if (session?.user?.id) {
        // Bump tokenVersion to revoke the active JWT server-side as well as clearing the cookie.
        await prisma.user
            .updateMany({
                where: { id: session.user.id },
                data: { tokenVersion: { increment: 1 } },
            })
            .catch(() => {});
    }

    await clearSession();
    return NextResponse.json({ success: true });
}
