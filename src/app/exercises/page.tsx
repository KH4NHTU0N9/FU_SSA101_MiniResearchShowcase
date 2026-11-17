"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Activity, BookOpen, Lightbulb, Trash2, Wind } from "lucide-react";
import ProtectedRoute from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface CbtEntry {
    id: string;
    date: string;
    trigger: string;
    thought: string;
    evidence: string;
    balanced: string;
}

const CBT_STORAGE_KEY = "cbtJournal";
const journalListeners = new Set<() => void>();

function subscribeJournal(listener: () => void): () => void {
    journalListeners.add(listener);
    const onStorage = (e: StorageEvent) => {
        if (e.key === CBT_STORAGE_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
        journalListeners.delete(listener);
        window.removeEventListener("storage", onStorage);
    };
}

function getJournalSnapshot(): string {
    try {
        return window.localStorage.getItem(CBT_STORAGE_KEY) ?? "[]";
    } catch {
        return "[]";
    }
}

function getServerSnapshot(): string {
    return "[]";
}

function writeJournalEntries(entries: CbtEntry[]): void {
    try {
        window.localStorage.setItem(CBT_STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // Ignore quota errors cleanly
    }
    journalListeners.forEach((listener) => listener());
}

function parseJournalEntries(raw: string): CbtEntry[] {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(
                (item): item is Record<string, unknown> =>
                    typeof item === "object" && item !== null
            )
            .map((item, idx) => ({
                id:
                    typeof item.id === "string" && item.id
                        ? item.id
                        : `legacy-${String(item.date ?? idx)}-${idx}`,
                date: typeof item.date === "string" ? item.date : new Date().toISOString(),
                trigger: typeof item.trigger === "string" ? item.trigger : "",
                thought: typeof item.thought === "string" ? item.thought : "",
                evidence: typeof item.evidence === "string" ? item.evidence : "",
                balanced: typeof item.balanced === "string" ? item.balanced : "",
            }));
    } catch {
        return [];
    }
}

function SimpleTabs({
    options,
    active,
    onChange,
}: {
    options: ReadonlyArray<{ id: string; label: string; icon: React.ReactNode }>;
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div
            role="tablist"
            aria-label="Coping exercises"
            className="flex flex-wrap p-1 bg-secondary/20 rounded-xl gap-1"
        >
            {options.map((opt) => (
                <button
                    key={opt.id}
                    type="button"
                    role="tab"
                    aria-selected={active === opt.id}
                    onClick={() => onChange(opt.id)}
                    className={cn(
                        "flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-lg transition-all",
                        active === opt.id
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                >
                    {opt.icon}
                    <span>{opt.label}</span>
                </button>
            ))}
        </div>
    );
}

export default function ExercisesPage() {
    return (
        <ProtectedRoute>
            <ExercisesContent />
        </ProtectedRoute>
    );
}

function ExercisesContent() {
    const { showToast, confirmAction } = useToast();
    const [activeTab, setActiveTab] = useState("breathing");
    const [breathingState, setBreathingState] = useState<"inhale" | "hold" | "exhale" | "idle">(
        "idle"
    );
    const breathingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [triggerText, setTriggerText] = useState("");
    const [thoughtText, setThoughtText] = useState("");
    const [evidenceText, setEvidenceText] = useState("");
    const [balancedText, setBalancedText] = useState("");

    const rawJournal = useSyncExternalStore(
        subscribeJournal,
        getJournalSnapshot,
        getServerSnapshot
    );
    const diaryEntries = useMemo(() => parseJournalEntries(rawJournal), [rawJournal]);

    useEffect(() => {
        return () => {
            if (breathingTimerRef.current) {
                clearTimeout(breathingTimerRef.current);
                breathingTimerRef.current = null;
            }
        };
    }, []);

    const stopBreathing = () => {
        if (breathingTimerRef.current) {
            clearTimeout(breathingTimerRef.current);
            breathingTimerRef.current = null;
        }
        setBreathingState("idle");
    };

    const toggleBreathing = () => {
        if (breathingState !== "idle") {
            stopBreathing();
            return;
        }

        const runPhase = (phase: 0 | 1 | 2) => {
            if (phase === 0) {
                setBreathingState("inhale");
                breathingTimerRef.current = setTimeout(() => runPhase(1), 4000);
            } else if (phase === 1) {
                setBreathingState("hold");
                breathingTimerRef.current = setTimeout(() => runPhase(2), 7000);
            } else {
                setBreathingState("exhale");
                breathingTimerRef.current = setTimeout(() => runPhase(0), 8000);
            }
        };

        runPhase(0);
    };

    const saveDiary = (e: React.FormEvent) => {
        e.preventDefault();
        const trigger = triggerText.trim();
        const balanced = balancedText.trim();

        if (!trigger || !balanced) {
            showToast(
                "Please complete at least the situation and balanced thought.",
                "error"
            );
            return;
        }

        const entry: CbtEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            trigger,
            thought: thoughtText.trim(),
            evidence: evidenceText.trim(),
            balanced,
        };

        writeJournalEntries([entry, ...diaryEntries]);
        showToast("Thinking diary saved. Great job reframing that thought!", "success");

        setTriggerText("");
        setThoughtText("");
        setEvidenceText("");
        setBalancedText("");
    };

    const deleteEntry = async (id: string) => {
        const confirmed = await confirmAction({
            title: "Delete this diary entry?",
            description: "This journal reflection will be removed from this browser.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            destructive: true,
        });
        if (!confirmed) return;

        writeJournalEntries(diaryEntries.filter((entry) => entry.id !== id));
        showToast("Entry removed.", "info");
    };

    return (
        <div className="min-h-screen w-full p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Coping Toolkit</h1>
                    <p className="text-muted-foreground">
                        Practical tools to regain balance and focus.
                    </p>
                </div>

                <SimpleTabs
                    active={activeTab}
                    onChange={setActiveTab}
                    options={[
                        {
                            id: "breathing",
                            label: "Breathing",
                            icon: <Wind className="w-4 h-4" aria-hidden="true" />,
                        },
                        {
                            id: "cbt",
                            label: "Thinking Diary",
                            icon: <Lightbulb className="w-4 h-4" aria-hidden="true" />,
                        },
                        {
                            id: "media",
                            label: "Relaxation Media",
                            icon: <Activity className="w-4 h-4" aria-hidden="true" />,
                        },
                        {
                            id: "tips",
                            label: "Study Tips",
                            icon: <BookOpen className="w-4 h-4" aria-hidden="true" />,
                        },
                    ]}
                />

                <div className="min-h-[400px]">
                    {activeTab === "breathing" && (
                        <Card className="glass-card text-center">
                            <CardHeader>
                                <CardTitle>4-7-8 Relaxation Breathing</CardTitle>
                                <CardDescription>
                                    Inhale for 4s, Hold for 7s, Exhale for 8s.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center min-h-[300px] gap-8">
                                <div className="relative flex items-center justify-center w-64 h-64">
                                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />

                                    <motion.div
                                        animate={{
                                            scale:
                                                breathingState === "inhale"
                                                    ? 1.5
                                                    : breathingState === "exhale"
                                                      ? 1
                                                      : 1.2,
                                            opacity: breathingState === "exhale" ? 0.7 : 1,
                                        }}
                                        transition={{
                                            duration:
                                                breathingState === "inhale"
                                                    ? 4
                                                    : breathingState === "exhale"
                                                      ? 8
                                                      : 0.3,
                                        }}
                                        className="w-32 h-32 bg-primary/25 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/30 relative z-10"
                                    >
                                        <span
                                            aria-live="polite"
                                            className="text-xl font-semibold uppercase tracking-widest text-foreground"
                                        >
                                            {breathingState === "idle" ? "Ready" : breathingState}
                                        </span>
                                    </motion.div>
                                </div>
                                <Button size="lg" onClick={toggleBreathing}>
                                    {breathingState === "idle" ? "Start Exercise" : "Stop"}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === "cbt" && (
                        <div className="space-y-6">
                            <Card className="glass-card">
                                <CardHeader>
                                    <CardTitle>CBT Thinking Diary</CardTitle>
                                    <CardDescription>
                                        Identify and challenge negative thoughts to improve your mood.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={saveDiary} className="space-y-4">
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="cbt-trigger"
                                                className="text-sm font-medium block"
                                            >
                                                1. The Situation (Trigger)
                                            </label>
                                            <textarea
                                                id="cbt-trigger"
                                                value={triggerText}
                                                onChange={(e) => setTriggerText(e.target.value)}
                                                className="w-full bg-background/50 border border-input rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="e.g., I have a Calculus exam tomorrow."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="cbt-thought"
                                                className="text-sm font-medium block"
                                            >
                                                2. Automatic Negative Thought
                                            </label>
                                            <textarea
                                                id="cbt-thought"
                                                value={thoughtText}
                                                onChange={(e) => setThoughtText(e.target.value)}
                                                className="w-full bg-background/50 border border-input rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="e.g., I'm going to fail. I'm not capable."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="cbt-evidence"
                                                className="text-sm font-medium block"
                                            >
                                                3. Challenge (Evidence against thought)
                                            </label>
                                            <textarea
                                                id="cbt-evidence"
                                                value={evidenceText}
                                                onChange={(e) => setEvidenceText(e.target.value)}
                                                className="w-full bg-background/50 border border-input rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="e.g., I passed the last quiz. I've studied for 3 days."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="cbt-balanced"
                                                className="text-sm font-medium block"
                                            >
                                                4. Balanced / Alternative Thought
                                            </label>
                                            <textarea
                                                id="cbt-balanced"
                                                value={balancedText}
                                                onChange={(e) => setBalancedText(e.target.value)}
                                                className="w-full bg-primary/5 border border-primary/20 rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="e.g., It will be challenging, but I'm prepared enough to do my best."
                                            />
                                        </div>
                                        <Button type="submit" className="w-full">
                                            Save to Diary
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold px-2">Past Entries</h3>
                                {diaryEntries.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No entries yet. Start writing above!
                                    </p>
                                ) : (
                                    diaryEntries.map((entry) => (
                                        <Card
                                            key={entry.id}
                                            className="glass-card hover:bg-white/5 transition-colors group relative"
                                        >
                                            <CardContent className="p-4 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                                        {new Date(entry.date).toLocaleDateString()}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-red-500 -mt-1 -mr-1"
                                                        onClick={() => void deleteEntry(entry.id)}
                                                        title="Delete Entry"
                                                        aria-label="Delete diary entry"
                                                    >
                                                        <Trash2
                                                            className="w-4 h-4"
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold text-rose-400 block">
                                                        Trigger
                                                    </span>
                                                    <p className="text-sm">{entry.trigger}</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                    <div>
                                                        <span className="text-xs font-semibold text-muted-foreground block">
                                                            Negative Thought
                                                        </span>
                                                        <p className="text-sm text-muted-foreground italic">
                                                            &ldquo;{entry.thought}&rdquo;
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-semibold text-emerald-400 block">
                                                            Balanced Thought
                                                        </span>
                                                        <p className="text-sm">{entry.balanced}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "media" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="glass-card overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Wind
                                            className="w-5 h-5 text-blue-400"
                                            aria-hidden="true"
                                        />{" "}
                                        White Noise
                                    </CardTitle>
                                    <CardDescription>Deep Focus &amp; Relaxation</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 pb-4 px-4">
                                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src="https://www.youtube.com/embed/nMfPqeZjc2c"
                                            title="White Noise"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-card overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Activity
                                            className="w-5 h-5 text-green-400"
                                            aria-hidden="true"
                                        />{" "}
                                        Therapy Podcast
                                    </CardTitle>
                                    <CardDescription>Mental Health Awareness</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 pb-4 px-4">
                                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src="https://www.youtube.com/embed/OTQJmkXC2EI"
                                            title="Therapy Podcast"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-card md:col-span-2 overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        Mental Health Manage Guide
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 pb-4 px-4">
                                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src="https://www.youtube.com/embed/rkZl2gsLUp4"
                                            title="Mental Health Manage Guide"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-card md:col-span-2 overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        Guided Video: Box Breathing
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 pb-4 px-4">
                                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src="https://www.youtube.com/embed/oN8xV3Kb5-Q"
                                            title="Box Breathing"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "tips" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="glass-card hover:bg-white/5 transition-colors group">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        Pomodoro Technique
                                        <Wind
                                            className="w-4 h-4 text-primary opacity-50"
                                            aria-hidden="true"
                                        />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-foreground">Best for:</strong>{" "}
                                        Beating procrastination &amp; staying fresh.
                                    </p>
                                    <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                                        <li>Pick a single task.</li>
                                        <li>Set a timer for 25 minutes (1 Pomodoro).</li>
                                        <li>Work until the timer rings.</li>
                                        <li>Take a short 5-minute break.</li>
                                        <li>After 4 cycles, take a longer 15-30 min break.</li>
                                    </ul>
                                    <a
                                        href="https://todoist.com/productivity-methods/pomodoro-technique"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1 pt-2"
                                    >
                                        Learn how to apply{" "}
                                        <BookOpen className="w-3 h-3" aria-hidden="true" />
                                    </a>
                                </CardContent>
                            </Card>

                            <Card className="glass-card hover:bg-white/5 transition-colors group">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        Feynman Method
                                        <Lightbulb
                                            className="w-4 h-4 text-yellow-500 opacity-50"
                                            aria-hidden="true"
                                        />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-foreground">Best for:</strong> Deep
                                        understanding &amp; memorization.
                                    </p>
                                    <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                                        <li>Choose a concept you want to learn.</li>
                                        <li>Pretend you are teaching it to a 6th grader.</li>
                                        <li>Identify gaps in your explanation.</li>
                                        <li>Review the source material to fill gaps.</li>
                                        <li>Simplify and create analogies.</li>
                                    </ul>
                                    <a
                                        href="https://fs.blog/feynman-technique/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1 pt-2"
                                    >
                                        Read full guide{" "}
                                        <BookOpen className="w-3 h-3" aria-hidden="true" />
                                    </a>
                                </CardContent>
                            </Card>

                            <Card className="glass-card hover:bg-white/5 transition-colors group md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        Spaced Repetition (SRS)
                                        <Activity
                                            className="w-4 h-4 text-green-500 opacity-50"
                                            aria-hidden="true"
                                        />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-foreground">Best for:</strong>{" "}
                                        Long-term memory &amp; exams.
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                        Instead of cramming, review material at increasing
                                        intervals.
                                        <br />
                                        <span className="font-semibold text-foreground">
                                            Schedule:
                                        </span>
                                        <span className="block mt-1 pl-2 border-l-2 border-primary/20">
                                            1st Review: Immediate
                                            <br />
                                            2nd Review: After 24 hours
                                            <br />
                                            3rd Review: After 3 days
                                            <br />
                                            4th Review: After 1 week
                                        </span>
                                    </div>
                                    <a
                                        href="https://e-student.org/spaced-repetition/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1 pt-2"
                                    >
                                        Master this technique{" "}
                                        <BookOpen className="w-3 h-3" aria-hidden="true" />
                                    </a>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
