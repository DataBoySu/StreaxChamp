// DO NOT DELETE THIS FILE.
// Future plans exist for this pipeline.
import { Logger } from '../Logger';
import { CONFIG } from '../../shared/constants';
import { AppError } from '../utils/AppError';
import { validateGeminiKey } from './GeminiService';

/**
 * Service to interact specifically with Gemma models via the Gemini API.
 * Gemma has subtle differences in behavior and reliability with structured JSON outputs,
 * so this pipeline is specialized for text-heavy or chat tasks like the Robot.
 */

// Helper to sanitize JSON from potential markdown blocks in Gemma output
function cleanGemmaOutput(text: string): string {
    return text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
}

export async function generateGemmaRobotLines(): Promise<string[]> {
    await validateGeminiKey();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw AppError.aiFailure('NO_API_KEY');

    const model = CONFIG.GEMMA.MODEL_ID;
    const sysPrompt = CONFIG.ROBOT.PROMPTS.SYSTEM;

    Logger.ai(`[GemmaPipeline] Generating Robot Lines`, { model });

    try {
        const resp = await fetch(
            CONFIG.GEMMA.API_ENDPOINT_TEMPLATE.replace('{model}', model) + `?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Gemma generally performs better with system instructions baked into user or system role if supported
                    // But v1beta API supports system_instruction for newer models. We will try standard way first.
                    contents: [{
                        role: 'user',
                        parts: [{ text: `INSTRUCTIONS:\n${sysPrompt}\n\nIMPORTANT: Return ONLY raw JSON. No markdown fences. No conversational filler.\n\nTASK:\nGenerate the lines now.` }]
                    }],
                    generationConfig: {
                        temperature: 1.1,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Gemma API Error ${resp.status}: ${errText.slice(0, 200)}`);
        }

        const data: any = await resp.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Gemma might wrap in markdown or be chatty despite JSON enforcement
        const cleanedJson = cleanGemmaOutput(rawText);
        let parsed: { lines: string[] };

        try {
            parsed = JSON.parse(cleanedJson);
        } catch (e) {
            Logger.warn('[GemmaPipeline] JSON Parse Fail, attempting fallback regex', { raw: rawText });
            // Fallback: simple line extraction if JSON fails
            const lines = rawText.split('\n').filter((l: string) => l.length > 5 && l.length < 100).slice(0, 5);
            return lines;
        }

        if (parsed && Array.isArray(parsed.lines)) {
            return parsed.lines.slice(0, 10);
        }

        return [];
    } catch (e) {
        Logger.error('[GemmaPipeline] Gen Failed', e);
        throw e; // Propagate for health check to see
    }
}
