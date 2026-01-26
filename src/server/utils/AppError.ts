/**
 * Custom application error class for structured error handling.
 * Allows distinguishing between operational errors (safe to expose)
 * and programming errors (should log but not expose details).
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true
    ) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Factory method for common error types
     */
    static badRequest(message: string, code: string = 'BAD_REQUEST'): AppError {
        return new AppError(message, 400, code);
    }

    static notFound(message: string, code: string = 'NOT_FOUND'): AppError {
        return new AppError(message, 404, code);
    }

    static unauthorized(message: string, code: string = 'UNAUTHORIZED'): AppError {
        return new AppError(message, 401, code);
    }

    static aiFailure(message: string, code: string = 'AI_GENERATION_FAILED'): AppError {
        return new AppError(message, 503, code);
    }

    static dbFailure(message: string, code: string = 'DATABASE_ERROR'): AppError {
        return new AppError(message, 500, code);
    }

    static rateLimited(message: string, code: string = 'RATE_LIMITED'): AppError {
        return new AppError(message, 429, code);
    }

    toJSON() {
        return {
            error: this.code,
            message: this.message,
            statusCode: this.statusCode,
        };
    }
}
