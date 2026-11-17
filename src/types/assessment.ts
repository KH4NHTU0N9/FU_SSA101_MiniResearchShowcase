/**
 * DASS-21 subscale categories.
 */
export type DassCategory = "Depression" | "Anxiety" | "Stress";

/**
 * Raw DASS-21 scores per subscale (0 to 21).
 */
export interface DassScores {
    Depression: number;
    Anxiety: number;
    Stress: number;
}

/**
 * Clinical severity classification returned for a DASS-21 score.
 */
export type DassSeverityLabel =
    | "Normal"
    | "Mild"
    | "Moderate"
    | "Severe"
    | "Extremely Severe";

export interface DassSeverityInfo {
    label: DassSeverityLabel;
    color: string;
    bg: string;
}

/**
 * Client-facing assessment result payload.
 */
export interface AssessmentResultDTO {
    id?: string;
    createdAt: string;
    scores: DassScores;
}
