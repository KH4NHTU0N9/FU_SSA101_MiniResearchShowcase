"use client";

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { translations, type Language, type TranslationKey } from "./translations";

const STORAGE_KEY = "app_language";
const LANGUAGE_EVENT = "app-language-change";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function subscribeLanguage(onStoreChange: () => void): () => void {
    if (typeof window === "undefined") return () => {};

    const handleStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === STORAGE_KEY) {
            onStoreChange();
        }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LANGUAGE_EVENT, onStoreChange);
    return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(LANGUAGE_EVENT, onStoreChange);
    };
}

function getClientLanguageSnapshot(): Language {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "vn" || stored === "en" ? stored : "en";
    } catch {
        return "en";
    }
}

function getServerLanguageSnapshot(): Language {
    return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const language = useSyncExternalStore(
        subscribeLanguage,
        getClientLanguageSnapshot,
        getServerLanguageSnapshot
    );

    const setLanguage = useCallback((lang: Language) => {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // Ignore storage quota or private mode restrictions.
        }
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(LANGUAGE_EVENT));
        }
    }, []);

    const t = useCallback(
        (key: TranslationKey): string => translations[language][key] || translations.en[key] || key,
        [language]
    );

    const value = useMemo(
        () => ({ language, setLanguage, t }),
        [language, setLanguage, t]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
