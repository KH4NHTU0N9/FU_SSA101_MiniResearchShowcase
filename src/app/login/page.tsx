"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export default function LoginPage() {
    return (
        <React.Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Loading...</div>}>
            <LoginForm />
        </React.Suspense>
    );
}

function LoginForm() {
    const searchParams = useSearchParams();
    const verified = searchParams.get("verified");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        const controller = new AbortController();
        fetch("/api/keepalive", { signal: controller.signal }).catch(() => {});
        return () => controller.abort();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const result = await login(identifier.trim(), password);
        if (!result.success) {
            setError(result.error || "Invalid email/phone or password.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
            <Card className="w-full max-w-md glass-card">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <LogIn className="w-6 h-6 text-primary" /> {t("auth_login_title")}
                    </CardTitle>
                    <CardDescription>{t("auth_login_subtitle")}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {verified && (
                            <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>Account verified! Please sign in.</AlertDescription>
                            </Alert>
                        )}
                        {error && (
                            <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/30 text-rose-500">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="identifier">{t("auth_identifier_label")}</Label>
                            <Input
                                id="identifier"
                                type="text"
                                placeholder="name@example.com or +84901234567"
                                autoComplete="username"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">{t("auth_password_label")}</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-primary underline-offset-4 hover:underline"
                                >
                                    {t("auth_forgot_link")}
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? t("auth_signing_in") : t("auth_sign_in_btn")}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            {t("auth_no_account")}{" "}
                            <Link href="/register" className="underline underline-offset-4 hover:text-primary">
                                {t("auth_sign_up_link")}
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
