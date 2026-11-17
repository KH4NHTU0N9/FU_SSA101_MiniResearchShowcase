"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    MessageCircle,
    HeartPulse,
    Users,
    Brain,
    Home,
    LogIn,
    Clock,
    Play,
    Gamepad2,
    BookOpen,
    Terminal,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { UserProfileDropdown } from "@/components/layout/user-profile-dropdown";
import { LanguageToggle } from "@/components/layout/language-toggle";

interface NavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
}

const HIDDEN_NAV_ROUTES = new Set(["/", "/login", "/register", "/verify", "/forgot-password"]);

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
    const isActive =
        pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/");

    return (
        <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
                "flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap shrink-0",
                isActive
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "text-muted-foreground hover:bg-secondary/10 hover:text-foreground"
            )}
        >
            {item.icon}
            <span className="hidden md:inline">{item.name}</span>
            <span className="md:hidden text-[9px]">{item.name}</span>
        </Link>
    );
}

export function Navbar() {
    const pathname = usePathname() || "";
    const { user } = useAuth();
    const { t } = useLanguage();

    if (HIDDEN_NAV_ROUTES.has(pathname)) return null;

    const psychItems: NavItem[] = [
        { name: t("nav_dashboard"), href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { name: t("nav_assessment"), href: "/assessment", icon: <Brain className="w-4 h-4" /> },
        { name: t("nav_chat"), href: "/chat", icon: <MessageCircle className="w-4 h-4" /> },
        { name: t("nav_exercises"), href: "/exercises", icon: <HeartPulse className="w-4 h-4" /> },
        { name: t("nav_games"), href: "/games", icon: <Gamepad2 className="w-4 h-4" /> },
    ];

    const studyItems: NavItem[] = [
        { name: t("nav_focus"), href: "/focus", icon: <Play className="w-4 h-4" /> },
        { name: t("nav_flashcards"), href: "/flashcards", icon: <Brain className="w-4 h-4" /> },
        { name: t("nav_scheduler"), href: "/scheduler", icon: <Clock className="w-4 h-4" /> },
        { name: t("nav_exams"), href: "/exam-materials", icon: <BookOpen className="w-4 h-4" /> },
        { name: t("nav_it_support"), href: "/it-support", icon: <Terminal className="w-4 h-4" /> },
    ];

    const commItems: NavItem[] = [
        { name: t("nav_home"), href: "/", icon: <Home className="w-4 h-4" /> },
        { name: t("nav_community"), href: "/community", icon: <Users className="w-4 h-4" /> },
    ];

    return (
        <nav
            aria-label="Primary navigation"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] md:w-auto z-50"
        >
            <div className="flex items-center justify-between md:justify-center p-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl gap-1 overflow-x-auto no-scrollbar whitespace-nowrap">
                {psychItems.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                ))}

                <div className="h-5 w-px bg-border mx-2 self-center shrink-0" />

                {studyItems.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                ))}

                <div className="h-5 w-px bg-border mx-2 self-center shrink-0" />

                {commItems.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                ))}

                <LanguageToggle />

                {user ? (
                    <UserProfileDropdown />
                ) : (
                    <Link
                        href="/login"
                        className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 py-2 rounded-full text-[10px] md:text-sm font-medium text-primary hover:bg-primary/10 transition-all shrink-0"
                    >
                        <LogIn className="w-4 h-4" />
                        <span className="hidden md:inline">{t("nav_login")}</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}
