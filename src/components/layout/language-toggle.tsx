"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
    const { language, setLanguage, t } = useLanguage();
    const nextLang = language === "en" ? "vn" : "en";

    return (
        <button
            type="button"
            onClick={() => setLanguage(nextLang)}
            aria-label={`${t("settings_language")}: ${language.toUpperCase()}`}
            title={`${t("settings_language")}: ${nextLang.toUpperCase()}`}
            className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/10 transition-colors shrink-0",
                className
            )}
        >
            <Globe className="w-3.5 h-3.5" />
            <span>{language.toUpperCase()}</span>
        </button>
    );
}
