import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TopicSelector from './components/topic/TopicSelector';
import { motion, AnimatePresence } from 'framer-motion';
// import { LeaderboardResponse } from '../shared';
import { useTheme } from './hooks/useTheme';
import { useQuizData } from './hooks/useQuizData';
import { useUsername } from './hooks/useUsername';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useLandingSummary } from './hooks/useLandingSummary';
import { CONFIG } from '../shared/constants';
import { SplashScreen } from './components/splash/SplashScreen';
import { LandingHero } from './components/landing/LandingHero';
import { QuizActiveView } from './components/quiz/QuizActiveView';
import { QuizResult } from './components/quiz/QuizResult';
import { GapView } from './components/quiz/GapView';
import { BonusQuestionView } from './components/quiz/BonusQuestionView';
import { firebaseQuizService } from './services/FirebaseQuizService';
import { NoTopicPrompt } from './components/modals/NoTopicPrompt';
import { GameSidebar } from './components/dashboard/GameSidebar';
import { GlobalDashboard } from './components/dashboard/GlobalDashboard';
import { MessageDisplay } from './components/ui/MessageDisplay';

const QUIZ_DURATIONS = Array(CONFIG.GAME.DEFAULT_QUESTIONS_COUNT).fill(CONFIG.GAME.TIMER_DURATION);
const BONUS_QUIZ_DURATION = CONFIG.GAME.BONUS_TIMER_DURATION;
const NUM_QUESTIONS = CONFIG.GAME.DEFAULT_QUESTIONS_COUNT;

/**
 * Main Application Component for StreaxChamp.
 * Orchestrates the quiz game loop, theme management, user authentication, and landing experience.
 * Features a dynamic mascot, progressive difficulty, and integrated leaderboards.
 */
