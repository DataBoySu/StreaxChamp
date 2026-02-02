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
  hasCompleted: boolean; // NEW
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'firebase' | 'fallback' | 'error';
  lastUpdated: string | null;
  refetch: (date?: string) => Promise<void>;
}

export const useQuizData = (contextPostId?: string | null, date?: string): UseQuizDataResult => {
  const [questions, setQuestions] = useState<AppQuestion[]>([]);
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false); // NEW
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
      // Deep Reset: Clear previous data immediately to prevent stale renders
      setQuestions([]);
      setQuiz(null);
      setHasCompleted(false);
      // Fetch via internal API (avoids CSP blocked external Firestore origin)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (contextPostId) {
        headers['x-devvit-post-id'] = contextPostId;
        console.log('[useQuizData] Fetching with context PostID:', contextPostId);
      }

      const url = date ? `/api/quiz?date=${date}` : '/api/quiz';
      const apiRes = await fetch(url, { headers });
      if (!apiRes.ok) throw new Error('Quiz API failed');
      const payload = await apiRes.json();

      // Support new structure { quiz: ..., hasCompleted: ... } or fallback for legacy
      const raw = payload.quiz || payload; // If nested 'quiz', use it, otherwise assume payload IS the quiz
      const completedStatus = payload.hasCompleted || false;

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
          explanation: (q as any).explanation // Ensure explanation is passed
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
      setHasCompleted(completedStatus);
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



  const refetch = async (newDate?: string) => {
    // If we support dynamic switching, we might need a way to update the 'date' state if we had it,
    // but here the date comes from props. 'refetch' normally just re-runs with current props.
    // However, if the user explicitly asks for a new date, we should probably support it.
    // For now, let's just re-run standard fetch.
    await fetchQuizData();
  };

  useEffect(() => {
    console.log('[useQuizData] Effect triggered. PostID:', contextPostId, 'Date:', date);
    void fetchQuizData();
  }, [contextPostId, date]);

  return {
    questions,
    quiz,
    hasCompleted,
    loading,
    error,
    connectionStatus,
    lastUpdated,
    refetch,
  };
};
