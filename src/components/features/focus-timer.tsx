"use client";

import { useEffect, useRef, useState } from "react";
import {
    AlertCircle,
    Lock,
    Music,
    Pause,
    Play,
    RotateCcw,
    Unlock,
    Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const SOUNDS = [
    {
        id: "rain",
        label: "Rain",
        url: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg",
    },
    {
        id: "cafe",
        label: "Cafe",
        url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
    },
    {
        id: "waves",
        label: "Waves",
        url: "https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg",
    },
] as const;

function getModeDurationSeconds(mode: "focus" | "shortBreak" | "longBreak"): number {
    if (mode === "focus") return 25 * 60;
    if (mode === "shortBreak") return 5 * 60;
    return 15 * 60;
}

function formatTime(seconds: number): string {
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function FocusTimer() {
    const { showToast } = useToast();
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
    const [task, setTask] = useState("");
    const [isStrict, setIsStrict] = useState(false);
    const [isEditingTask, setIsEditingTask] = useState(true);
    const [ambient, setAmbient] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);

    const [timerType, setTimerType] = useState<"pomodoro" | "custom">("pomodoro");
    const [customMinutes, setCustomMinutes] = useState(30);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const completedFlagRef = useRef(false);

    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    completedFlagRef.current = true;
                    setIsActive(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive]);

    useEffect(() => {
        if (!isActive && timeLeft === 0 && completedFlagRef.current) {
            completedFlagRef.current = false;
            const audio = new Audio(
                "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
            );
            audio.play().catch(() => {});
            showToast("Focus session complete!", "success");
        }
    }, [isActive, timeLeft, showToast]);

    useEffect(() => {
        if (!isStrict || !isActive) return;

        const handleVisibility = () => {
            if (document.hidden) {
                setIsActive(false);
                showToast("Strict Mode paused your timer because you switched tabs.", "info");
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [isStrict, isActive, showToast]);

    useEffect(() => {
        if (!audioRef.current) return;
        if (ambient) {
            audioRef.current.play().catch(() => {});
        } else {
            audioRef.current.pause();
        }
    }, [ambient]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (isActive) {
            document.title = `(${formatTime(timeLeft)}) Focus Mode`;
        } else {
            document.title = "FPT Psychology Support | Focus";
        }
        return () => {
            document.title = "FPT Psychology Support";
        };
    }, [timeLeft, isActive]);

    const toggleTimer = () => {
        if (!task.trim() && !isActive) {
            showToast("Please enter a focus objective first.", "info");
            return;
        }
        if (timeLeft <= 0) {
            resetTimer();
        }
        if (isEditingTask) setIsEditingTask(false);
        setIsActive((prev) => !prev);
    };

    const resetTimer = () => {
        setIsActive(false);
        completedFlagRef.current = false;
        if (timerType === "pomodoro") {
            setTimeLeft(getModeDurationSeconds(mode));
        } else {
            setTimeLeft(Math.max(1, customMinutes) * 60);
        }
    };

    const changeMode = (newMode: typeof mode) => {
        setMode(newMode);
        setIsActive(false);
        completedFlagRef.current = false;
        setTimeLeft(getModeDurationSeconds(newMode));
    };

    const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = parseInt(e.target.value, 10);
        const clamped = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(180, parsed));
        setCustomMinutes(clamped);
        if (!isActive) {
            completedFlagRef.current = false;
            setTimeLeft(clamped * 60);
        }
    };

    const toggleStrictMode = () => {
        if (isActive) return;
        const nextStrict = !isStrict;
        setIsStrict(nextStrict);
        if (nextStrict) {
            document.documentElement.requestFullscreen?.().catch(() => {});
        } else if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 px-2">
            <audio
                ref={audioRef}
                loop
                src={ambient ? SOUNDS.find((s) => s.id === ambient)?.url : undefined}
            />

            <div className="bg-secondary/50 p-1 rounded-full flex relative z-20">
                <Button
                    variant={timerType === "pomodoro" ? "default" : "ghost"}
                    onClick={() => {
                        setTimerType("pomodoro");
                        setIsActive(false);
                        setMode("focus");
                        setTimeLeft(getModeDurationSeconds("focus"));
                    }}
                    className="rounded-full px-6"
                >
                    Pomodoro
                </Button>
                <Button
                    variant={timerType === "custom" ? "default" : "ghost"}
                    onClick={() => {
                        setTimerType("custom");
                        setIsActive(false);
                        setTimeLeft(Math.max(1, customMinutes) * 60);
                    }}
                    className="rounded-full px-6"
                >
                    Custom
                </Button>
            </div>

            <div className="w-full text-center space-y-2 relative z-20">
                {isEditingTask ? (
                    <Input
                        aria-label="Focus objective"
                        placeholder="What is your focused goal?"
                        className="text-center text-xl md:text-2xl font-medium border-none bg-transparent placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        onBlur={() => task.trim() && setIsEditingTask(false)}
                        onKeyDown={(e) => e.key === "Enter" && task.trim() && setIsEditingTask(false)}
                        maxLength={120}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => !isActive && setIsEditingTask(true)}
                        disabled={isActive}
                        className={cn(
                            "text-xl md:text-3xl font-bold hover:opacity-80 transition-all inline-flex items-center justify-center gap-2",
                            isActive ? "opacity-100 cursor-default" : "opacity-75 cursor-pointer"
                        )}
                    >
                        <span>{task}</span>
                        {!isActive && (
                            <span className="text-xs font-normal text-muted-foreground">
                                (Click to edit)
                            </span>
                        )}
                    </button>
                )}
                <p className="text-sm text-muted-foreground uppercase tracking-widest">
                    Current Objective
                </p>
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />
                <div
                    role="timer"
                    aria-live="off"
                    className="relative text-6xl sm:text-8xl md:text-[10rem] font-bold tabular-nums leading-none tracking-tighter drop-shadow-2xl transition-all"
                >
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="flex flex-col items-center gap-6 relative z-20 w-full">
                <div className="flex items-center gap-4">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full"
                        onClick={resetTimer}
                        aria-label="Reset timer"
                        title="Reset timer"
                    >
                        <RotateCcw className="w-6 h-6" aria-hidden="true" />
                    </Button>

                    <Button
                        size="icon"
                        className={cn(
                            "w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all duration-300",
                            isActive
                                ? "bg-rose-500 hover:bg-rose-600"
                                : "bg-emerald-500 hover:bg-emerald-600"
                        )}
                        onClick={toggleTimer}
                        aria-label={isActive ? "Pause timer" : "Start timer"}
                        title={isActive ? "Pause timer" : "Start timer"}
                    >
                        {isActive ? (
                            <Pause className="w-9 h-9 sm:w-10 sm:h-10" aria-hidden="true" />
                        ) : (
                            <Play className="w-9 h-9 sm:w-10 sm:h-10 ml-1" aria-hidden="true" />
                        )}
                    </Button>

                    <Button
                        size="icon"
                        variant={isStrict ? "destructive" : "secondary"}
                        className={cn(
                            "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
                            isStrict && "ring-4 ring-rose-500/30"
                        )}
                        onClick={toggleStrictMode}
                        disabled={isActive}
                        title="Strict Mode (Fullscreen & tab guard)"
                        aria-label={isStrict ? "Disable strict mode" : "Enable strict mode"}
                        aria-pressed={isStrict}
                    >
                        {isStrict ? (
                            <Lock className="w-6 h-6" aria-hidden="true" />
                        ) : (
                            <Unlock className="w-6 h-6" aria-hidden="true" />
                        )}
                    </Button>
                </div>

                {timerType === "pomodoro" ? (
                    <div className="flex flex-wrap items-center justify-center p-1 bg-secondary/50 rounded-full gap-1">
                        <Button
                            variant={mode === "focus" ? "default" : "ghost"}
                            onClick={() => changeMode("focus")}
                            className="rounded-full px-5"
                        >
                            Focus
                        </Button>
                        <Button
                            variant={mode === "shortBreak" ? "default" : "ghost"}
                            onClick={() => changeMode("shortBreak")}
                            className="rounded-full px-5"
                        >
                            Short Break
                        </Button>
                        <Button
                            variant={mode === "longBreak" ? "default" : "ghost"}
                            onClick={() => changeMode("longBreak")}
                            className="rounded-full px-5"
                        >
                            Long Break
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-xl">
                        <label htmlFor="custom-minutes-input" className="text-sm font-medium">
                            Duration (min):
                        </label>
                        <Input
                            id="custom-minutes-input"
                            type="number"
                            min={1}
                            max={180}
                            value={customMinutes}
                            onChange={handleCustomTimeChange}
                            disabled={isActive}
                            className="w-20 text-center font-bold text-lg"
                        />
                    </div>
                )}

                <Card className="glass-card mt-2 border-none bg-white/5 w-full sm:w-auto">
                    <CardContent className="p-4 flex flex-wrap items-center justify-center gap-4">
                        <Music className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <div className="flex flex-wrap bg-background/50 rounded-lg p-1 gap-1">
                            <Button
                                size="sm"
                                variant={ambient === null ? "secondary" : "ghost"}
                                onClick={() => setAmbient(null)}
                                className="text-xs h-7"
                            >
                                Off
                            </Button>
                            {SOUNDS.map((s) => (
                                <Button
                                    key={s.id}
                                    size="sm"
                                    variant={ambient === s.id ? "secondary" : "ghost"}
                                    onClick={() => setAmbient(s.id)}
                                    className="text-xs h-7"
                                >
                                    {s.label}
                                </Button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 w-28">
                            <Volume2
                                className="w-4 h-4 text-muted-foreground shrink-0"
                                aria-hidden="true"
                            />
                            <input
                                type="range"
                                aria-label="Ambient sound volume"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </CardContent>
                </Card>

                {isStrict && (
                    <div className="flex items-center gap-2 text-rose-400 text-sm animate-pulse text-center">
                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Strict Mode Active: Tab switching pauses the timer</span>
                    </div>
                )}
            </div>
        </div>
    );
}
