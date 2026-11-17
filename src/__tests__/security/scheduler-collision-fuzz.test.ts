import { describe, expect, it } from "vitest";
import {
    BUFFER_HOURS,
    DAYS_ORDER,
    generateWeeklySchedule,
    timeToFloat,
} from "@/lib/scheduler/algorithm";
import type { FixedEventDTO, SchedulerTaskDTO } from "@/types";

function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0xffffffff;
    };
}

describe("security/scheduler-collision-fuzz", () => {
    it("never assigns overlapping time intervals or violates the 15-minute transition buffer across seeded schedules", () => {
        const rand = seededRandom(20260301);

        for (let trial = 0; trial < 20; trial++) {
            const fixedEvents: FixedEventDTO[] = Array.from({ length: 6 }, (_, i) => {
                const day = DAYS_ORDER[Math.floor(rand() * DAYS_ORDER.length)];
                const startHour = 8 + Math.floor(rand() * 10);
                const duration = 1 + Math.floor(rand() * 2);
                const sh = `${String(startHour).padStart(2, "0")}:00`;
                const eh = `${String(startHour + duration).padStart(2, "0")}:00`;
                return { id: `fe-${trial}-${i}`, name: `Class ${i}`, day, startTime: sh, endTime: eh };
            });

            const tasks: SchedulerTaskDTO[] = Array.from({ length: 12 }, (_, i) => ({
                id: `task-${trial}-${i}`,
                name: `Study ${i}`,
                duration: 1 + Math.floor(rand() * 3),
            }));

            const scheduled = generateWeeklySchedule(tasks, fixedEvents, "08:00", "22:00");
            const assignedTasks = scheduled.filter((t) => Boolean(t.assignedSlot));

            for (const task of assignedTasks) {
                const slot = task.assignedSlot!;
                const tStart = timeToFloat(slot.startTime);
                const tEnd = tStart + task.duration;
                expect(tStart).toBeGreaterThanOrEqual(8);
                expect(tEnd).toBeLessThanOrEqual(22);

                for (const fe of fixedEvents) {
                    if (fe.day !== slot.day) continue;
                    const feStart = timeToFloat(fe.startTime);
                    const feEnd = timeToFloat(fe.endTime);
                    const collides = tStart < feEnd + BUFFER_HOURS && tEnd > feStart - BUFFER_HOURS;
                    expect(collides, `trial=${trial} ${task.id} collided with fixed ${fe.id}`).toBe(
                        false
                    );
                }

                for (const other of assignedTasks) {
                    if (other.id === task.id || other.assignedSlot?.day !== slot.day) continue;
                    const oStart = timeToFloat(other.assignedSlot!.startTime);
                    const oEnd = oStart + other.duration;
                    const collides = tStart < oEnd + BUFFER_HOURS && tEnd > oStart - BUFFER_HOURS;
                    expect(collides, `trial=${trial} ${task.id} collided with ${other.id}`).toBe(
                        false
                    );
                }
            }
        }
    });
});
