/**
 * Authenticated user profile fields safe to expose to client components.
 */
export interface PublicUser {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
}

/**
 * Claims embedded in the signed session JWT cookie.
 */
export interface SessionUser {
    id: string;
    email: string;
    name: string | null;
    tokenVersion: number;
    role?: string;
}

/**
 * Result returned by client authentication actions.
 */
export interface AuthActionResult {
    success: boolean;
    error?: string;
    requireVerification?: boolean;
}
