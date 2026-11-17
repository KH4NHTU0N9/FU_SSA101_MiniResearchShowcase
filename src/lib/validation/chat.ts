import { z } from "zod";

export const chatInputMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1, "Message cannot be empty").max(4000, "Message is too long"),
});

/**
 * Validates chat requests and blocks role spoofing (e.g. client-injected "system" messages).
 */
export const chatPayloadSchema = z.object({
    messages: z
        .array(chatInputMessageSchema)
        .min(1, "At least one message is required")
        .max(40, "Too many messages in conversation payload")
        .refine(
            (msgs) => msgs[msgs.length - 1]?.role === "user",
            "The final message must come from the user"
        ),
});