export const App = () => {
  const theme = useTheme();
  // Daily quiz (fallback) hook
  const { questions: dailyQuestions, quiz: dailyQuiz, loading } = useQuizData();

  const [showSplash, setShowSplash] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [consecutiveCorrectAnswers, setConsecutiveCorrectAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '', timesUp: false });
  const [showBonusQuestion, setShowBonusQuestion] = useState(false);
  const [bonusQuestion, setBonusQuestion] = useState<{ question: string; answers: string[]; correctAnswer: string } | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [timer, setTimer] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  // Topic-specific leaderboard state
  const [multiplier, setMultiplier] = useState(0);
  const [showGap, setShowGap] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [bonusAnswered, setBonusAnswered] = useState(false);
  const [history, setHistory] = useState<{ id: string; slug: string; title: string; score: number; ts: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // User session state (deprecated)
  const [userInfo, setUserInfo] = useState<{ userId: string | null; username: string | null; displayName: string | null } | null>(null);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<{ title: string; slug: string } | null>(null);
  interface SelectedTopicQuiz { id?: string | undefined; questions?: { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string }[]; bonus?: { question: string; options: string[]; correctIndex: number } | null }
  const [selectedTopicQuiz, setSelectedTopicQuiz] = useState<SelectedTopicQuiz | null>(null);
  const [topicQuizStatus, setTopicQuizStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [showNoTopicPrompt, setShowNoTopicPrompt] = useState(false);
  const [usingRandomFallback, setUsingRandomFallback] = useState(false);
  const [authUser, setAuthUser] = useState<{ redditUsername: string; nickname: string } | null>(() => {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.redditUsername && parsed.nickname) return parsed;
      }
    } catch {/* ignore */ }
    return null;
  });

  // Background music state
  const [musicOn, setMusicOn] = useState<boolean>(() => {
    try { const v = localStorage.getItem(CONFIG.STORAGE_KEYS.MUSIC); return v === 'on'; } catch { return false; }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.MUSIC, musicOn ? 'on' : 'off'); } catch {/* ignore */ }
    const a = audioRef.current;
    if (!a) return;
    if (musicOn) {
      // play only after user interaction; catch autoplay errors silently
      const playAttempt = a.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(() => {/* autoplay blocked */ });
      }
    } else {
      try { a.pause(); } catch {/* ignore */ }
    }
  }, [musicOn]);

  // Leaderboard hook (per selected topic)
  // Enable leaderboard as soon as quiz ends (showScore) or while viewing start screen for previously selected topic
  const { entries: topicLeaderboard, loading: topicLbLoading, submitScore: submitLeaderboardScore, refresh: refreshTopicLeaderboard } = useLeaderboard({ slug: selectedTopic?.slug || null, enabled: !!selectedTopic && (showScore || !quizStarted) });
  const { data: landingSummary, loading: landingSummaryLoading } = useLandingSummary(!quizStarted && !showScore);
  const { username: hookUsername } = useUsername();

  // No manual sign-in logic needed

  // Fetch history from server when authenticated
  const refreshHistory = useCallback(async () => {
    if (!authUser?.redditUsername) return;
    setHistoryLoading(true);
    try {
      const resp = await fetch(`/api/history/${encodeURIComponent(authUser.redditUsername)}`);
      const json = await resp.json();
      if (resp.ok && json.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = (json.attempts || []).map((a: any) => ({ id: a.createdAt + ':' + a.slug, slug: a.slug, title: a.slug, score: a.score, ts: Date.parse(a.createdAt || '') || Date.now() }));
        setHistory(list);
      }
    } catch {/* ignore */ } finally { setHistoryLoading(false); }
  }, [authUser?.redditUsername]);
  useEffect(() => { if (authUser?.redditUsername) void refreshHistory(); }, [authUser?.redditUsername, refreshHistory]);

  // Derive active questions: prefer topic quiz if present
  interface TopicQuizQuestionRaw { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string; }
  const questions = useMemo(() => {
    if (!usingRandomFallback && selectedTopicQuiz && Array.isArray(selectedTopicQuiz.questions)) {
      return (selectedTopicQuiz.questions as TopicQuizQuestionRaw[]).map((q) => {
        const options: string[] = q.options || q.answers || [];
        let correct: string;
        if (typeof q.correctAnswer === 'number' && options[q.correctAnswer] !== undefined) correct = options[q.correctAnswer] ?? '';
        else if (typeof q.correctAnswer === 'string') correct = q.correctAnswer;
        else correct = options[0] || '';
        return { question: q.question || '', answers: options, correctAnswer: correct };
      });
    }
    return dailyQuestions;
  }, [selectedTopicQuiz, dailyQuestions, usingRandomFallback]);
  // username fetching/debugging removed


  // Helper function to get multiplier text
  const getMultiplierText = (level: number): string => {
    switch (level) {
      case 1:
        return 'Good';
      case 2:
        return 'Very Good';
      case 3:
        return 'Great';
      case 4:
        return 'Excellent';
      case 5:
        return 'AMAZING';
      default:
        return level > 5 ? 'LEGENDARY' : '';
    }
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Also apply class for compatibility
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Function to load user data from server (Implicit Auth)
  const loadUserData = async () => {
    try {
      // 1. Try context resolution first (most reliable in Devvit)
      const contextRes = await fetch('/api/context/user');
      if (contextRes.ok) {
        const cData = await contextRes.json();
        if (cData.userId) {
          const auth = { redditUsername: cData.userId, nickname: cData.username || cData.userId };
          setAuthUser(auth);
          setUserInfo({ userId: cData.userId, username: cData.userId, displayName: cData.username });
          return;
        }
      }

      // 2. Fallback to session check
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData);
      } else {
        setUserInfo({ userId: null, username: 'Guest', displayName: 'Guest' });
      }
    } catch {
      setUserInfo({ userId: null, username: 'Guest', displayName: 'Guest' });
    }
  };

  // username fetch debug removed

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void loadUserData();
  }, []);

  useEffect(() => {
    if (quizStarted && currentQuestionIndex < NUM_QUESTIONS && questions[currentQuestionIndex]) {
      const currentQuestion = questions[currentQuestionIndex];
      setCorrectAnswer(currentQuestion.correctAnswer);
      // clone answers array before shuffle to avoid mutating source reference
      setShuffledAnswers([...currentQuestion.answers].sort(() => Math.random() - 0.5));
      const durationIndex = Math.min(consecutiveCorrectAnswers, QUIZ_DURATIONS.length - 1);
      const duration = QUIZ_DURATIONS[durationIndex];
      if (duration) {
        setTotalTime(duration);
        startTimer(duration);
      }
    }
    // Intentionally not including startTimer/questions to avoid re-creating timers; behavior is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizStarted, currentQuestionIndex, consecutiveCorrectAnswers, questions]);

  // Cleanup effect - stop timer when quiz ends or component unmounts
  useEffect(() => {
    if (showScore) {
      // Quiz is complete, clear any running timers
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
      setTimerActive(false);
    }
  }, [showScore, timer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [timer]);

  // Timeout message for landing page
  useEffect(() => {
    let timeoutTimer: number | undefined;

    if (!quizStarted && !showScore) {
      // Show timeout message after user can see all hover messages (9 messages * 3 seconds + buffer)
      timeoutTimer = Number(
        window.setTimeout(() => {
          setShowTimeoutMessage(true);
        }, 30000)
      ); // Show message after 30 seconds
    } else {
      setShowTimeoutMessage(false);
    }

    return () => {
      if (typeof timeoutTimer !== 'undefined') clearTimeout(timeoutTimer);
    };
  }, [quizStarted, showScore]);

  // Stable refs for handlers and startTimer to avoid circular deps
  const handleAnswerRef = useRef<((selected: string | null, correct: string) => void) | null>(null);
  const handleBonusAnswerRef = useRef<((selected: string | null, correct: string) => void) | null>(
    null
  );
  const startTimerRef = useRef<((duration: number) => void) | null>(null);

  // completeQuiz must be defined before handlers that reference it
  const completeQuiz = useCallback(
    (_finalScore: number) => {
      // Clear any running timers immediately
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
      setTimerActive(false);
      setTimeLeft(0);
      // Firestore submission handled separately
    },
    [timer]
  );

  const handleAnswer = useCallback(
    (selected: string | null, correct: string) => {
      if (timer) clearInterval(timer);
      if (timer !== null) clearInterval(timer as unknown as number);
      setSelectedAnswer(selected);
      setCorrectAnswer(correct);

      const isCorrect = selected === correct;
      let newScore = score;

      const getProgressiveMessage = (consecutiveCount: number) => {
        switch (consecutiveCount) {
          case 1:
            return 'Correct!';
          case 2:
            return 'Good!';
          case 3:
            return 'Great!';
          case 4:
            return 'Excellent!';
          case 5:
            return 'Ammazza!';
          default:
            return consecutiveCount > 5 ? 'Unstoppable!' : 'Correct!';
        }
      };

      if (isCorrect) {
        newScore++;
        setScore(newScore);
        const newConsecutive = consecutiveCorrectAnswers + 1;
        setConsecutiveCorrectAnswers(newConsecutive);
        setMultiplier(newConsecutive);
        setTimeout(() => setMultiplier(0), 1500);
        setMessage({
          text: getProgressiveMessage(newConsecutive),
          type: 'success',
          timesUp: false,
        });
      } else {
        setConsecutiveCorrectAnswers(0);
        if (selected === null) {
          setMessage({ text: "Time's Up!", type: 'error', timesUp: true });
        } else {
          setMessage({ text: 'Incorrect!', type: 'error', timesUp: false });
        }
      }

      setTimeout(() => {
        setMessage({ text: '', type: '', timesUp: false });
        setSelectedAnswer(null);
        setCorrectAnswer(null);

        if (currentQuestionIndex + 1 >= NUM_QUESTIONS) {
          if (newScore === NUM_QUESTIONS && !showBonusQuestion && !showScore) {
            // Use embedded bonus from selectedTopicQuiz if present
            const embedded = (selectedTopicQuiz as SelectedTopicQuiz | null)?.bonus;
            if (embedded && embedded.options && embedded.options.length === 4) {
              const opts = embedded.options.slice(0, 4).map(o => String(o));
              const idx = Math.min(Math.max(embedded.correctIndex, 0), 3);
              setBonusQuestion({ question: embedded.question || 'Bonus', answers: opts, correctAnswer: String(opts[idx] || opts[0] || '') });
              setShowBonusQuestion(true);
              setTotalTime(BONUS_QUIZ_DURATION);
              startTimerRef.current?.(BONUS_QUIZ_DURATION);
            } else {
              setShowScore(true);
              completeQuiz(newScore);
            }
          } else if (!showBonusQuestion) {
            setShowScore(true);
            completeQuiz(newScore);
          }
        } else {
          setShowGap(true);
          setTimeout(() => {
            setShowGap(false);
            setCurrentQuestionIndex((prev) => prev + 1);
          }, 3000);
        }
      }, 1500);
    },
    [
      timer,
      score,
      consecutiveCorrectAnswers,
      currentQuestionIndex,
      showBonusQuestion,
      showScore,
      completeQuiz,
      selectedTopicQuiz,
    ]
  );

  const handleBonusAnswer = useCallback(
    (selected: string | null, correct: string) => {
      if (bonusAnswered) return;
      setBonusAnswered(true);
      if (timer) clearInterval(timer);
      setTimerActive(false);
      setSelectedAnswer(selected);
      setCorrectAnswer(correct);

      let finalScore = score;
      if (selected === correct) {
        finalScore++;
        setScore(finalScore);
        setMessage({ text: 'Bonus point!', type: 'success', timesUp: false });
      } else {
        if (selected === null) {
          setMessage({ text: "Time's Up! No bonus point.", type: 'error', timesUp: true });
        } else {
          setMessage({ text: 'No bonus point this time!', type: 'warning', timesUp: false });
        }
      }

      setTimeout(
        () => {
          setShowBonusQuestion(false);
          setShowScore(true);
          setMessage({ text: '', type: '', timesUp: false });
          completeQuiz(finalScore);
        },
        selected === null ? 1500 : 800
      );
    },
    [bonusAnswered, timer, score, completeQuiz]
  );

  // startTimer reads handler refs to avoid circular deps
  const startTimer = useCallback(
    (duration: number) => {
      if (timer) clearInterval(timer);
      setTimeLeft(duration);
      setTimerActive(true);
      const newTimer = window.setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(newTimer);
            setTimerActive(false);
            if (showScore) return 0;
            if (showBonusQuestion && !bonusAnswered && bonusQuestion) {
              handleBonusAnswerRef.current?.(null, bonusQuestion.correctAnswer);
            } else if (questions[currentQuestionIndex] && currentQuestionIndex < NUM_QUESTIONS) {
              handleAnswerRef.current?.(null, questions[currentQuestionIndex].correctAnswer);
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      setTimer(newTimer);
    },
    [
      timer,
      showScore,
      showBonusQuestion,
      bonusAnswered,
      questions,
      currentQuestionIndex,
      bonusQuestion,
    ]
  );

  // keep refs updated
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  }, [handleAnswer]);
  useEffect(() => {
    handleBonusAnswerRef.current = handleBonusAnswer;
  }, [handleBonusAnswer]);
  useEffect(() => {
    startTimerRef.current = startTimer;
  }, [startTimer]);

  // (original non-memoized handleAnswer removed; stable useCallback version above is used)

  // (original non-memoized handleBonusAnswer removed; stable useCallback version above is used)

  // duplicate completeQuiz removed (defined earlier to satisfy handler dependencies)

  const startQuiz = () => {
    // Auto enable music on first quiz start if currently off (implicit consent via interaction)
    try {
      const pref = localStorage.getItem('streax.music');
      if (pref === null || pref === 'on') {
        // Turn on if not explicitly set to off
        setMusicOn(true);
      }
    } catch {/* ignore */ }
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setScore(0);
    setConsecutiveCorrectAnswers(0);
    setShowBonusQuestion(false);
    setShowScore(false);
    setShowGap(false);
    setSelectedAnswer(null);
    setCorrectAnswer(null);
    setMessage({ text: '', type: '', timesUp: false });
    setTimerActive(false);
  };

  // Celebration & Face components moved to external files

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setConsecutiveCorrectAnswers(0);
    setShowBonusQuestion(false);
    setShowScore(false);
    setShowGap(false);
    setSelectedAnswer(null);
    setCorrectAnswer(null);
    setMessage({ text: '', type: '', timesUp: false });
    setMultiplier(0);
    setTimerActive(false);
    setBonusAnswered(false);
    setTimeLeft(0);
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };
  // Persist authUser to localStorage whenever it changes
  useEffect(() => {
    if (authUser) {
      try {
        localStorage.setItem('streax.auth', JSON.stringify(authUser));
        localStorage.setItem('streax.nickname', authUser.nickname);
      } catch {/* ignore */ }
    }
  }, [authUser]);

  const submittedRef = useRef(false);
  useEffect(() => {
    if (!showScore) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    const slug = selectedTopic?.slug || 'daily-quizzes';
    const nickname = authUser?.nickname || hookUsername || localStorage.getItem('streax.nickname') || 'Player';
    const key = authUser?.redditUsername || 'anon';
    const totalMs = totalTime * 1000;
    // Optimistic insert so player sees themselves immediately
    try {
      if (slug && key && nickname) {
        // Shallow optimistic update only if leaderboard already loaded
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (topicLeaderboard as any)?.unshift?.({ userKey: key, nickname, score, timeTakenMs: totalMs, submittedAt: new Date().toISOString(), rank: 1 });
      }
    } catch {/* ignore */ }
    const quizId = (selectedTopic ? selectedTopicQuiz?.id : dailyQuiz?.id);
    const submissionPayload = { userKey: key, nickname, score, timeTakenMs: totalMs, ...(quizId ? { quizId } : {}) };
    void submitLeaderboardScore(slug, submissionPayload).then((ok) => {
      if (!ok) console.error('[Leaderboard] submit failed');
      // Force refresh to get proper ordering/ranks
      setTimeout(() => { try { void refreshTopicLeaderboard?.(); } catch {/* ignore */ } }, 300);
    });
  }, [showScore, selectedTopic?.slug, authUser?.nickname, authUser?.redditUsername, hookUsername, score, totalTime, submitLeaderboardScore, topicLeaderboard, refreshTopicLeaderboard]);

  useEffect(() => { if (!showScore) submittedRef.current = false; }, [showScore]);

  // Record history once after score submission processed
  useEffect(() => {
    if (!showScore) return;
    if (!selectedTopic && !usingRandomFallback) return; // require a quiz context
    // create an entry when submittedRef is set (meaning we pushed to leaderboard)
    if (submittedRef.current) {
      const topic = selectedTopic?.slug ? { slug: selectedTopic.slug, title: selectedTopic.title } : { slug: 'daily-quizzes', title: 'Daily Quiz' };
      setHistory(prev => {
        // Avoid duplicate consecutive entries (same slug + score within 2s)
        const now = Date.now();
        if (prev[0] && prev[0].slug === topic.slug && prev[0].score === score && (now - prev[0].ts) < 2000) return prev;
        const next = [{ id: now + ':' + Math.random().toString(36).slice(2, 7), slug: topic.slug, title: topic.title, score, ts: now }, ...prev].slice(0, 50);
        return next;
      });
    }
  }, [showScore, selectedTopic, usingRandomFallback, score]);

  if (showTopicMenu) {
    return (
      <TopicSelector
        onClose={() => setShowTopicMenu(false)}
        onTopicReady={async (topic) => {
          setSelectedTopic({ title: topic.title, slug: topic.slug });
          setShowTopicMenu(false);
          // If quiz data comes from the selector (e.g. newly generated), use it directly
          if (topic.quiz && Array.isArray(topic.quiz.questions)) {
            setSelectedTopicQuiz({ id: topic.quizId, questions: topic.quiz.questions, bonus: topic.bonus || null });
            setTopicQuizStatus('ready');
            return;
          }
          // Otherwise fall back to fetch
          setTopicQuizStatus('loading');
          try {
            const quiz = await firebaseQuizService.getOrGenerateTopicQuiz(topic.slug);
            if (quiz && Array.isArray(quiz.questions)) {
              setSelectedTopicQuiz({ id: quiz.id, questions: quiz.questions, bonus: quiz.bonus || null });
              setTopicQuizStatus('ready');
            } else {
              setTopicQuizStatus('error');
            }
          } catch (err) {
            console.error('Quiz fetch error:', err);
            setTopicQuizStatus('error');
          }
        }}
      />
    );
  }

  // Show loading screen while fetching quiz data
  if (loading && !selectedTopicQuiz) {
    return (
      <div className="min-h-screen bg-primary text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-lg">Loading today's quiz...</p>
        </div>
      </div>
    );
  }

  // Show message if quiz requested but no questions available
  if (quizStarted && (!questions || questions.length === 0)) {
    return (
      <div className="min-h-screen bg-primary text-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-warning mb-4">Quiz temporarily unavailable</p>
          <p className="text-sm">Please try again later</p>
          <button onClick={resetQuiz} className="modern-button modern-button-secondary mt-4 px-4 py-2">Back to Menu</button>
        </div>
      </div>
    );
  }

  // (moved showTopicMenu logic above)

  return (
    <div className="min-h-screen bg-primary text-primary p-2 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4 min-h-10 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMusicOn(m => !m)}
              className={`modern-button px-3 py-1 text-xs font-bold ${musicOn ? 'modern-button-primary' : 'modern-button-secondary'}`}
              aria-label="Toggle background music"
            >
              {musicOn ? '♪ Music On' : '♪ Music Off'}
            </button>
          </div>
          {authUser && (
            <div className="flex items-center gap-2 text-xs text-secondary font-semibold px-2 py-1 rounded bg-base-200">
              {(() => { const u = authUser ? authUser.redditUsername : ''; const keep = Math.max(1, Math.ceil(u.length * 0.3)); const masked = '*'.repeat(Math.max(0, u.length - keep)) + u.slice(-keep); return <span className="text-accent">{masked}</span>; })()}
              <span>{authUser.nickname}</span>
            </div>
          )}
        </div>
        {/* Hidden audio element (user provided mp3 placed in public or assets). Fallback to /assets/bgm.mp3 */}
        <audio ref={audioRef} src="/assets/bgm.mp3" loop preload="auto" style={{ display: 'none' }} />

        {/* AuthModal Removed - Implicit Auth Only */}
        <div
          className={`grid grid-cols-1 gap-4 lg:gap-6 ${!quizStarted || showScore ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}
        >
          {/* No Topic Selected Prompt Modal */}
          {showNoTopicPrompt && !quizStarted && (
            <NoTopicPrompt
              onClose={() => setShowNoTopicPrompt(false)}
              onChooseTopic={() => {
                setShowNoTopicPrompt(false);
                setShowTopicMenu(true);
              }}
              onPlayRandom={() => {
                // Start random (dailyQuestions) mode
                setUsingRandomFallback(true);
                setShowNoTopicPrompt(false);
                // Ensure any topic selection is cleared so logic branches treat as random
                setSelectedTopic(null);
                setSelectedTopicQuiz(null);
                setTopicQuizStatus('ready');
                // Validate random quiz integrity before starting
                const dq = dailyQuestions || [];
                const corrupt = dq.length < NUM_QUESTIONS || dq.some(q => !q || !q.question || !Array.isArray(q.answers) || q.answers.length < 2 || !q.correctAnswer);
                if (corrupt) {
                  setMessage({ text: 'Daily quiz data incomplete. Please choose a topic instead.', type: 'error', timesUp: false });
                  return;
                }
                startQuiz();
              }}
            />
          )}

          {/* Main Quiz Area */}
          <div className={!quizStarted || showScore ? 'lg:col-span-2' : 'lg:col-span-1'}>
            <div
              className={`modern-card p-4 md:p-6 relative overflow-hidden ${!quizStarted ? 'flex flex-col items-center' : ''}`}
            >
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-success/5 pointer-events-none" />

              {/* Close/Quit Button */}
              {(quizStarted) && (
                <button
                  onClick={() => {
                    setQuizStarted(false);
                    setScore(0);
                    setConsecutiveCorrectAnswers(0);
                    setCurrentQuestionIndex(0);
                    setShowScore(false);
                    setSelectedTopic(null);
                    setSelectedTopicQuiz(null);
                    setTopicQuizStatus('idle'); // Reset status so it doesn't show "Quiz Loaded" immediately
                    setUsingRandomFallback(false);
                    setMessage({ text: '', type: '', timesUp: false });
                    setTimerActive(false);
                    setTimeLeft(0);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors z-50 border border-white/10 hover:border-white/20"
                  title="Quit Quiz"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}

              {/* Multiplier and Streak Effects */}
              <AnimatePresence>
                {multiplier > 0 && showGap && (
                  <motion.div
                    className={`multiplier-pop multiplier-pop-${Math.min(multiplier, 5)}`}
                    initial={{ scale: 0, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 1.5, opacity: 0, rotate: 10 }}
                    transition={{ duration: 1.5 }}
                  >
                    {getMultiplierText(multiplier)}
                  </motion.div>
                )}
                {quizStarted &&
                  consecutiveCorrectAnswers > 0 &&
                  !showScore &&
                  !showBonusQuestion &&
                  !showGap && (
                    <motion.div
                      className={`streak-counter streak-${Math.min(consecutiveCorrectAnswers, 5)} fixed top-4 right-4 z-40`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <span className="text-lg font-bold">×{consecutiveCorrectAnswers}</span>
                    </motion.div>
                  )}
              </AnimatePresence>

              <MessageDisplay message={message} />

              <AnimatePresence>
                {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {!quizStarted ? (
                  <LandingHero
                    username={authUser?.nickname || userInfo?.username || 'Player'}
                    selectedTopic={selectedTopic}
                    topicQuizStatus={topicQuizStatus}
                    onOpenTopicMenu={() => {
                      setShowTopicMenu(true);
                      setTopicQuizStatus('idle');
                    }}
                    onStartQuiz={() => {
                      if (selectedTopic && (!selectedTopicQuiz || topicQuizStatus !== 'ready')) return;
                      if (!selectedTopic) { setShowNoTopicPrompt(true); return; }
                      startQuiz();
                    }}
                    totalQuestions={NUM_QUESTIONS}
                    showTimeoutMessage={showTimeoutMessage}
                  />
                ) : showGap ? (
                  <GapView multiplier={multiplier} />
                ) : (showBonusQuestion && bonusQuestion) ? (
                  <BonusQuestionView
                    bonusQuestion={bonusQuestion}
                    timerActive={timerActive}
                    timeLeft={timeLeft}
                    totalTime={totalTime}
                    selectedAnswer={selectedAnswer}
                    correctAnswer={correctAnswer}
                    onAnswer={handleBonusAnswer}
                  />
                ) : showScore ? (
                  <QuizResult
                    score={score}
                    totalQuestions={NUM_QUESTIONS + (showBonusQuestion ? 1 : 0)}
                    onPlayAgain={startQuiz}
                    onReset={resetQuiz}
                  />
                ) : (
                  <QuizActiveView
                    question={questions[currentQuestionIndex] || { question: '', answers: [], correctAnswer: '' }}
                    questionIndex={currentQuestionIndex}
                    totalQuestions={NUM_QUESTIONS}
                    timeLeft={timeLeft}
                    totalTime={totalTime}
                    timerActive={timerActive}
                    shuffledAnswers={shuffledAnswers}
                    selectedAnswer={selectedAnswer}
                    correctAnswer={correctAnswer}
                    onAnswer={(selected, correct) => handleAnswer(selected, correct)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Side Panel: History (idle) OR Topic Leaderboard (score screen) */}
          {(!quizStarted || showScore) && (
            <GameSidebar
              showScore={showScore}
              selectedTopicTitle={selectedTopic?.title}
              topicLbLoading={topicLbLoading}
              topicLeaderboard={topicLeaderboard as any[]} // explicit cast for simplicity
              historyLoading={historyLoading}
              authUser={authUser}
              history={history}
              onSelectHistoryTopic={(slug, title) => {
                setSelectedTopic({ slug, title });
                localStorage.setItem('streax:selectedTopic', JSON.stringify({ slug, title }));
              }}
            />
          )}
        </div>
      </div>
      {/* Leaderboard + Hot Topics */}
      {!quizStarted && (
        <GlobalDashboard
          landingSummaryLoading={landingSummaryLoading}
          landingSummary={landingSummary}
          authUser={authUser}
          onSelectTopic={(slug, title) => {
            setSelectedTopic({ slug, title });
            localStorage.setItem('streax:selectedTopic', JSON.stringify({ slug, title }));
          }}
        />
      )}
    </div>
  );
};
