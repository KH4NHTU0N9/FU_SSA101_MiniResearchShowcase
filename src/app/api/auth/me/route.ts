export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
    const noStoreHeaders = { "Cache-Control": "no-store" };

    const session = await getSession();
    if (!session?.user?.id) {
        return NextResponse.json({ user: null }, { headers: noStoreHeaders });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                tokenVersion: true,
            },
        });

        if (!user || user.tokenVersion !== session.user.tokenVersion) {
            return NextResponse.json({ user: null }, { headers: noStoreHeaders });
        }

        return NextResponse.json(
            {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                },
            },
            { headers: noStoreHeaders }
        );
    } catch (error) {
        console.error("[auth/me GET]", error);
        return NextResponse.json({ user: null }, { headers: noStoreHeaders });
    }
}
