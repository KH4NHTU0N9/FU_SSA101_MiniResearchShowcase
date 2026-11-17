"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Download,
    NotebookPen,
    PhoneCall,
    Play,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/language-context";
import { getDass21Severity, MAX_DASS21_SUBSCALE_SCORE, type Category } from "@/lib/assessment-data";
import { cn } from "@/lib/utils";
import type { AssessmentResultDTO, EmotionId, MoodHistoryEntry, PublicUser } from "@/types";

const MoodTrendChart = dynamic(() => import("./mood-trend-chart"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-100/5 rounded-xl animate-pulse">
            Loading Chart...
        </div>
    ),
});

interface DashboardClientProps {
    user: PublicUser;
    initialHistory: MoodHistoryEntry[];
    assessmentData: AssessmentResultDTO | null;
}

const EMOTIONS: ReadonlyArray<{ id: EmotionId; label: string; icon: string; val: number }> = [
    { id: "anxious", label: "Anxious", icon: "😨", val: 1 },
    { id: "tired", label: "Tired", icon: "😴", val: 2 },
    { id: "pressure", label: "Pressured", icon: "😤", val: 2 },
    { id: "normal", label: "Steady", icon: "😐", val: 3 },
    { id: "excited", label: "Energized", icon: "🤩", val: 5 },
];

