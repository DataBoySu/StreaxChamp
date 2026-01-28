import { useState, useEffect } from 'react';

export interface AppQuestion {
  question: string;
  answers: string[];
  correctAnswer: string;
  difficulty?: string;
  category?: string;
  explanation?: string | undefined;
}

export interface QuizMetadata {
  generatedAt: string;
  topic: string;
  difficulty: string;
  source: string;
}

export interface DailyQuiz {
  id: string;
  questions: AppQuestion[];
  metadata: QuizMetadata;
}

export interface UseQuizDataResult {
  questions: AppQuestion[];
  quiz: DailyQuiz | null;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'firebase' | 'fallback' | 'error';
  lastUpdated: string | null;
  refetch: () => Promise<void>;
}

export const useQuizData = (): UseQuizDataResult => {
  const [questions, setQuestions] = useState<AppQuestion[]>([]);
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'firebase' | 'fallback' | 'error'
  >('connecting');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      // Fetch via internal API (avoids CSP blocked external Firestore origin)
      const apiRes = await fetch('/api/quiz', { headers: { 'Content-Type': 'application/json' } });
      if (!apiRes.ok) throw new Error('Quiz API failed');
      const raw = await apiRes.json();
      if (!raw || !Array.isArray(raw.questions)) throw new Error('Malformed quiz payload');

      interface ApiQuestion { question?: string; options?: unknown[]; correctAnswer?: string; difficulty?: string; }
      const mapped: AppQuestion[] = (raw.questions as ApiQuestion[]).map((q) => {
        // Robust validation: Server SHOULD provide 'options', but cached Daily Quizzes might use 'answers'
        // We accept either to ensure today's cached quiz (generated before the prompt fix) still loads.
        const rawOptions = q.options || (q as any).answers;
        const ans = Array.isArray(rawOptions) ? rawOptions.map(a => String(a)) : [];

        // Handle correct Answer: support both string match (preferred) and legacy/AI numeric index
        let corr = '';
        if (typeof q.correctAnswer === 'number' && ans[q.correctAnswer]) {
          corr = ans[q.correctAnswer] || '';
        } else if (typeof q.correctAnswer === 'string') {
          // Try exact match first, then fallback
          corr = ans.includes(q.correctAnswer) ? q.correctAnswer : '';
        }

        // Final fallback: if no valid correct answer found, use first option (prevent crash, effectively makes Q1 correct)
        if (!corr && ans.length > 0) corr = ans[0] || '';
        return {
          question: String(q.question || ''),
          answers: ans,
          correctAnswer: corr,
          difficulty: q.difficulty || 'medium',
          category: raw.metadata?.topic || 'General',
        };
      });

      const quizData: DailyQuiz = {
        id: raw.id || 'daily',
        questions: mapped,
        metadata: {
          generatedAt: raw.metadata?.generatedAt || new Date().toISOString(),
          topic: raw.metadata?.topic || 'General Knowledge',
          difficulty: raw.metadata?.difficulty || 'mixed',
          source: raw.metadata?.source || 'internal',
        },
      };

      setQuiz(quizData);
      setConnectionStatus('firebase'); // treat internal API as authoritative
      setLastUpdated(quizData.metadata.generatedAt);
      setQuestions(quizData.questions);
      return;
    } catch (err) {
      // Update state for failed quiz retrieval
      setConnectionStatus('error');
      // Set a friendly but firm error message
      setError('System Unavailable: Daily Quiz could not be loaded.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchQuizData();
  };

  useEffect(() => {
    void fetchQuizData();
  }, []);

  return {
    questions,
    quiz,
    loading,
    error,
    connectionStatus,
    lastUpdated,
    refetch,
  };
};
