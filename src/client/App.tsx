import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TopicSelector from './components/topic/TopicSelector';
import { motion, AnimatePresence } from 'framer-motion';
// import { LeaderboardResponse } from '../shared';
import { useTheme } from './hooks/useTheme';
import { useQuizData } from './hooks/useQuizData';
import { useUsername } from './hooks/useUsername';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useLandingSummary } from './hooks/useLandingSummary';
import { useHistory } from './hooks/useHistory';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { useUserActivity } from './hooks/useUserActivity';
import { useRobotError } from './hooks/useRobotError';
import { CONFIG } from '../shared/constants';
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
import { KawaiiLoader } from './components/loading/KawaiiLoader';

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
  const { questions: dailyQuestions, quiz: dailyQuiz, loading } = useQuizData();

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
  // User session state (deprecated)
  const [userInfo, setUserInfo] = useState<{ userId: string | null; username: string | null; displayName: string | null } | null>(null);
  // Remove showTimeoutMessage state as it's now internal to Robot (derived from time)
  // But we still need to track user activity/idleness if needed, but Robot does it.
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [userTotalScore, setUserTotalScore] = useState(0); // New state for aggregated score
  const [selectedTopic, setSelectedTopic] = useState<{ title: string; slug: string } | null>(null);
  interface SelectedTopicQuiz { id?: string | undefined; questions?: { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string }[]; bonus?: { question: string; options: string[]; correctIndex: number } | null }
  const [selectedTopicQuiz, setSelectedTopicQuiz] = useState<SelectedTopicQuiz | null>(null);
  const [topicQuizStatus, setTopicQuizStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [showNoTopicPrompt, setShowNoTopicPrompt] = useState(false);
  const [hasCompletedQuizSession, setHasCompletedQuizSession] = useState(false); // Track if user has finished a quiz
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

  // Background music system
  const { isMuted, toggleMute, setMode } = useBackgroundMusic();

  // Handle music mode switching
  useEffect(() => {
    if (quizStarted) {
      setMode('quiz');
    } else {
      setMode('landing');
    }
  }, [quizStarted, setMode]);

  // Handle volume toggle (replace setMusicOn with toggleMute)
  // ... (UI binding happens in the render block)

  // Activity detection for smart polling (60s timeout)
  const isUserActive = useUserActivity(60000);
  const pollingEnabled = isUserActive;

  // Leaderboard hook (per selected topic)
  // Enable leaderboard as soon as quiz ends (showScore) or while viewing start screen for previously selected topic
  const { entries: topicLeaderboard, loading: topicLbLoading, submitScore: submitLeaderboardScore, refresh: refreshTopicLeaderboard } = useLeaderboard({ slug: selectedTopic?.slug || null, enabled: !!selectedTopic && (showScore || !quizStarted) });
  const { data: landingSummary, loading: landingSummaryLoading, refresh: refreshLandingSummary } = useLandingSummary(!quizStarted && !showScore, pollingEnabled);
  const { username: hookUsername } = useUsername();

  // No manual sign-in logic needed

  // Use new global play history hook
  const { history: globalHistory, loading: globalHistoryLoading, savePlay, hasPlayed } = useHistory(!quizStarted, pollingEnabled);

  // Robot error message queue (for user-friendly error feedback)
  const { currentError, addError } = useRobotError();

  // Transform global history to match UI expectations
  const history = useMemo(() => {
    return globalHistory.map(h => ({
      id: `${h.username}-${h.topicSlug}-${h.timestamp}`,
      slug: h.topicSlug,
      title: h.topicTitle,
      ts: h.timestamp,
      nickname: h.nickname
    }));
  }, [globalHistory]);

  const historyLoading = globalHistoryLoading;

  // Derive active questions: prefer topic quiz if present
  interface TopicQuizQuestionRaw { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string; }
  const questions = useMemo(() => {
    if (selectedTopicQuiz && Array.isArray(selectedTopicQuiz.questions)) {
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
  }, [selectedTopicQuiz, dailyQuestions]);
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
          setAuthUser(auth);
          setUserInfo({ userId: cData.userId, username: cData.userId, displayName: cData.username });

          // Fetch full profile to get totalScore using USERNAME (Primary Key)
          try {
            const profileRes = await fetch(`/api/users/resolve?userId=${cData.username || cData.userId}`);
            if (profileRes.ok) {
              const pData = await profileRes.json();
              if (pData.found && pData.user && typeof pData.user.totalScore === 'number') {
                setUserTotalScore(pData.user.totalScore);
              }
            }
          } catch (e) {
            console.error('[Session] Profile fetch failed', e);
          }

          return;
        }
      }

      // 2. Fallback to session check
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData);
        setUserInfo({ userId: null, username: 'Guest', displayName: 'Guest' });
      }
    } catch {
      setUserInfo({ userId: null, username: 'Guest', displayName: 'Guest' });
    }
  };

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

  // Timeout message logic moved to InteractiveRobot
  // Removed old useEffect for showTimeoutMessage

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
            setHasCompletedQuizSession(true); // User completed a quiz
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
    console.log('[App] ⚡ START QUIZ button clicked', {
      selectedTopic: selectedTopic?.slug,
      hasQuestions: questions.length > 0,
      status: topicQuizStatus
    });
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
    // STRICT: Use username (nickname) as the Primary Key for saving/fetching
    const key = nickname;
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

    // Check if replay (deferred implementation - check hasPlayed)
    const isReplay = hasPlayed(slug);

    // Unified Play Handler: Log history AND submit score
    const finalizePlay = async () => {
      // Step 1: Save to History (ALWAYS, even on replays)
      await savePlay(
        key, // username
        nickname, // nickname
        slug, // topicSlug
        selectedTopic?.title || 'Daily Quiz', // topicTitle
        score
      );

      // Step 2: Submit to Leaderboard if not replay (one-a-day logic is mostly backend-enforced now)
      if (!isReplay) {
        await submitLeaderboardScore(slug, submissionPayload);
      } else {
        setMessage({
          type: 'info',
          text: '🔁 Replay mode - stats updated',
          timesUp: false
        });
      }

      // Step 3: Refresh local state
      void loadUserData();
      try { void refreshLandingSummary?.(); } catch {/* ignore */ }
      setTimeout(() => { try { void refreshTopicLeaderboard?.(); } catch {/* ignore */ } }, 300);
    };

    void finalizePlay();
  }, [showScore, selectedTopic?.slug, authUser?.nickname, authUser?.redditUsername, hookUsername, score, totalTime, submitLeaderboardScore, topicLeaderboard, refreshTopicLeaderboard]);

  useEffect(() => { if (!showScore) submittedRef.current = false; }, [showScore]);

  // History is now managed by useHistory hook and saved after quiz completion

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
            const quiz = await firebaseQuizService.getOrGenerateTopicQuiz(topic.slug, authUser?.nickname);
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
        onError={(code, robotDialogue) => {
          setShowTopicMenu(false);
          addError(code, robotDialogue);
        }}
      />
    );
  }

  // Show loading screen while fetching quiz data
  if (loading && !selectedTopicQuiz) {
    return (
      <div className="min-h-screen bg-primary text-primary flex items-center justify-center">
        <KawaiiLoader />
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
    <div className="min-h-screen relative overflow-x-hidden p-2 md:p-4 lg:p-6 transition-all duration-500">
      <div className="wiremesh-overlay" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-4 min-h-10 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className={`modern-button px-3 py-1 text-xs font-bold ${!isMuted ? 'modern-button-primary' : 'modern-button-secondary'}`}
              aria-label={isMuted ? 'Unmute music' : 'Mute music'}
            >
              {isMuted ? '♪ Music Off' : '♪ Music On'}
            </button>
          </div>

        </div>

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
              onPlayDaily={() => {
                // Explicitly start Daily Quiz Mode
                setShowNoTopicPrompt(false);
                setSelectedTopic(null);
                setSelectedTopicQuiz(null);
                setTopicQuizStatus('idle');

                // Verify data integrity
                const dq = dailyQuestions || [];
                const corrupt = dq.length < NUM_QUESTIONS || dq.some(q => !q || !q.question || !Array.isArray(q.answers) || q.answers.length < 2 || !q.correctAnswer);

                if (corrupt) {
                  setMessage({ text: 'Daily quiz unavailable. Please try again later or choose a topic.', type: 'error', timesUp: false });
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
                      if (selectedTopic && (!selectedTopicQuiz || topicQuizStatus !== 'ready')) {
                        console.warn('[App] 🚫 Quiz flow blocked: topic selected but quiz not ready/error', { topic: selectedTopic.slug, status: topicQuizStatus });
                        return;
                      }
                      if (!selectedTopic) {
                        console.log('[App] ℹ️ No topic selected, showing prompt');
                        setShowNoTopicPrompt(true);
                        return;
                      }
                      console.log('[App] 🚀 Starting selected topic quiz:', selectedTopic.slug);
                      startQuiz();
                    }}
                    totalQuestions={NUM_QUESTIONS}
                    errorMessage={currentError?.robotDialogue}
                    hasPlayed={hasCompletedQuizSession}
                    totalPoints={userTotalScore}
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
              history={history}
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
