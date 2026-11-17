"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";
import { User, Shield, LogOut, ChevronRight, X, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Panel = "profile" | "security" | null;
type SecurityTab = "password" | "email" | "2fa";

const subscribeNoop = () => () => {};

export function UserProfileDropdown() {
    const { user, logout, refreshUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
    const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

    const updatePos = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setDropPos({ top: rect.top, right: Math.max(8, window.innerWidth - rect.right) });
    }, []);

    useEffect(() => {
        if (!open || panel) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const portal = document.getElementById("user-profile-drop");
            if (portal && portal.contains(e.target as Node)) return;
            if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return;
            setOpen(false);
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        const handleViewportChange = () => updatePos();

        document.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscape);
        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("scroll", handleViewportChange, true);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscape);
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("scroll", handleViewportChange, true);
        };
    }, [open, panel, updatePos]);

    useEffect(() => {
        if (!panel) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPanel(null);
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [panel]);

    if (!user) return null;

    const initials = user.name
        ? user.name
              .trim()
              .split(/\s+/)
              .map((w: string) => w[0] ?? "")
              .slice(0, 2)
              .join("")
              .toUpperCase() || "U"
        : (user.email?.[0] ?? "U").toUpperCase();

    const handleLogout = async () => {
        setOpen(false);
        setPanel(null);
        await logout();
    };

    const openPanel = (p: Panel) => {
        setOpen(false);
        setPanel(p);
    };

    const dropdown =
        mounted &&
        open &&
        !panel &&
        createPortal(
            <div
                id="user-profile-drop"
                role="menu"
                aria-label="Account menu"
                style={{
                    position: "fixed",
                    bottom: `calc(100vh - ${dropPos.top}px)`,
                    right: `${dropPos.right}px`,
                    zIndex: 9999,
                }}
                className="w-56 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                    <p className="text-sm font-semibold truncate">{user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="p-1.5 space-y-0.5">
                    <MenuBtn
                        icon={<User className="w-4 h-4" />}
                        label="Personal Info"
                        onClick={() => openPanel("profile")}
                    />
                    <MenuBtn
                        icon={<Shield className="w-4 h-4" />}
                        label="Security"
                        onClick={() => openPanel("security")}
                    />
                </div>
                <div className="p-1.5 border-t border-border/50">
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Log Out
                    </button>
                </div>
            </div>,
            document.body
        );

    const panelModal =
        mounted &&
        panel &&
        createPortal(
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-modal-title"
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && setPanel(null)}
            >
                <div className="bg-card rounded-2xl shadow-2xl border border-border/50 w-full max-w-md overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                        <button
                            type="button"
                            aria-label="Close panel"
                            onClick={() => setPanel(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <h2 id="profile-modal-title" className="font-semibold">
                            {panel === "profile" ? "Personal Info" : "Security"}
                        </h2>
                    </div>
                    <div className="p-5">
                        {panel === "profile" && (
                            <ProfilePanel
                                user={user}
                                onSaved={async () => {
                                    await refreshUser();
                                    setPanel(null);
                                }}
                            />
                        )}
                        {panel === "security" && <SecurityPanel onEmailUpdated={refreshUser} />}
                    </div>
                </div>
            </div>,
            document.body
        );

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Open account menu"
                onClick={() => {
                    updatePos();
                    setOpen((v) => !v);
                }}
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-full transition-all shrink-0",
                    open ? "bg-primary/20" : "hover:bg-white/10"
                )}
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-[11px] font-bold text-white">
                    {initials}
                </div>
                <span className="hidden md:block text-sm font-medium max-w-[80px] truncate">
                    {user.name || user.email.split("@")[0]}
                </span>
            </button>
            {dropdown}
            {panelModal}
        </>
    );
}

function MenuBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
        >
            <span className="text-muted-foreground">{icon}</span>
            {label}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
        </button>
    );
}

