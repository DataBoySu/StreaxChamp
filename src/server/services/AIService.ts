import { CONFIG } from '../../shared/constants';
import { Logger } from '../Logger';

export class AIQuotaError extends Error {
    constructor(public provider: string, message: string) {
        super(message);
        this.name = 'AIQuotaError';
    }
}

export class AIModelNotFoundError extends Error {
    constructor(public model: string, message: string) {
        super(message);
        this.name = 'AIModelNotFoundError';
    }
}

export interface AIResponse {
    text: string;
    model: string;
    latencyMs: number;
}

export class AIService {
    private googleKey: string;
    private openAIKey: string;

    constructor(googleKey?: string, openAIKey?: string) {
        this.googleKey = googleKey || '';
        this.openAIKey = openAIKey || googleKey || '';
    }

    public hasKey(provider: string): boolean {
        if (provider === 'google') return !!this.googleKey;
        return !!this.openAIKey;
    }

    async callAI(
        systemPrompt: string,
        userPrompt: string,
        model: string,
        config: { temperature?: number; maxTokens?: number; responseMimeType?: string } = {}
    ): Promise<AIResponse> {
        const provider = CONFIG.GEMINI.getProvider(model);

        if (!this.hasKey(provider)) {
            throw new Error(`[AIService] No API key enabled for provider=${provider}`);
        }

        const apiKey = provider === 'google' ? this.googleKey : this.openAIKey;
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        Logger.info(`[AIService] Request: provider=${provider} model=${model}`);

        try {
            let url = '';
            let body = {};
            let headers: Record<string, string> = { 'Content-Type': 'application/json' };

            if (provider === 'google') {
                const apiVersion = 'v1alpha';
                url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

                body = {
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: config.temperature ?? 0.7,
                        maxOutputTokens: config.maxTokens ?? 1024,
                        response_mime_type: config.responseMimeType ?? "application/json"
                    }
                };
            } else {
                // OpenAI-compatible
                url = CONFIG.GEMINI.OPENAI_ENDPOINT;
                headers['Authorization'] = `Bearer ${apiKey}`;
                headers['HTTP-Referer'] = 'https://devvit.reddit.com';
                headers['X-Title'] = 'StreaxChamp';
                body = {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: config.temperature ?? 0.7,
                    max_tokens: config.maxTokens ?? 1024,
                    response_format: config.responseMimeType === "application/json" ? { type: "json_object" } : undefined
                };
            }

            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!resp.ok) {
                const errText = await resp.text();
                const status = resp.status;

                // Detailed Error Classification
                if (status === 429) {
                    Logger.error(`[AIService] QUOTA EXCEEDED (429) for provider=${provider}`);
                    throw new AIQuotaError(provider, `Rate limit exceeded (429)`);
                }
                if (status === 404) {
                    throw new AIModelNotFoundError(model, `Model not found (404) - check model name or URL`);
                }
                if (status === 401 || status === 403) {
                    throw new Error(`Authentication failed (${status}) for provider=${provider}`);
                }
                if (errText.includes('2 UNKNOWN') || errText.includes('Method not found')) {
                    throw new AIModelNotFoundError(model, `Google '2 UNKNOWN' error (Method not found). Likely invalid model or endpoint.`);
                }

                // Generic AI Error
                throw new Error(`[AIService] HTTP ${status}: ${errText.slice(0, 500)}`);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = await resp.json();
            const latencyMs = Date.now() - start;
            let text = '';

            if (provider === 'google') {
                text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
                text = data?.choices?.[0]?.message?.content || '';
            }

            if (!text) {
                throw new Error('Empty response content from AI provider');
            }

            return { text, model, latencyMs };

        } catch (e: any) {
            clearTimeout(timeout);

            // 1. Handle Known Types
            if (e instanceof AIQuotaError || e instanceof AIModelNotFoundError) {
                throw e;
            }

            // 2. Handle gRPC/Devvit Wrapped Errors (e.g. "2 UNKNOWN")
            const errorStr = String(e.message || e.details || e);
            if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Quota exceeded')) {
                let delayInfo = '';
                const match = errorStr.match(/retry in ([\d.]+)s/i);
                if (match) delayInfo = ` (Retry in ${match[1]}s)`;

                Logger.error(`[AIService] RATE LIMIT DETECTED in error string: ${errorStr.slice(0, 300)}`);
                throw new AIQuotaError(provider, `Gemini Rate Limit Exceeded${delayInfo}`);
            }

            Logger.error(`[AIService] Unexpected error: ${e.message}`);
            throw new Error(`[AIService] Call failed: ${e.message}`);
        }
    }
}
