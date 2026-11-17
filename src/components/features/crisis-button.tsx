"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { ProfessionalHelpModal } from "@/components/features/professional-help-modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const HIDDEN_AUTH_ROUTES = new Set([
    "/login",
    "/register",
    "/verify",
    "/forgot-password",
    "/reset-password",
]);

export function CrisisFloatingButton() {
    const [open, setOpen] = useState(false);
    const { user } = useAuth();
    const pathname = usePathname();

    if (!user || HIDDEN_AUTH_ROUTES.has(pathname || "")) {
        return null;
    }

    return (
        <>
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1 }}
                className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-50 pointer-events-auto"
            >
                <Button
                    variant="destructive"
                    size="icon"
                    className="h-10 w-10 md:h-14 md:w-14 rounded-full shadow-2xl border-2 md:border-4 border-white/20 animate-pulse hover:animate-none"
                    onClick={() => setOpen(true)}
                    title="Emergency Support / Crisis Help"
                    aria-label="Emergency support and crisis helpline"
                >
                    <ShieldAlert className="w-5 h-5 md:w-8 md:h-8" aria-hidden="true" />
                </Button>
            </motion.div>

            <ProfessionalHelpModal open={open} onOpenChange={setOpen} reason="manual" />
        </>
    );
}
