/**
 * Word-boundary crisis / self-harm risk patterns (English & Vietnamese).
 */
const RISK_PATTERNS: readonly RegExp[] = [
    /\b(?:suicide|suicidal|kill\s+myself|end\s+my\s+life|end\s+it\s+all|hurt\s+myself|want\s+to\s+die|wanna\s+die|self[- ]?harm)\b/i,
    /(?:^|[^\p{L}])(?:tự tử|tự sát|muốn chết|không muốn sống|tự hại|kết thúc cuộc đời)(?=$|[^\p{L}])/iu,
];

/**
 * Checks whether a user message expresses self-harm or crisis ideation.
 */
export function detectCrisisRisk(text: string): boolean {
    const normalized = text.trim();
    if (!normalized) return false;
    return RISK_PATTERNS.some((pattern) => pattern.test(normalized));
}
