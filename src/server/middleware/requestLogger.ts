import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../Logger';

/**
 * Request/Response logging middleware
 * Logs every incoming request and its response with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const reqId = Math.random().toString(36).substring(2, 9);

    // Log incoming request
    const method = req.method;
    const path = req.path;
    const bodySize = req.headers['content-length'] ? `${req.headers['content-length']}b` : '';

    Logger.api(`${method} ${path}${bodySize ? ` (${bodySize})` : ''}`, { reqId });

    // Capture the original res.json to log response
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const statusColor = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';

        Logger.api(`${method} ${path} → ${statusColor} ${status} (${duration}ms)`, { reqId });

        return originalJson(body);
    };

    next();
}
