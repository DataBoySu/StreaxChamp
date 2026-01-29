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
import { CONFIG } from '../../shared/constants';

const firebaseConfig = {
  apiKey: CONFIG.FIREBASE.API_KEY,
  authDomain: CONFIG.FIREBASE.AUTH_DOMAIN,
  projectId: CONFIG.FIREBASE.PROJECT_ID,
  storageBucket: CONFIG.FIREBASE.STORAGE_BUCKET,
  messagingSenderId: CONFIG.FIREBASE.MESSAGING_SENDER_ID,
  appId: CONFIG.FIREBASE.APP_ID,
};

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

/**
 * Client-side service for interacting with Firebase Firestore directly.
 * Handles fetching daily quizzes and submitting/reading leaderboard scores.
 */
export class FirebaseQuizService {
  /**
   * Fetches the quiz for the current date or falls back to the latest available quiz.
   */
  async getTodaysQuiz(): Promise<DailyQuiz | null> {
    const today = new Date().toISOString().split('T')[0];
    const quizzesRef = collection(db, 'daily-quizzes');
    const quizDoc = doc(quizzesRef, today);
    const docSnap = await getDoc(quizDoc);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data) return { id: docSnap.id, ...data } as DailyQuiz;
    }
    return this.getLatestQuiz();
  }

  /**
   * Retrieves all available topics from the server.
   */
  async getTopics(): Promise<Array<{ title: string; slug: string; sources?: string[] }>> {
    try {
      const res = await fetch('/api/topics', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return [];
      return (await res.json()) || [];
    } catch {
      return [];
    }
  }

  /**
   * Requests the server to generate a new topic via Gemini.
   */
  async requestTopicGeneration(topicName: string): Promise<any> {
    try {
      const res = await fetch('/api/topics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicName }),
      });
      if (!res.ok) throw new Error('Generation failed');
      return await res.json();
    } catch (e) {
      console.error('requestTopicGeneration error', e);
      throw e;
    }
  }

  /**
   * Fetches a specific topic's metadata.
   */
  async getTopic(slug: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/topics/${encodeURIComponent(slug)}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetches the most recently uploaded daily quiz.
   */
  async getLatestQuiz(): Promise<DailyQuiz | null> {
    const quizzesRef = collection(db, 'daily-quizzes');
    const q = query(quizzesRef, orderBy('uploadedAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const d = querySnapshot.docs[0];
      if (d) {
        const data = d.data();
        if (data) return { id: d.id, ...data } as DailyQuiz;
      }
    }
    return null;
  }

  /**
   * Submits a user's score to the global quiz-scores collection.
   */
  async submitScore(quizId: string, userScore: UserScore): Promise<string> {
    const scoresRef = collection(db, 'quiz-scores');
    const docRef = await addDoc(scoresRef, {
      quizId,
      ...userScore,
      submittedAt: new Date().toISOString(),
    });
    return docRef.id;
  }

  /**
   * Fetches the leaderboard for a specific quiz.
   */
  async getLeaderboard(quizId: string, limitCount: number = 10): Promise<UserScore[]> {
    const scoresRef = collection(db, 'quiz-scores');
    const q = query(
      scoresRef,
      where('quizId', '==', quizId),
      orderBy('score', 'desc'),
      orderBy('submittedAt', 'asc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as UserScore);
  }

  /**
   * Requests a topic-specific quiz from the server.
   */
  async getOrGenerateTopicQuiz(topicSlug: string, username?: string): Promise<any> {
    try {
      const qs = username ? `?username=${encodeURIComponent(username)}` : '';
      const res = await fetch(`/api/topics/${encodeURIComponent(topicSlug)}/quiz${qs}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(`Quiz generation failed (${res.status})`);
      return await res.json();
    } catch (e) {
      console.error('getOrGenerateTopicQuiz error', e);
      throw e;
    }
  }

  /**
   * Utility to map Firestore question structure to the client-facing format.
   */
  convertToAppFormat(firebaseQuiz: DailyQuiz) {
    return firebaseQuiz.questions.map((q) => ({
      question: q.question,
      answers: q.options,
      correctAnswer: q.options[q.correctAnswer] || q.options[0] || 'Unknown',
      difficulty: q.difficulty || 'medium',
      category: q.category || 'General',
      explanation: q.explanation,
    }));
  }
}

export const firebaseQuizService = new FirebaseQuizService();
