const PROHIBITED_TERMS = [
    "kill",
    "die",
    "stupid",
    "hate",
    "ugly",
    "chết",
    "ngu",
    "giết",
    "fuck",
    "bitch",
    "shit",
    "ass",
    "cunt",
    "damn",
    "whore",
    "đụ",
    "cặc",
    "lồn",
    "rau má",
] as const;

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Match whole words/phrases using Unicode-aware boundaries so substrings like "assessment" or "class" pass cleanly.
const PROHIBITED_REGEXES = PROHIBITED_TERMS.map(
    (term) => new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(term)}($|[^\\p{L}\\p{N}_])`, "iu")
);

/**
 * Checks whether user text contains prohibited terms at word/phrase boundaries.
 */
export function containsProhibitedContent(text: string): boolean {
    if (!text) return false;
    return PROHIBITED_REGEXES.some((pattern) => pattern.test(text));
}
