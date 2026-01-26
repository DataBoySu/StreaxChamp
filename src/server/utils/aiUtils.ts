/**
 * Utility functions for processing AI responses
 */

// Attempt to extract the first valid JSON object/array from an LLM response string.
export function extractJSONCandidate(text: string): unknown | null {
    if (!text || typeof text !== 'string') return null;

    // Prefer fenced blocks (accept ```json or ```)
    const fenceMatch = text.match(/```(?:\s*json)?\s*([\s\S]*?)```/i);
    const rawCandidate = fenceMatch && fenceMatch[1] ? String(fenceMatch[1]) : String(text);

    // Remove per-line Devvit/log prefixes that might be baked into the string if logged improperly
    const raw = rawCandidate
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:\[[A-Z0-9_-]+\]|DEVVIT)\s*/i, ''))
        .join('\n')
        // Also remove any remaining markdown code block markers if the fence regex missed them
        .replace(/^```[a-z]*\s*/i, '')
        .replace(/\s*```$/i, '');

    // Try direct parse first
    try { return JSON.parse(raw.trim()); } catch (e) { /* fall through */ }

    // Find first '{' or '[' and attempt to find a balanced JSON substring
    const idx1 = raw.indexOf('{');
    const idx2 = raw.indexOf('[');
    let idx = -1;
    if (idx1 === -1) idx = idx2;
    else if (idx2 === -1) idx = idx1;
    else idx = Math.min(idx1, idx2);
    if (idx === -1) return null;
    const slice = raw.slice(idx);

    const stack: string[] = [];
    for (let i = 0; i < slice.length; i++) {
        const ch = slice[i];
        if (ch === '{' || ch === '[') {
            stack.push(ch);
        } else if (ch === '}' || ch === ']') {
            const last = stack[stack.length - 1];
            if ((ch === '}' && last === '{') || (ch === ']' && last === '[')) {
                stack.pop();
                if (stack.length === 0) {
                    const candidate = slice.slice(0, i + 1);
                    try { return JSON.parse(candidate); } catch (err) { break; }
                }
            } else {
                break;
            }
        }
    }
    return null;
}

export function sanitizeLines(lines: string[]): string[] {
    const cleaned = lines
        .map((s) => String(s || '').replace(/\*|`|^\d+\.|^-\s+/g, '').slice(0, 80))
        .filter((s) => s);
    return cleaned;
}