function ProfilePanel({
    user,
    onSaved,
}: {
    user: { name?: string | null; email: string };
    onSaved: () => Promise<void>;
}) {
    const [name, setName] = useState(user.name || "");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch("/api/auth/profile", { signal: controller.signal })
            .then(async (r) => {
                if (!r.ok) return;
                const d = (await r.json()) as {
                    user?: { name?: string | null; phone?: string | null };
                };
                if (d.user) {
                    setName(d.user.name || "");
                    setPhone(d.user.phone || "");
                }
            })
            .catch((err) => {
                if ((err as Error).name !== "AbortError") {
                    console.error("Failed to load profile", err);
                }
            });
        return () => {
            controller.abort();
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    async function save() {
        setLoading(true);
        setError("");
        setSuccess(false);
        try {
            const res = await fetch("/api/auth/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "updateProfile", name, phone }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                setError(data.error || "Unable to update profile");
                return;
            }
            setSuccess(true);
            closeTimerRef.current = setTimeout(() => {
                void onSaved();
            }, 600);
        } catch {
            setError("Network error while saving profile.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <Field label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
            <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="+84 901 234 567" />
            <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm mt-1 text-muted-foreground">
                    {user.email} <span className="text-xs">(change in Security tab)</span>
                </p>
            </div>
            {error && <ErrMsg text={error} />}
            {success && <OkMsg text="Saved successfully!" />}
            <Button type="button" className="w-full" onClick={save} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
            </Button>
        </div>
    );
}

function SecurityPanel({ onEmailUpdated }: { onEmailUpdated: () => Promise<void> }) {
    const [tab, setTab] = useState<SecurityTab>("password");
    const tabs: { key: SecurityTab; label: string }[] = [
        { key: "password", label: "Password" },
        { key: "email", label: "Email" },
        { key: "2fa", label: "2FA" },
    ];
    return (
        <div className="space-y-4">
            <div className="flex rounded-xl overflow-hidden border border-border/50 text-xs">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                            "flex-1 py-2 font-medium transition-colors",
                            tab === t.key
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted/40"
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === "password" && <ChangePasswordForm />}
            {tab === "email" && <ChangeEmailForm onEmailUpdated={onEmailUpdated} />}
            {tab === "2fa" && <TwoFAInfo />}
        </div>
    );
}

function ChangePasswordForm() {
    const [cur, setCur] = useState("");
    const [newP, setNewP] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showCur, setShowCur] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function save() {
        if (newP !== confirm) {
            setError("Passwords do not match");
            return;
        }
        if (newP.length < 8) {
            setError("New password must be at least 8 characters");
            return;
        }
        setLoading(true);
        setError("");
        setSuccess(false);
        try {
            const res = await fetch("/api/auth/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "changePassword", currentPassword: cur, newPassword: newP }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                setError(data.error || "Unable to change password");
                return;
            }
            setSuccess(true);
            setCur("");
            setNewP("");
            setConfirm("");
        } catch {
            setError("Network error while changing password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            <PwField
                label="Current Password"
                value={cur}
                onChange={setCur}
                show={showCur}
                onToggle={() => setShowCur(!showCur)}
            />
            <PwField
                label="New Password"
                value={newP}
                onChange={setNewP}
                show={showNew}
                onToggle={() => setShowNew(!showNew)}
            />
            <PwField
                label="Confirm New Password"
                value={confirm}
                onChange={setConfirm}
                show={showNew}
                onToggle={() => setShowNew(!showNew)}
            />
            {error && <ErrMsg text={error} />}
            {success && <OkMsg text="Password changed successfully!" />}
            <Button
                type="button"
                className="w-full"
                onClick={save}
                disabled={loading || !cur || !newP || !confirm}
            >
                {loading ? "Changing..." : "Change Password"}
            </Button>
        </div>
    );
}

function ChangeEmailForm({ onEmailUpdated }: { onEmailUpdated: () => Promise<void> }) {
    const [step, setStep] = useState<"request" | "confirm">("request");
    const [newEmail, setNewEmail] = useState("");
    const [cur, setCur] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [showP, setShowP] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function requestCode() {
        setLoading(true);
        setError("");
        setSuccess(false);
        try {
            const res = await fetch("/api/auth/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "requestEmailChange",
                    newEmail,
                    currentPassword: cur,
                }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                setError(data.error || "Unable to initiate email change");
                return;
            }
            setStep("confirm");
            setCur("");
        } catch {
            setError("Network error while requesting verification code.");
        } finally {
            setLoading(false);
        }
    }

    async function confirmCode() {
        setLoading(true);
        setError("");
        setSuccess(false);
        try {
            const res = await fetch("/api/auth/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "confirmEmailChange",
                    code: otpCode,
                }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                setError(data.error || "Invalid verification code");
                return;
            }
            setSuccess(true);
            setOtpCode("");
            setNewEmail("");
            setStep("request");
            await onEmailUpdated();
        } catch {
            setError("Network error while verifying email.");
        } finally {
            setLoading(false);
        }
    }

    if (step === "confirm") {
        return (
            <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                    Enter the 6-digit verification code sent to <strong>{newEmail}</strong>.
                </p>
                <Field
                    label="Verification Code"
                    value={otpCode}
                    onChange={(val) => setOtpCode(val.replace(/[^0-9]/g, "").slice(0, 6))}
                    placeholder="123456"
                />
                {error && <ErrMsg text={error} />}
                {success && <OkMsg text="Email verified and updated!" />}
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setStep("request");
                            setError("");
                        }}
                    >
                        Back
                    </Button>
                    <Button
                        type="button"
                        className="flex-1"
                        onClick={confirmCode}
                        disabled={loading || otpCode.length !== 6}
                    >
                        {loading ? "Verifying..." : "Confirm Email"}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <Field
                label="New Email"
                value={newEmail}
                onChange={setNewEmail}
                placeholder="you@example.com"
                type="email"
            />
            <PwField
                label="Current Password (to confirm)"
                value={cur}
                onChange={setCur}
                show={showP}
                onToggle={() => setShowP(!showP)}
            />
            {error && <ErrMsg text={error} />}
            {success && <OkMsg text="Email updated successfully!" />}
            <Button
                type="button"
                className="w-full"
                onClick={requestCode}
                disabled={loading || !newEmail || !cur}
            >
                {loading ? "Sending code..." : "Send Verification Code"}
            </Button>
        </div>
    );
}

function TwoFAInfo() {
    return (
        <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Shield className="w-7 h-7 text-primary" />
            </div>
            <div>
                <p className="font-semibold">Two-Factor Authentication (2FA)</p>
                <p className="text-sm text-muted-foreground mt-1">This feature is under development.</p>
                <p className="text-xs text-muted-foreground mt-1">Email OTP-based 2FA is coming soon.</p>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs text-left">
                🚧 This feature is on the roadmap and will be available in the next update.
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
                className="mt-1"
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}

function PwField({
    label,
    value,
    onChange,
    show,
    onToggle,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
}) {
    return (
        <div>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="relative mt-1">
                <Input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="pr-9"
                />
                <button
                    type="button"
                    aria-label={show ? `Hide ${label}` : `Show ${label}`}
                    onClick={onToggle}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

function ErrMsg({ text }: { text: string }) {
    return (
        <div role="alert" className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{text}</span>
        </div>
    );
}

function OkMsg({ text }: { text: string }) {
    return (
        <div role="status" className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-xs">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{text}</span>
        </div>
    );
}
