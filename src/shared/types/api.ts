// Shared API types for the Streax Bot application
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface DailyQuiz {
  id: string;
  date: string;
  questions: Question[];
  title: string;
  description?: string;
}

export interface UserScore {
  userId: string;
  username: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
  quizDate: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
}

// LeaderboardResponse is an array of leaderboard entries
export type LeaderboardResponse = LeaderboardEntry[];

export interface QuizStatus {
  hasCompletedToday: boolean;
  lastCompletedDate?: string;
  currentStreak: number;
  bestStreak: number;
  totalQuizzesCompleted: number;
}

export interface CompleteQuizRequest {
  answers?: number[];
  timeSpent?: number;
  score?: number; // For legacy compatibility
}

export interface CompleteQuizResponse {
  score: number;
  totalQuestions: number;
  accuracy: number;
  newStreak: number;
  bestStreak: boolean;
}

// Counter API types (for compatibility)
export interface InitResponse {
  type: 'init';
  postId: string;
  username: string | null;
}

export interface IncrementResponse {
  count: number;
}

export interface DecrementResponse {
  count: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User info
export interface UserInfo {
  id: string;
  username: string;
  karma?: number;
  accountAge?: number;
}

// Quiz configuration
export interface QuizConfig {
  wikiUrl: string;
  enabled: boolean;
  scheduleTime: string; // HH:MM format
  maxQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Legacy types (keeping for compatibility)
export type QuizStatusResponse = {
  hasPlayed: boolean;
};

export type CompleteQuizRequestLegacy = {
  score: number;
};

export type LeaderboardEntryLegacy = {
  member: string;
  score: number;
};

export type LeaderboardResponseLegacy = LeaderboardEntry[];