export default function DashboardClient({
    user,
    initialHistory,
    assessmentData,
}: DashboardClientProps) {
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [history, setHistory] = useState<MoodHistoryEntry[]>(initialHistory);
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [savingCheckIn, setSavingCheckIn] = useState(false);
    const [energyLevel, setEnergyLevel] = useState(50);
    const [selectedEmotion, setSelectedEmotion] = useState<EmotionId | null>(null);

    const handleSubmitCheckIn = async () => {
        if (!selectedEmotion) {
            showToast("Please select how you feel before saving.", "error");
            return;
        }

        const emotionData = EMOTIONS.find((e) => e.id === selectedEmotion);
        const moodVal = emotionData?.val ?? 3;
        const focusVal = energyLevel > 70 ? 5 : energyLevel > 40 ? 3 : 1;

        setSavingCheckIn(true);
        try {
            const res = await fetch("/api/mood", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mood: moodVal,
                    energy: energyLevel,
                    emotion: selectedEmotion,
                    focus: focusVal,
                }),
            });

            if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(err.error || "Failed to save check-in", "error");
                return;
            }

            const newLog = (await res.json()) as {
                id: string;
                mood: number;
                focus: number;
                energy: number;
                emotion: string;
                createdAt: string;
            };

            const formattedLog: MoodHistoryEntry = {
                id: newLog.id,
                mood: Number(newLog.mood),
                focus: Number(newLog.focus),
                energy: Number(newLog.energy),
                emotion: newLog.emotion,
                createdAt: newLog.createdAt,
                date: new Date(newLog.createdAt).toLocaleDateString("en-US", { weekday: "short" }),
            };

            setHistory((prev) => [...prev, formattedLog].slice(-14));
            setShowCheckIn(false);
            setEnergyLevel(50);
            setSelectedEmotion(null);
            showToast("Daily check-in saved!", "success");
        } catch {
            showToast("Network error while saving check-in.", "error");
        } finally {
            setSavingCheckIn(false);
        }
    };

    const handleExportMap = () => {
        const exportPayload = {
            exportedAt: new Date().toISOString(),
            user: { name: user.name, email: user.email },
            latestAssessment: assessmentData,
            recentMoodHistory: history,
            recommendation: getSuggestionContent(),
        };

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `mental-health-map-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast("Mental health map exported as JSON.", "success");
    };

    const latestEntry = history[history.length - 1];
    const isHighRisk = latestEntry
        ? latestEntry.energy < 30 || ["anxious", "tired", "pressure"].includes(latestEntry.emotion)
        : false;

    const getSuggestionContent = () => {
        if (!latestEntry) {
            return {
                badge: "Start Tracking",
                text: "Complete your daily check-in to receive personalized study & wellness advice.",
            };
        }
        if (latestEntry.energy < 30) {
            return {
                badge: "⚠️ Low Battery",
                text: "Your energy is critically low. Switch to passive learning or take a 10-minute non-sleep deep rest (NSDR).",
            };
        }
        if (latestEntry.emotion === "anxious" || latestEntry.emotion === "pressure") {
            return {
                badge: "🌪️ High Pressure",
                text: "High pressure detected. Try the 4-7-8 Breathing exercise in the Relax toolkit before continuing.",
            };
        }
        if (latestEntry.energy > 70 && latestEntry.emotion === "excited") {
            return {
                badge: "🚀 Flow State Ready",
                text: "You are in prime condition. Tackle your hardest subject with a deep-work session right now.",
            };
        }
        return {
            badge: "✅ Balanced",
            text: "You are doing well. Maintain your study schedule with 25-minute Pomodoro intervals.",
        };
    };

    const suggestion = getSuggestionContent();
    const avgMood = history.reduce((acc, curr) => acc + curr.mood, 0) / (history.length || 1);
    const avgFocus = history.reduce((acc, curr) => acc + curr.focus, 0) / (history.length || 1);

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 bg-background max-w-[100vw] overflow-x-hidden w-full">
            <div className="max-w-6xl mx-auto space-y-8 w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                            {t("dashboard_hi")}{" "}
                            <span className="bg-gradient-to-r from-sky-400 via-rose-400 to-lime-400 bg-clip-text text-transparent animate-gradient-x">
                                {user.name || "Friend"}
                            </span>{" "}
                            👋
                        </h1>
                        <p className="text-lg text-muted-foreground font-medium">
                            {t("dashboard_subtitle")}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto mt-4 md:mt-0">
                        <Link href="/focus" className="flex-1 min-w-[140px] md:flex-none">
                            <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                                <Play className="w-4 h-4" /> {t("dashboard_focus_mode")}
                            </Button>
                        </Link>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportMap}
                            className="flex-1 min-w-[140px] md:flex-none gap-2 text-primary border-primary/20 hover:bg-primary/10"
                        >
                            <Download className="w-4 h-4" /> {t("dashboard_export_map")}
                        </Button>
                        {!assessmentData && (
                            <Link href="/assessment" className="flex-1 min-w-[140px] md:flex-none">
                                <Button variant="outline" className="w-full gap-2">
                                    <NotebookPen className="w-4 h-4" /> {t("dashboard_new_assessment")}
                                </Button>
                            </Link>
                        )}
                        <Button
                            type="button"
                            onClick={() => setShowCheckIn((prev) => !prev)}
                            className="flex-1 min-w-[140px] md:flex-none gap-2 animate-bounce-subtle"
                            variant="outline"
                        >
                            <Plus className="w-4 h-4" /> {t("dashboard_check_in")}
                        </Button>
                    </div>
                </div>

                {/* Risk Alert Banner */}
                {isHighRisk && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-4 overflow-hidden">
                        <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-1" />
                        <div className="space-y-3 flex-1 min-w-0">
                            <h2 className="font-bold text-rose-500 leading-tight text-base sm:text-lg break-words">
                                We noticed you&apos;ve been feeling down lately.
                            </h2>
                            <p className="text-sm text-muted-foreground break-words w-full">
                                Your well-being is our top priority. Consider reaching out to a counselor or calling the support hotline.
                            </p>
                            <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
                                <a href="tel:111" className="w-full sm:w-auto">
                                    <Button type="button" size="sm" variant="destructive" className="gap-2 w-full sm:w-auto">
                                        <PhoneCall className="w-4 h-4" /> Call Hotline (111)
                                    </Button>
                                </a>
                                <Link href="/exercises" className="w-full sm:w-auto">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                                    >
                                        Try Relaxation Exercises
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {!assessmentData && (
                    <Card className="glass-card border-indigo-500/20 bg-indigo-500/5">
                        <CardHeader>
                            <CardTitle>Complete your Assessment</CardTitle>
                            <CardDescription>
                                Take the DASS-21 assessment to generate your mental health map.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/assessment">
                                <Button className="w-full">Start Assessment</Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Daily Check-in Widget */}
                {showCheckIn && (
                    <Card className="glass-card border-primary/20 animate-in">
                        <CardHeader>
                            <CardTitle>Daily Micro-assessment (&lt; 30s)</CardTitle>
                            <CardDescription>
                                Track your energy and emotion to improve learning efficiency.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-medium">
                                    <label htmlFor="dashboard-energy-range">Energy Level 🔋</label>
                                    <span
                                        className={cn(
                                            energyLevel < 30
                                                ? "text-rose-400"
                                                : energyLevel > 70
                                                  ? "text-emerald-400"
                                                  : "text-yellow-400"
                                        )}
                                    >
                                        {energyLevel}%
                                    </span>
                                </div>
                                <input
                                    id="dashboard-energy-range"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={energyLevel}
                                    onChange={(e) => setEnergyLevel(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-secondary/30 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Exhausted</span>
                                    <span>Fully Charged</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <span className="text-sm font-medium block">
                                    How do you feel about studying today?
                                </span>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {EMOTIONS.map((emo) => (
                                        <button
                                            key={emo.id}
                                            type="button"
                                            aria-pressed={selectedEmotion === emo.id}
                                            onClick={() => setSelectedEmotion(emo.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all min-w-[80px]",
                                                selectedEmotion === emo.id
                                                    ? "bg-primary/20 border-primary scale-105 shadow-lg"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <span className="text-2xl">{emo.icon}</span>
                                            <span className="text-xs font-medium">{emo.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={handleSubmitCheckIn}
                                disabled={savingCheckIn}
                                className="w-full"
                                size="lg"
                            >
                                {savingCheckIn ? "Saving..." : "Save Check-in"}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {assessmentData && (
                        <Card className="glass-card md:col-span-3 lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <NotebookPen className="w-5 h-5 text-indigo-400" /> Assessment Profile
                                </CardTitle>
                                <CardDescription>Latest DASS-21 Results</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(["Depression", "Anxiety", "Stress"] as Category[]).map((category) => {
                                    const score = assessmentData.scores[category];
                                    const severity = getDass21Severity(category, score);
                                    return (
                                        <div key={category} className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">{category}</span>
                                                <span className={cn("font-bold text-sm", severity.color)}>
                                                    {score} ({severity.label})
                                                </span>
                                            </div>
                                            <Progress
                                                value={(score / MAX_DASS21_SUBSCALE_SCORE) * 100}
                                                className="h-1.5"
                                            />
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="glass-card md:col-span-3 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Mood & Focus Trends
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <MoodTrendChart
                                history={history}
                                onAddCheckIn={() => setShowCheckIn(true)}
                            />
                        </CardContent>
                    </Card>

                    <div className="space-y-6 md:col-span-3 lg:col-span-1">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                                    Weekly Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        {t("dashboard_avg_mood")}
                                    </span>
                                    <span className="text-2xl font-bold">{avgMood.toFixed(1)}</span>
                                </div>
                                <Progress value={(avgMood / 5) * 100} className="h-2" />

                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-sm text-muted-foreground">
                                        {t("dashboard_avg_focus")}
                                    </span>
                                    <span className="text-2xl font-bold">{avgFocus.toFixed(1)}</span>
                                </div>
                                <Progress value={(avgFocus / 5) * 100} className="h-2 bg-secondary/20" />
                            </CardContent>
                        </Card>

                        <Card className="glass-card bg-primary/5 border-primary/10">
                            <CardHeader>
                                <CardTitle className="text-base text-primary">
                                    {t("dashboard_suggestions")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm font-semibold text-foreground">{suggestion.badge}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {suggestion.text}
                                </p>
                                <Link href="/exercises" className="inline-block pt-1">
                                    <Button variant="link" className="px-0 h-auto text-primary">
                                        {t("dashboard_view_tools")}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
