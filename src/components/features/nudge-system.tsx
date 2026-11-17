"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Clock, Coffee, Heart, Settings, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

const HIDDEN_ROUTES = new Set([
    "/login",
    "/register",
    "/verify",
    "/forgot-password",
    "/reset-password",
]);

function WindIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-teal-400"
            aria-hidden="true"
        >
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
        </svg>
    );
}

const MESSAGES = [
    {
        en: "You don't need to be perfect to make progress.",
        vn: "Bạn không cần hoàn hảo để tiến bộ.",
        icon: <Heart className="w-5 h-5 text-rose-400" aria-hidden="true" />,
    },
    {
        en: "Take a sip of water and rest your eyes!",
        vn: "Uống một ngụm nước và thư giãn mắt nhé!",
        icon: <Coffee className="w-5 h-5 text-blue-400" aria-hidden="true" />,
    },
    {
        en: "You've been sitting a while — stand up and stretch!",
        vn: "Đã ngồi lâu rồi, đứng dậy vươn vai nào!",
        icon: <Coffee className="w-5 h-5 text-green-400" aria-hidden="true" />,
    },
    {
        en: "Feeling fatigued? A short 15-minute rest can help.",
        vn: "Nếu thấy mệt, hãy chợp mắt 15 phút.",
        icon: <Clock className="w-5 h-5 text-indigo-400" aria-hidden="true" />,
    },
    {
        en: "Learn little by little, without putting too much pressure on yourself.",
        vn: "Học từng chút một, đừng áp lực quá.",
        icon: <BookOpen className="w-5 h-5 text-amber-400" aria-hidden="true" />,
    },
    {
        en: "Believe in yourself. You are doing better than you think!",
        vn: "Tin vào bản thân mình. Bạn làm được mà!",
        icon: <Heart className="w-5 h-5 text-rose-400" aria-hidden="true" />,
    },
    {
        en: "Take a slow deep breath... 1... 2... 3... Exhale.",
        vn: "Hít thở sâu... 1... 2... 3... Thở ra.",
        icon: <WindIcon />,
    },
] as const;

export function NudgeSystem() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { showToast } = useToast();
    const pathname = usePathname();

    const [isVisible, setIsVisible] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);
    const [frequency, setFrequency] = useState(15);
    const [showSettings, setShowSettings] = useState(false);

    const nextTimeRef = useRef<number>(0);

    const triggerNudge = useCallback(() => {
        setMessageIndex(Math.floor(Math.random() * MESSAGES.length));
        setIsVisible(true);
    }, []);

    const dismiss = useCallback(() => {
        setIsVisible(false);
        setShowSettings(false);
        nextTimeRef.current = Date.now() + frequency * 60 * 1000;
    }, [frequency]);

    const updateFrequency = useCallback(
        (mins: number) => {
            setFrequency(mins);
            nextTimeRef.current = Date.now() + mins * 60 * 1000;
            setShowSettings(false);
            showToast(
                language === "vn"
                    ? `Đã cập nhật: Nhắc nhở mỗi ${mins} phút.`
                    : `Updated: Reminder every ${mins} minutes.`,
                "success"
            );
        },
        [language, showToast]
    );

    useEffect(() => {
        nextTimeRef.current = Date.now() + frequency * 60 * 1000;
    }, [frequency]);

    useEffect(() => {
        const isAuthPage = HIDDEN_ROUTES.has(pathname || "");
        if (!user || isAuthPage) {
            return;
        }

        if (nextTimeRef.current === 0) {
            nextTimeRef.current = Date.now() + frequency * 60 * 1000;
        }

        const interval = setInterval(() => {
            if (Date.now() >= nextTimeRef.current && !isVisible) {
                triggerNudge();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [frequency, isVisible, user, pathname, triggerNudge]);

    if (!user || HIDDEN_ROUTES.has(pathname || "")) {
        return null;
    }

    const activeMessage = MESSAGES[messageIndex] ?? MESSAGES[0];
    const messageText = language === "vn" ? activeMessage.vn : activeMessage.en;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-[100px] md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 md:w-96 max-w-[calc(100vw-32px)]"
                >
                    <div
                        role="status"
                        aria-live="polite"
                        className="glass-card p-3 md:p-4 rounded-2xl shadow-2xl border-l-4 border-l-primary flex items-start gap-3 md:gap-4 relative overflow-hidden backdrop-blur-xl bg-background/90"
                    >
                        <div className="p-2 md:p-3 bg-secondary/10 rounded-full shrink-0 flex items-center justify-center">
                            <div className="scale-75 md:scale-100 flex">{activeMessage.icon}</div>
                        </div>

                        <div className="flex-1 space-y-0.5 md:space-y-1">
                            <h4 className="font-semibold text-xs md:text-sm text-primary uppercase tracking-wider">
                                {language === "vn" ? "Lời nhắc tích cực" : "Positive Reminder"}
                            </h4>
                            <p className="text-foreground/90 leading-relaxed text-xs md:text-sm">
                                {messageText}
                            </p>
                        </div>

                        <div className="flex flex-col gap-1 items-center justify-start h-full -mr-1">
                            <button
                                type="button"
                                onClick={dismiss}
                                aria-label={
                                    language === "vn" ? "Đóng lời nhắc" : "Dismiss reminder"
                                }
                                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSettings((prev) => !prev)}
                                aria-label={
                                    language === "vn"
                                        ? "Cài đặt tần suất nhắc nhở"
                                        : "Reminder frequency settings"
                                }
                                aria-expanded={showSettings}
                                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors mt-auto"
                                title={language === "vn" ? "Cài đặt" : "Settings"}
                            >
                                <Settings
                                    className="w-3.5 h-3.5 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>

                        {showSettings && (
                            <div className="absolute inset-0 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 gap-2 z-10 animate-in fade-in">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    {language === "vn"
                                        ? "Tần suất nhắc nhở:"
                                        : "Reminder frequency:"}
                                </p>
                                <div className="flex gap-2">
                                    {[15, 30, 45, 60].map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => updateFrequency(m)}
                                            className={`px-3 py-1 rounded-full text-xs border ${
                                                frequency === m
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-transparent border-input hover:bg-accent"
                                            }`}
                                        >
                                            {m}
                                            {language === "vn" ? "p" : "m"}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowSettings(false)}
                                    className="text-xs text-muted-foreground mt-2 hover:underline"
                                >
                                    {language === "vn" ? "Đóng" : "Close"}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
