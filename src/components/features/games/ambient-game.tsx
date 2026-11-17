"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCALES = [
    130.81, 146.83, 164.81, 196.0, 220.0,
    261.63, 293.66, 329.63, 392.0, 440.0,
    523.25, 587.33, 659.25, 783.99, 880.0,
] as const;

const AMBIENT_PARTICLES = [
    { id: 0, x: [12, 160], y: [25, 220], duration: 14, left: "8%", top: "14%" },
    { id: 1, x: [40, 290], y: [80, 140], duration: 18, left: "24%", top: "68%" },
    { id: 2, x: [80, 420], y: [30, 310], duration: 16, left: "42%", top: "22%" },
    { id: 3, x: [20, 240], y: [110, 360], duration: 15, left: "58%", top: "74%" },
    { id: 4, x: [60, 360], y: [45, 280], duration: 19, left: "72%", top: "18%" },
    { id: 5, x: [35, 310], y: [70, 330], duration: 13, left: "86%", top: "52%" },
    { id: 6, x: [95, 210], y: [15, 190], duration: 17, left: "16%", top: "46%" },
    { id: 7, x: [50, 390], y: [90, 250], duration: 20, left: "64%", top: "38%" },
] as const;

interface RippleItem {
    id: string;
    x: number;
    y: number;
    color: string;
}

export function AmbientGame() {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const [ripples, setRipples] = useState<RippleItem[]>([]);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        return () => {
            if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    const getOrCreateAudioContext = (): AudioContext | null => {
        if (typeof window === "undefined") return null;
        if (!audioCtxRef.current) {
            const Ctx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext?: typeof AudioContext })
                    .webkitAudioContext;
            if (!Ctx) return null;
            audioCtxRef.current = new Ctx();
        }
        return audioCtxRef.current;
    };

    const playTone = useCallback(
        (freq: number) => {
            if (isMuted) return;
            const audioCtx = getOrCreateAudioContext();
            if (!audioCtx) return;
            if (audioCtx.state === "suspended") {
                audioCtx.resume().catch(() => {});
            }

            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 3.1);
        },
        [isMuted]
    );

    const triggerNoteAt = (x: number, y: number, height: number) => {
        const safeHeight = Math.max(1, height);
        const percentY = Math.max(0, Math.min(1, 1 - y / safeHeight));
        const scaleIndex = Math.max(
            0,
            Math.min(SCALES.length - 1, Math.floor(percentY * SCALES.length))
        );
        playTone(SCALES[scaleIndex]);

        const hue = 180 + ((Math.round(x + y) % 60 + 60) % 60);
        setRipples((prev) => [
            ...prev.slice(-15),
            {
                id: crypto.randomUUID(),
                x,
                y,
                color: `hsl(${hue}, 80%, 70%)`,
            },
        ]);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        triggerNoteAt(e.clientX - rect.left, e.clientY - rect.top, rect.height);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const randomY = Math.random() * Math.max(1, rect.height);
            const randomX = Math.random() * Math.max(1, rect.width);
            triggerNoteAt(randomX, randomY, rect.height);
        }
    };

    return (
        <div className="flex flex-col space-y-4 h-full">
            <div className="flex items-center justify-between px-4">
                <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                        <Music className="w-5 h-5 text-cyan-500" aria-hidden="true" /> Sonic
                        Universe
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        Tap anywhere or press Space to create sound &amp; light.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMuted((prev) => !prev)}
                    aria-label={isMuted ? "Unmute sound" : "Mute sound"}
                    aria-pressed={isMuted}
                >
                    {isMuted ? (
                        <VolumeX className="w-5 h-5" aria-hidden="true" />
                    ) : (
                        <Volume2 className="w-5 h-5" aria-hidden="true" />
                    )}
                </Button>
            </div>

            <div
                role="button"
                tabIndex={0}
                aria-label="Interactive ambient sound canvas"
                className="relative w-full h-[500px] bg-[#0a0a0a] rounded-xl overflow-hidden cursor-pointer shadow-2xl border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={handleClick}
                onKeyDown={handleKeyDown}
            >
                {AMBIENT_PARTICLES.map((p) => (
                    <motion.div
                        key={p.id}
                        className="absolute w-2 h-2 bg-white/20 rounded-full"
                        animate={{
                            x: [...p.x],
                            y: [...p.y],
                            opacity: [0.2, 0.5, 0.2],
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "linear",
                        }}
                        style={{
                            left: p.left,
                            top: p.top,
                        }}
                    />
                ))}

                <AnimatePresence>
                    {ripples.map((ripple) => (
                        <Ripple
                            key={ripple.id}
                            x={ripple.x}
                            y={ripple.y}
                            color={ripple.color}
                            onComplete={() =>
                                setRipples((prev) => prev.filter((r) => r.id !== ripple.id))
                            }
                        />
                    ))}
                </AnimatePresence>

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                    <span className="text-7xl sm:text-9xl font-bold tracking-tighter text-white">
                        LISTEN
                    </span>
                </div>
            </div>
        </div>
    );
}

function Ripple({
    x,
    y,
    color,
    onComplete,
}: {
    x: number;
    y: number;
    color: string;
    onComplete: () => void;
}) {
    return (
        <motion.div
            initial={{ width: 0, height: 0, opacity: 0.8, borderWidth: 20 }}
            animate={{ width: 500, height: 500, opacity: 0, borderWidth: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            onAnimationComplete={onComplete}
            className="absolute rounded-full border-solid pointer-events-none"
            style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
                borderColor: color,
                boxShadow: `0 0 20px ${color}`,
            }}
        />
    );
}
