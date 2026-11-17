"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        const controller = new AbortController();
        fetch("/api/keepalive", { signal: controller.signal }).catch(() => {});
        return () => controller.abort();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmedEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setIsLoading(true);
        const response = await register(name.trim(), trimmedEmail, phone.trim(), password);

        if (!response.success) {
            setError(response.error || "Registration failed. Please check your details.");
            setIsLoading(false);
            return;
        }

        if (response.requireVerification) {
            const targetEmail = response.email || trimmedEmail;
            try {
                sessionStorage.setItem("pending_verify_email", targetEmail);
            } catch {
                // Ignore sessionStorage restrictions
            }
            router.push(`/verify?email=${encodeURIComponent(targetEmail)}`);
        }
    };

    return (
        <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
            <Card className="w-full max-w-md glass-card">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-secondary" /> {t("auth_register_title")}
                    </CardTitle>
                    <CardDescription>{t("auth_register_subtitle")}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/30 text-rose-500">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="name">{t("auth_name_label")}</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                autoComplete="name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("auth_email_label")}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t("auth_phone_label")}</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+84901234567"
                                autoComplete="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("auth_password_label")}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                minLength={8}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full bg-secondary hover:bg-secondary/90 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? t("auth_creating_account") : t("auth_sign_up_btn")}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            {t("auth_has_account")}{" "}
                            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                                {t("auth_sign_in_btn")}
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
