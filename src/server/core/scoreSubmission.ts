import { z } from 'zod';

const quizSubmissionSchema = z
  .object({
    quizId: z.string().min(1).max(128).regex(/^[^/]+$/),
    answers: z.array(z.number().int().min(0).max(3).nullable()).length(5),
    timeTakenMs: z.number().int().min(0).max(30 * 60 * 1000).optional().default(0),
    postId: z.string().regex(/^t3_[A-Za-z0-9]+$/).optional(),
  })
  .strict();

const shareRequestSchema = z
  .object({
    postId: z.string().regex(/^t3_[A-Za-z0-9]+$/),
    quizId: z.string().min(1).max(128).regex(/^[^/]+$/),
    text: z.string().trim().min(1).max(500),
  })
  .strict();

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

type CanonicalQuestion = {
  answers?: readonly string[];
  options?: readonly string[];
  correctAnswer: number | string;
};

export const parseQuizSubmission = (input: unknown) => quizSubmissionSchema.safeParse(input);
export const parseShareRequest = (input: unknown) => shareRequestSchema.safeParse(input);

export const calculateQuizScore = (
  questions: readonly CanonicalQuestion[],
  answers: readonly (number | null)[]
): { score: number; totalQuestions: number } => {
  if (questions.length !== answers.length) {
    throw new Error('ANSWER_COUNT_MISMATCH');
  }

  const score = questions.reduce((total, question, index) => {
    const options = question.options ?? question.answers ?? [];
    const correctIndex =
      typeof question.correctAnswer === 'number'
        ? question.correctAnswer
        : options.indexOf(question.correctAnswer);
    return total + (correctIndex >= 0 && answers[index] === correctIndex ? 1 : 0);
  }, 0);

  return { score, totalQuestions: questions.length };
};
