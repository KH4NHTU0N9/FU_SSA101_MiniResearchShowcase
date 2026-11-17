"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ArrowRight, BarChart3, ClipboardList, Home, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    getDass21Severity,
    isHighRiskAssessment,
    MAX_DASS21_SUBSCALE_SCORE,
    type Category,
} from "@/lib/assessment-data";
import { cn } from "@/lib/utils";
import ProtectedRoute from "@/components/layout/protected-route";
import { ProfessionalHelpModal } from "@/components/features/professional-help-modal";
import type { AssessmentResultDTO } from "@/types";

export default function ResultPage() {
    return (
        <ProtectedRoute>
            <ResultContent />
        </ProtectedRoute>
    );
}

function ResultContent() {
    const [result, setResult] = useState<AssessmentResultDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function fetchResult() {
            try {
                const res = await fetch("/api/assessment", { signal: controller.signal });
                if (!res.ok) {
                    setFetchError("Unable to load assessment results.");
                    return;
                }
                const data = (await res.json()) as {
                    id?: string;
                    createdAt?: string;
                    depressionScore?: number;
                    anxietyScore?: number;
                    stressScore?: number;
                } | null;

                if (data && typeof data.depressionScore === "number") {
                    const scores = {
                        Depression: data.depressionScore,
                        Anxiety: data.anxietyScore ?? 0,
                        Stress: data.stressScore ?? 0,
                    };
                    setResult({
                        id: data.id,
                        createdAt: data.createdAt || new Date().toISOString(),
                        scores,
                    });
                    if (isHighRiskAssessment(scores)) {
                        setShowModal(true);
                    }
                }
            } catch (e) {
                if ((e as Error).name !== "AbortError") {
                    console.error(e);
                    setFetchError("Network error while loading your assessment.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void fetchResult();
        return () => controller.abort();
    }, []);

    if (loading) {
        return (
            <div className="w-full flex-1 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading analysis...</div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="w-full flex-1 flex items-center justify-center p-4">
                <Card className="max-w-md w-full glass-card text-center p-6 space-y-4">
                    <h2 className="text-xl font-bold text-rose-500">Error</h2>
                    <p className="text-sm text-muted-foreground">{fetchError}</p>
                    <Link href="/assessment">
                        <Button className="w-full">Go to Assessment</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="w-full flex-1 flex items-center justify-center p-4">
                <Card className="max-w-md w-full glass-card text-center p-6 space-y-4">
                    <ClipboardList className="w-10 h-10 text-primary mx-auto" />
                    <h2 className="text-xl font-bold">No Assessment Found</h2>
                    <p className="text-sm text-muted-foreground">
                        Complete the DASS-21 assessment first to view your mental health profile.
                    </p>
                    <Link href="/assessment">
                        <Button className="w-full">Take Assessment Now</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    const chartData = [
        { name: "Depression", score: result.scores.Depression, color: "#3b82f6" },
        { name: "Anxiety", score: result.scores.Anxiety, color: "#8b5cf6" },
        { name: "Stress", score: result.scores.Stress, color: "#f43f5e" },
    ];

    return (
        <div className="w-full flex-1 p-4 md:p-8 space-y-8">
            <ProfessionalHelpModal
                open={showModal}
                onOpenChange={setShowModal}
                reason="score"
            />

            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Your Mental Health Profile</h1>
                    <p className="text-muted-foreground">
                        Analysis based on DASS-21 Scale · Recorded{" "}
                        {new Date(result.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(Object.keys(result.scores) as Category[]).map((category) => {
                        const score = result.scores[category];
                        const severity = getDass21Severity(category, score);
                        return (
                            <Card
                                key={category}
                                className="glass-card border-t-4"
                                style={{
                                    borderColor:
                                        category === "Depression"
                                            ? "#3b82f6"
                                            : category === "Anxiety"
                                              ? "#8b5cf6"
                                              : "#f43f5e",
                                }}
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{category}</CardTitle>
                                    <CardDescription>
                                        Score: {score} / {MAX_DASS21_SUBSCALE_SCORE}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                            severity.bg,
                                            severity.color
                                        )}
                                    >
                                        {severity.label}
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {category === "Depression" &&
                                            "Evaluation of dysphoria, hopelessness, and lack of interest."}
                                        {category === "Anxiety" &&
                                            "Assessment of autonomic arousal and situational anxiety."}
                                        {category === "Stress" &&
                                            "Measurement of chronic non-specific arousal and tension."}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Score Visualization</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" domain={[0, MAX_DASS21_SUBSCALE_SCORE]} hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fill: "currentColor" }} />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        borderRadius: "8px",
                                        border: "none",
                                    }}
                                />
                                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={32}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="glass-card bg-primary/5 border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-primary" />
                            Next Steps
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            This assessment is a screening tool, not a diagnosis. If your scores are in the Severe or Extremely Severe range, consider reaching out to a mental health professional.
                        </p>

                        <div className="mt-4 p-4 bg-background/50 rounded-lg border text-xs text-muted-foreground">
                            <p className="font-semibold mb-2">Severity Scale Reference (DASS-21 Raw Scores)</p>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div />
                                <div>Depression</div>
                                <div>Anxiety</div>
                                <div>Stress</div>

                                <div className="text-left font-medium">Normal</div>
                                <div>0-4</div>
                                <div>0-3</div>
                                <div>0-7</div>

                                <div className="text-left font-medium">Mild</div>
                                <div>5-6</div>
                                <div>4-5</div>
                                <div>8-9</div>

                                <div className="text-left font-medium">Moderate</div>
                                <div>7-10</div>
                                <div>6-7</div>
                                <div>10-12</div>

                                <div className="text-left font-medium">Severe</div>
                                <div>11-13</div>
                                <div>8-9</div>
                                <div>13-16</div>

                                <div className="text-left font-medium">Extremely Severe</div>
                                <div>14+</div>
                                <div>10+</div>
                                <div>17+</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2">
                            <Link href="/exercises">
                                <Button className="gap-2">
                                    Go to Exercises <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button variant="secondary" className="gap-2">
                                    <BarChart3 className="w-4 h-4" /> Dashboard
                                </Button>
                            </Link>
                            <Link href="/">
                                <Button variant="outline" className="gap-2">
                                    <Home className="w-4 h-4" /> Home
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
