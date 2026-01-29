export interface User {
  userId: string; // Devvit context user id e.g. t2_xxx
  nickname: string; // immutable chosen nickname
  createdAt: string; // ISO timestamp
  interests?: string[]; // optional future expansion
  quizCount?: number; // number of quizzes played (denormalized)
  totalScore?: number; // total points across all quizzes
  streak?: number; // current daily streak
  lastActiveAt?: string; // ISO timestamp
}

export interface UserResolveResponse {
  found: boolean;
  user?: User;
}

export interface SignupRequestBody {
  userId: string;
  nickname: string;
}

export interface SignupResponse {
  ok: boolean;
  user?: User;
  error?: string;
  reason?: string;
}
