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

      interface ApiQuestion { question?: string; answers?: unknown[]; correctAnswer?: string; difficulty?: string; }
      const mapped: AppQuestion[] = (raw.questions as ApiQuestion[]).map((q) => {
        const ans = Array.isArray(q.answers) ? q.answers.map(a => String(a)) : [];
        const corr = q.correctAnswer && ans.includes(q.correctAnswer) ? q.correctAnswer : ans[0] || '';
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
      // Failed to fetch quiz data - fall back to curated questions

      // Use fallback questions
  setConnectionStatus('fallback');
      setError(null); // Don't show error for expected behavior
      setLastUpdated(new Date().toISOString());

      // Enhanced fallback questions - these are still great questions!
      const mockQuestions: AppQuestion[] = [
        {
          question:
            "In the Souls series, what is the name of the 'Lord of Cinder' who links the fire in the first game?",
          answers: ['Gwyn', 'Artorias', 'Sif', 'Havel'],
          correctAnswer: 'Gwyn',
          difficulty: 'medium',
          category: 'Gaming Lore',
        },
        {
          question:
            "What is the capital of the fictional kingdom of Hyrule in 'The Legend of Zelda' series?",
          answers: ['Kakariko Village', 'Hyrule Castle Town', 'Korok Forest', "Zora's Domain"],
          correctAnswer: 'Hyrule Castle Town',
          difficulty: 'easy',
          category: 'Gaming Lore',
        },
        {
          question: "Who is the main protagonist of the 'Mass Effect' series?",
          answers: ['Commander Shepard', 'Garrus Vakarian', "Liara T'Soni", "Tali'Zorah"],
          correctAnswer: 'Commander Shepard',
          difficulty: 'easy',
          category: 'Gaming Characters',
        },
        {
          question:
            "What is the name of the protagonist's ship in 'Star Wars: Knights of the Old Republic'?",
          answers: ['Ebon Hawk', 'Millennium Falcon', 'Slave I', 'Razor Crest'],
          correctAnswer: 'Ebon Hawk',
          difficulty: 'medium',
          category: 'Gaming Items',
        },
        {
          question:
            "In the world of 'Warhammer 40,000', what is the name of the Emperor's elite bodyguards?",
          answers: ['Adeptus Custodes', 'Space Marines', 'Inquisition', 'Astra Militarum'],
          correctAnswer: 'Adeptus Custodes',
          difficulty: 'hard',
          category: 'Gaming Lore',
        },
      ];

      setQuestions(mockQuestions);
      // Using curated gaming questions as fallback
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
