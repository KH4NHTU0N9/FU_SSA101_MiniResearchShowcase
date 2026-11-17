"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Loading...</div>}>
            <VerifyForm />
        </Suspense>
    );
}

function VerifyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = useMemo(() => {
        const fromParam = searchParams.get("email");
        if (fromParam) return fromParam;
        if (typeof window !== "undefined") {
            try {
                return sessionStorage.getItem("pending_verify_email") ?? "";
            } catch {
                return "";
            }
        }
        return "";
    }, [searchParams]);

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code: code.trim(),
                }),
            });

            const data = (await res.json().catch(() => ({}))) as { error?: string };

            if (res.ok) {
                try {
                    sessionStorage.removeItem("pending_verify_email");
                } catch {
                    // Ignore storage error
                }
                router.push("/login?verified=true");
            } else {
                setError(data.error || "Verification failed");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
            <Card className="w-full max-w-md glass-card">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <Mail className="w-6 h-6 text-primary" /> Verify Email
                    </CardTitle>
                    <CardDescription>
                        We&apos;ve sent a 6-digit code to your email. Please enter it below.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleVerify}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="verify-email">Email Address</Label>
                            <Input
                                id="verify-email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="verify-code">6-Digit Verification Code</Label>
                            <Input
                                id="verify-code"
                                type="text"
                                inputMode="numeric"
                                placeholder="123456"
                                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                                autoFocus
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button
                            className="w-full h-10"
                            type="submit"
                            disabled={!email.trim() || code.length !== 6 || isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Verify Account
                        </Button>
                        <Link href="/register" className="text-xs text-muted-foreground hover:text-primary">
                            Need a new code? Register again
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
