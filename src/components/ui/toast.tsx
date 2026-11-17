"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type ToastVariant = "info" | "success" | "error";

interface ToastItem {
    id: string;
    message: string;
    variant: ToastVariant;
}

interface ConfirmOptions {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

interface ToastContextType {
    showToast: (message: string, variant?: ToastVariant) => void;
    confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const noopConfirm = async () => true;
const ToastContext = createContext<ToastContextType>({
    showToast: () => {},
    confirmAction: noopConfirm,
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirmState, setConfirmState] = useState<{
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    const dismissToast = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, variant: ToastVariant = "info") => {
            const id = crypto.randomUUID();
            setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
            const timer = setTimeout(() => {
                dismissToast(id);
            }, 4000);
            timersRef.current.set(id, timer);
        },
        [dismissToast]
    );

    const confirmAction = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({ options, resolve });
        });
    }, []);

    const handleConfirmClose = useCallback(
        (accepted: boolean) => {
            if (!confirmState) return;
            confirmState.resolve(accepted);
            setConfirmState(null);
        },
        [confirmState]
    );

    useEffect(() => {
        if (!confirmState) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleConfirmClose(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [confirmState, handleConfirmClose]);

    const value = useMemo(
        () => ({ showToast, confirmAction }),
        [showToast, confirmAction]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* Accessible Toast Region */}
            <div
                aria-live="polite"
                className="fixed top-20 right-4 z-[120] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="status"
                        className={cn(
                            "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl animate-in",
                            toast.variant === "error" && "bg-rose-950/90 border-rose-500/40 text-rose-100",
                            toast.variant === "success" && "bg-emerald-950/90 border-emerald-500/40 text-emerald-100",
                            toast.variant === "info" && "bg-card/95 border-border text-foreground"
                        )}
                    >
                        {toast.variant === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                        {toast.variant === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                        {toast.variant === "info" && <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                        <span className="flex-1 leading-snug">{toast.message}</span>
                        <button
                            type="button"
                            onClick={() => dismissToast(toast.id)}
                            aria-label="Dismiss notification"
                            className="text-muted-foreground hover:text-foreground p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Accessible Confirmation Dialog */}
            {confirmState && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                    className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleConfirmClose(false);
                    }}
                >
                    <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 id="confirm-dialog-title" className="text-lg font-bold">
                            {confirmState.options.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {confirmState.options.description}
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleConfirmClose(false)}
                            >
                                {confirmState.options.cancelLabel ?? "Cancel"}
                            </Button>
                            <Button
                                type="button"
                                variant={confirmState.options.destructive ? "destructive" : "default"}
                                onClick={() => handleConfirmClose(true)}
                            >
                                {confirmState.options.confirmLabel ?? "Confirm"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextType {
    return useContext(ToastContext);
}
