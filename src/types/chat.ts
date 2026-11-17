/**
 * Client chat message representation.
 */
export interface ChatMessageDTO {
    id: string;
    role: "user" | "bot";
    text: string;
    timestamp: Date;
    type?: "normal" | "risk";
}

/**
 * Risk/support sentiment tags detected locally for crisis modal triggers.
 */
export type ChatSentiment =
    | "risk"
    | "academic_stress"
    | "general_stress"
    | "sadness"
    | "anxiety"
    | "distracted"
    | "positive"
    | "greeting"
    | "neutral"
    | "question";
