// Firebase client service for Devvit App
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from 'firebase/firestore';

// Firebase config (replace with your project's config from Firebase Console)
const firebaseConfig = {
  apiKey: 'AIzaSyAidW2UYWKJt-s6OXs7A9JGoMaXL-LkT9c',
  authDomain: 'streax-bot-local.firebaseapp.com',
  projectId: 'streax-bot-local',
  storageBucket: 'streax-bot-local.firebasestorage.app',
  messagingSenderId: '843988437750',
  appId: '1:843988437750:web:02cd46061ab366eb3b7ad7',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: string;
  category: string;
  explanation?: string;
  createdAt: string;
}

export interface DailyQuiz {
  id: string;
  date: string;
  questions: QuizQuestion[];
  metadata: {
    generatedAt: string;
    sourceWikis: string[];
    version: string;
  };
  uploadedAt: string | number | null;
}

export interface UserScore {
  username: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeRemaining: number;
  submittedAt: string;
}

export class FirebaseQuizService {
  async getTodaysQuiz(): Promise<DailyQuiz | null> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const quizzesRef = collection(db, 'daily-quizzes');
    const quizDoc = doc(quizzesRef, today);
    const docSnap = await getDoc(quizDoc);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data) {
        return { id: docSnap.id, ...data } as DailyQuiz;
      }
    }

    // If no quiz for today, get the latest quiz
    return this.getLatestQuiz();
  }

  // Fetch list of saved topics from server-side endpoint
  async getTopics(): Promise<Array<{ title: string; slug: string; sources?: string[] }>> {
    try {
      const res = await fetch('/api/topics', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];
      return (await res.json()) || [];
    } catch (e) {
      return [];
    }
  }

  // Request server to generate a topic: server will call Gemini and write Firestore
  async requestTopicGeneration(topicName: string): Promise<any> {
    try {
      const res = await fetch('/api/topics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicName }),
      });
      if (!res.ok) throw new Error('Generation request failed');
      return await res.json();
    } catch (e) {
      console.error('requestTopicGeneration error', e);
      throw e;
    }
  }

  async getTopic(slug: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/topics/${encodeURIComponent(slug)}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async getLatestQuiz(): Promise<DailyQuiz | null> {
    const quizzesRef = collection(db, 'daily-quizzes');
    const q = query(quizzesRef, orderBy('uploadedAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      if (doc) {
        const data = doc.data();
        if (data) {
          return { id: doc.id, ...data } as DailyQuiz;
        }
      }
    }

    return null;
  }

  async getQuizById(quizId: string): Promise<DailyQuiz | null> {
    const quizzesRef = collection(db, 'daily-quizzes');
    const quizDoc = doc(quizzesRef, quizId);
    const docSnap = await getDoc(quizDoc);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data) {
        return { id: docSnap.id, ...data } as DailyQuiz;
      }
    }

    return null;
  }

  async submitScore(quizId: string, userScore: UserScore): Promise<string> {
    const scoresRef = collection(db, 'quiz-scores');
    const docRef = await addDoc(scoresRef, {
      quizId,
      ...userScore,
      submittedAt: new Date().toISOString(),
    });

    // Score submitted
    return docRef.id;
  }

  async getLeaderboard(quizId: string, limitCount: number = 10): Promise<UserScore[]> {
    const scoresRef = collection(db, 'quiz-scores');
    const q = query(
      scoresRef,
      where('quizId', '==', quizId),
      orderBy('score', 'desc'),
      orderBy('submittedAt', 'asc'), // Earlier submission wins ties
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as UserScore);
  }

  async getUserScore(quizId: string, username: string): Promise<UserScore | null> {
    const scoresRef = collection(db, 'quiz-scores');
    const q = query(
      scoresRef,
      where('quizId', '==', quizId),
      where('username', '==', username),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty && querySnapshot.docs[0]) {
      const data = querySnapshot.docs[0].data();
      if (data) {
        return data as UserScore;
      }
    }

    return null;
  }

  // Request (generate or fetch) today's quiz for a specific topic via server REST endpoint
  async getOrGenerateTopicQuiz(topicSlug: string): Promise<any> {
    try {
      const res = await fetch(`/api/topics/${encodeURIComponent(topicSlug)}/quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(`Quiz generation failed (${res.status})`);
      return await res.json();
    } catch (e) {
      console.error('getOrGenerateTopicQuiz error', e);
      throw e;
    }
  }

  // Convert Firestore question format to app format
  convertToAppFormat(firebaseQuiz: DailyQuiz) {
    return firebaseQuiz.questions.map((q) => ({
      question: q.question,
      answers: q.options,
      correctAnswer: q.options[q.correctAnswer] || q.options[0] || 'Unknown', // Ensure we always have a string
      difficulty: q.difficulty || 'medium',
      category: q.category || 'Gaming',
      explanation: q.explanation,
    }));
  }
}

// Export singleton instance
export const firebaseQuizService = new FirebaseQuizService();
