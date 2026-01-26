/**
 * Zod schemas for Quiz-related validation
 * Used for runtime validation of API requests and responses
 */
import { z } from 'zod';

// Question difficulty enum
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);

// Question schema
export const QuestionSchema = z.object({
    id: z.string(),
    question: z.string().min(1),
    options: z.array(z.string()).min(2).max(6),
    correctAnswer: z.number().int().nonnegative(),
    explanation: z.string().optional(),
    category: z.string().optional(),
    difficulty: DifficultySchema.optional().default('medium'),
});

// Quiz metadata
export const QuizMetadataSchema = z.object({
    generatedAt: z.string(),
    sourceWikis: z.array(z.string()),
    version: z.string(),
    generator: z.enum(['gemini', 'fallback']),
    model: z.string().optional(),
});

// Generated quiz payload
export const GeneratedQuizSchema = z.object({
    questions: z.array(QuestionSchema).min(1),
    metadata: QuizMetadataSchema,
});

// Bonus question
export const BonusQuestionSchema = z.object({
    question: z.string(),
    options: z.array(z.string()).min(2),
    correctIndex: z.number().int().nonnegative(),
});

// Topic quiz response
export const TopicQuizResponseSchema = z.object({
    fromCache: z.boolean(),
    saved: z.boolean().optional(),
    quiz: GeneratedQuizSchema,
    bonus: BonusQuestionSchema.nullable().optional(),
    reason: z.string().optional(),
});

// Leaderboard entry
export const LeaderboardEntrySchema = z.object({
    userKey: z.string(),
    nickname: z.string(),
    score: z.number().int(),
    timeTakenMs: z.number().int().nonnegative(),
    submittedAt: z.string().optional(),
    rank: z.number().int().positive().optional(),
});

// Leaderboard submit request
export const LeaderboardSubmitSchema = z.object({
    slug: z.string().min(1),
    userKey: z.string().min(1),
    nickname: z.string().min(1),
    score: z.number().int(),
    timeTakenMs: z.number().int().nonnegative(),
});

// Export types derived from schemas
export type QuestionType = z.infer<typeof QuestionSchema>;
export type GeneratedQuizType = z.infer<typeof GeneratedQuizSchema>;
export type TopicQuizResponseType = z.infer<typeof TopicQuizResponseSchema>;
export type LeaderboardEntryType = z.infer<typeof LeaderboardEntrySchema>;
