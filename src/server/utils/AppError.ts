/**
 * Custom application error class for structured error handling.
 * Allows distinguishing between operational errors (safe to expose)
 * and programming errors (should log but not expose details).
 */

import { getErrorDefinition } from '../../shared/errorCodes';

export interface AppErrorResponse {
    error: string;
    code: string;
    message: string; // Technical message for logs
    userMessage: string; // User-friendly message (always present)
    robotDialogue: string; // Robot's persona message (always present)
    statusCode: number;
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly userMessage?: string;
    public readonly robotDialogue?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true,
        userMessage?: string,
        robotDialogue?: string
    ) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        if (userMessage !== undefined) this.userMessage = userMessage;
        if (robotDialogue !== undefined) this.robotDialogue = robotDialogue;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Factory method for common error types
     */
    static badRequest(message: string, code: string = 'BAD_REQUEST'): AppError {
        const errorDef = getErrorDefinition(code);
        return new AppError(
            message,
            400,
            code,
            true,
            errorDef.userMessage,
            errorDef.robotDialogue
        );
    }

    static notFound(message: string, code: string = 'NOT_FOUND'): AppError {
        const errorDef = getErrorDefinition(code);
        return new AppError(
            message,
            404,
            code,
            true,
            errorDef.userMessage,
            errorDef.robotDialogue
        );
    }

    static unauthorized(message: string, code: string = 'UNAUTHORIZED'): AppError {
        const errorDef = getErrorDefinition(code);
        return new AppError(
            message,
            401,
            code,
            true,
            errorDef.userMessage,
            errorDef.robotDialogue
        );
    }

    static aiFailure(message: string, code: string = 'AI_GENERATION_FAILED'): AppError {
        const errorDef = getErrorDefinition(code);
        return new AppError(
            message,
            503,
            code,
            true,
            errorDef.userMessage,
            errorDef.robotDialogue
        );
    }

    static dbFailure(message: string, code: string = 'DB_FAILURE'): AppError {
        const errorDef = getErrorDefinition(code);
        return new AppError(
            message,
            500,
            code,
            true,
            errorDef.userMessage,
            errorDef.robotDialogue
        );
    }

    static rateLimited(message: string, code: string = 'RATE_LIMITED'): AppError {
        const errorDef = getErrorDefinition(code);
        return new AppError(
            message,
            429,
            code,
            true,
            errorDef.userMessage,
            errorDef.robotDialogue
        );
    }

    toJSON(): AppErrorResponse {
        const errorDef = getErrorDefinition(this.code);
        return {
            error: this.name,
            code: this.code,
            message: this.message,
            userMessage: this.userMessage || errorDef.userMessage,
            robotDialogue: this.robotDialogue || errorDef.robotDialogue,
            statusCode: this.statusCode,
        };
    }
}
