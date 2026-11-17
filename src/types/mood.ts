/**
 * Allowed emotion identifiers for daily mood check-ins.
 */
export type EmotionId = "anxious" | "tired" | "pressure" | "normal" | "excited";

/**
 * Serialized mood check-in entry passed to Dashboard components and charts.
 */
export interface MoodHistoryEntry {
    id?: string;
    mood: number;
    focus: number;
    energy: number;
    emotion: string;
    note?: string | null;
    date: string;
    createdAt?: string;
}
