/**
 * Zod schemas for Topic-related validation
 * Used for runtime validation of API requests and responses
 */
import { z } from 'zod';

// Topic status enum
export const TopicStatusSchema = z.enum(['ready', 'generating', 'stale', 'error']);

// Topic schema
export const TopicSchema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    sources: z.array(z.string().url()).default([]),
    createdAt: z.string().optional(),
    status: TopicStatusSchema.optional().default('ready'),
    hasQuiz: z.boolean().optional(),
    lastQuizDate: z.string().optional(),
    lastGenerated: z.string().optional(),
    playCount: z.number().int().nonnegative().optional(),
    contextSnippet: z.string().optional(),
    model: z.string().optional(),
});

// Topic generation request
export const TopicGenerateRequestSchema = z.object({
    topic: z.string().min(1, 'Topic is required'),
    userKey: z.string().optional(),
});

// Topic generation response
export const TopicGenerateResponseSchema = z.object({
    title: z.string(),
    slug: z.string(),
    sources: z.array(z.string()),
    saved: z.boolean(),
    provider: z.enum(['gemini', 'fallback']),
    fallbackReason: z.string().optional(),
    model: z.string().optional(),
    latencyMs: z.number().optional(),
});

// Topic quiz request
export const TopicQuizRequestSchema = z.object({
    force: z.boolean().optional().default(false),
});

// Export types derived from schemas
export type TopicSchemaType = z.infer<typeof TopicSchema>;
export type TopicGenerateRequestType = z.infer<typeof TopicGenerateRequestSchema>;
export type TopicGenerateResponseType = z.infer<typeof TopicGenerateResponseSchema>;
