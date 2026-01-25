import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LoadingDots from './components/LoadingDots';
import TopicSelector from './components/topic/TopicSelector';
import { motion, AnimatePresence } from 'framer-motion';
// import { LeaderboardResponse } from '../shared';
import { useTheme } from './hooks/useTheme';
import { useQuizData } from './hooks/useQuizData';
import { useUsername } from './hooks/useUsername';
import { CircularTimer } from './components/ui';
import { InteractiveRobot } from './components/InteractiveRobot';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useLandingSummary } from './hooks/useLandingSummary';
import HotTopics from './components/HotTopics';
import { CONFIG } from '../shared/constants';
import { firebaseQuizService } from './services/FirebaseQuizService';

const QUIZ_DURATIONS = Array(CONFIG.GAME.DEFAULT_QUESTIONS_COUNT).fill(CONFIG.GAME.TIMER_DURATION);
const BONUS_QUIZ_DURATION = CONFIG.GAME.BONUS_TIMER_DURATION;
const NUM_QUESTIONS = CONFIG.GAME.DEFAULT_QUESTIONS_COUNT;

export const App = () => {
  const theme = useTheme();
  // Daily quiz (fallback) hook
  const { questions: dailyQuestions, loading } = useQuizData();

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
  // Firestore leaderboard displayed via separate component/hook (to be implemented)
  const [multiplier, setMultiplier] = useState(0);
  const [showGap, setShowGap] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [bonusAnswered, setBonusAnswered] = useState(false);
  const [history, setHistory] = useState<{ id: string; slug: string; title: string; score: number; ts: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Legacy userInfo retained temporarily; will be deprecated in favor of authUser
  const [userInfo, setUserInfo] = useState<{ userId: string | null; username: string | null; displayName: string | null } | null>(null);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<{ title: string; slug: string } | null>(null);
  interface SelectedTopicQuiz { questions?: { question: string; options?: string[]; answers?: string[]; correctAnswer: number | string }[]; bonus?: { question: string; options: string[]; correctIndex: number } | null }
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
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [pendingNickname, setPendingNickname] = useState('');
  const [pendingReddit, setPendingReddit] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'checking' | 'need-nickname'>('idle');
  const [signupError] = useState<string | null>(null);
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
  const { data: landingSummary, loading: landingSummaryLoading, refresh: refreshLanding } = useLandingSummary(!quizStarted && !showScore);
  const { username: hookUsername } = useUsername();

  const submitLocalAuth = useCallback(async () => {
    if (!pendingReddit.trim()) return;
    const uname = pendingReddit.trim().replace(/^u\//i, '').toLowerCase();
    if (lookupState === 'idle') {
      setLookupState('checking');
      try {
        const resp = await fetch(`/api/users/resolve?userId=${encodeURIComponent(uname)}`);
        const data = await resp.json();
        if (resp.ok && data.found && data.user) {
          const auth = { redditUsername: data.user.userId, nickname: data.user.nickname };
          setAuthUser(auth);
          try { localStorage.setItem('streax.auth', JSON.stringify(auth)); localStorage.setItem('streax.nickname', auth.nickname); } catch {/* ignore */ }
          setShowNicknameModal(false);
          setLookupState('idle');
          setPendingNickname('');
        } else {
          setLookupState('need-nickname');
        }
      } catch { setLookupState('need-nickname'); }
      return;
    }
    if (lookupState === 'need-nickname') {
      if (!pendingNickname.trim()) return;
      try {
        const resp = await fetch('/api/users/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uname, nickname: pendingNickname.trim() }) });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          const auth = { redditUsername: data.user.userId, nickname: data.user.nickname };
          setAuthUser(auth);
          try { localStorage.setItem('streax.auth', JSON.stringify(auth)); localStorage.setItem('streax.nickname', auth.nickname); } catch {/* ignore */ }
          setShowNicknameModal(false);
          setLookupState('idle');
          setPendingNickname('');
        }
      } catch {/* ignore */ }
    }
  }, [pendingReddit, pendingNickname, lookupState]);
  const handleSignIn = useCallback(() => { setShowNicknameModal(true); }, []);

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

  // Function to load user data from server
  const loadUserData = async () => {
    try {
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

  // Celebration Animation Components
  const CelebrationBackground = ({ score }: { score: number }) => {
    const isSuccess = score >= 3;
    const balloonColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];

    // lightweight render
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 1000,
          width: '100vw',
          height: '100vh',
        }}
      >
        {isSuccess ? (
          // Balloons for good performance
          <>
            {/* Balloons rendering */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${10 + ((i * 10) % 80)}%`,
                  bottom: '0px',
                  width: '50px',
                  height: '65px',
                  zIndex: 1001,
                }}
                initial={{ y: 100, opacity: 1, rotate: 0 }}
                animate={{
                  y: -900,
                  opacity: [1, 1, 1, 0.8, 0],
                  rotate: [0, 10, -10, 5, 0],
                  x: [0, 30, -20, 10, 0],
                }}
                transition={{
                  duration: 8,
                  delay: i * 0.7,
                  ease: 'easeOut',
                  repeat: 0,
                }}
              >
                {/* Balloon */}
                <div
                  style={{
                    width: '40px',
                    height: '50px',
                    backgroundColor: balloonColors[i % balloonColors.length] || '#ff6b6b',
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    position: 'relative',
                    boxShadow: `inset -8px -8px 0 rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2)`,
                    border: '3px solid rgba(255,255,255,0.4)',
                    background: `linear-gradient(135deg, ${balloonColors[i % balloonColors.length] || '#ff6b6b'} 0%, ${balloonColors[i % balloonColors.length] || '#ff6b6b'}CC 100%)`,
                  }}
                >
                  {/* Balloon highlight */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '12px',
                      height: '16px',
                      backgroundColor: 'rgba(255,255,255,0.5)',
                      borderRadius: '50%',
                      transform: 'rotate(-20deg)',
                    }}
                  />
                </div>
                {/* String */}
                <div
                  style={{
                    width: '2px',
                    height: '40px',
                    backgroundColor: '#444',
                    margin: '0 auto',
                    position: 'relative',
                    boxShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                  }}
                />
              </motion.div>
            ))}

            {/* modal intentionally rendered at top-level hero area to avoid duplicate renderings */}
          </>
        ) : (
          // Sludge bombs for poor performance
          <>
            {/* Sludge bombs rendering */}
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${15 + ((i * 12) % 70)}%`,
                  top: '-10px',
                  width: '35px',
                  height: '35px',
                  zIndex: 1001,
                }}
                initial={{ y: -100, opacity: 1, rotate: 0 }}
                animate={{
                  y: 900,
                  opacity: [1, 1, 1, 0.8, 0],
                  rotate: [0, 180, 360, 540],
                  x: [0, -25, 15, -10, 0],
                }}
                transition={{
                  duration: 6,
                  delay: i * 0.8,
                  ease: 'easeIn',
                  repeat: 0,
                }}
              >
                {/* Sludge Bomb */}
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: '#4a5d23',
                    borderRadius: '40% 60% 30% 70%',
                    position: 'relative',
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 0 rgba(0,0,0,0.3)',
                    border: '3px solid #3a4d13',
                    background: 'radial-gradient(circle at 30% 30%, #6b7c3a, #4a5d23, #3a4d13)',
                  }}
                >
                  {/* Stench lines */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '8px',
                      width: '2px',
                      height: '10px',
                      backgroundColor: '#7a8b4a',
                      borderRadius: '1px',
                      opacity: 0.7,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '15px',
                      width: '1px',
                      height: '8px',
                      backgroundColor: '#7a8b4a',
                      borderRadius: '1px',
                      opacity: 0.5,
                    }}
                  />
                  {/* Drips */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-5px',
                      left: '8px',
                      width: '4px',
                      height: '12px',
                      backgroundColor: '#4a5d23',
                      borderRadius: '0 0 50% 50%',
                      opacity: 0.8,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-3px',
                      right: '5px',
                      width: '3px',
                      height: '8px',
                      backgroundColor: '#4a5d23',
                      borderRadius: '0 0 50% 50%',
                      opacity: 0.6,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    );
  };

  // Custom robot face component based on score
  const ScoreFace = ({ score, totalQuestions }: { score: number; totalQuestions: number }) => {
    const faceSize = 140;

    // Determine robot face type based on score
    const getRobotFaceData = () => {
      if (score === totalQuestions) {
        // Perfect score - Elite robot
        return {
          faceColor: '#ffd700',
          visorColor: '#000000',
          eyeColor: '#00ff88',
          eyeType: 'elite',
          antennaType: 'dual',
          sidePanels: true,
          glowIntensity: 'high',
        };
      } else if (score >= 4) {
        // 4+ correct - Advanced robot
        return {
          faceColor: '#22c55e',
          visorColor: '#1a1a1a',
          eyeColor: '#00ff88',
          eyeType: 'happy',
          antennaType: 'dual',
          sidePanels: true,
          glowIntensity: 'medium',
        };
      } else if (score === 3) {
        // 3 correct - Standard robot
        return {
          faceColor: '#3b82f6',
          visorColor: '#1a1a1a',
          eyeColor: '#00ff88',
          eyeType: 'content',
          antennaType: 'single',
          sidePanels: true,
          glowIntensity: 'medium',
        };
      } else if (score === 2) {
        // 2 correct - Basic robot
        return {
          faceColor: '#f59e0b',
          visorColor: '#1a1a1a',
          eyeColor: '#ffaa00',
          eyeType: 'neutral',
          antennaType: 'single',
          sidePanels: false,
          glowIntensity: 'low',
        };
      } else if (score === 1) {
        // 1 correct - Malfunctioning robot
        return {
          faceColor: '#f97316',
          visorColor: '#1a1a1a',
          eyeColor: '#ff6600',
          eyeType: 'error',
          antennaType: 'broken',
          sidePanels: false,
          glowIntensity: 'low',
        };
      } else {
        // 0 correct - Damaged robot
        return {
          faceColor: '#ef4444',
          visorColor: '#1a1a1a',
          eyeColor: '#ff3333',
          eyeType: 'offline',
          antennaType: 'broken',
          sidePanels: false,
          glowIntensity: 'none',
        };
      }
    };

    const robotData = getRobotFaceData();

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg
          width={faceSize}
          height={faceSize}
          style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))' }}
        >
          {/* Top antennas */}
          {robotData.antennaType === 'dual' && (
            <>
              <rect
                x="40"
                y="10"
                width="8"
                height="8"
                fill={robotData.faceColor}
                stroke="#000"
                strokeWidth="2"
                rx="2"
              />
              <rect
                x="92"
                y="10"
                width="8"
                height="8"
                fill={robotData.faceColor}
                stroke="#000"
                strokeWidth="2"
                rx="2"
              />
            </>
          )}
          {robotData.antennaType === 'single' && (
            <rect
              x="66"
              y="10"
              width="8"
              height="8"
              fill={robotData.faceColor}
              stroke="#000"
              strokeWidth="2"
              rx="2"
            />
          )}
          {robotData.antennaType === 'broken' && (
            <>
              <rect
                x="40"
                y="15"
                width="6"
                height="6"
                fill={robotData.faceColor}
                stroke="#000"
                strokeWidth="2"
                rx="1"
              />
              <rect
                x="94"
                y="12"
                width="4"
                height="4"
                fill={robotData.faceColor}
                stroke="#000"
                strokeWidth="1"
                rx="1"
              />
            </>
          )}

          {/* Side panels */}
          {robotData.sidePanels && (
            <>
              <rect
                x="10"
                y="50"
                width="8"
                height="20"
                fill={robotData.faceColor}
                stroke="#000"
                strokeWidth="2"
                rx="2"
              />
              <rect
                x="122"
                y="50"
                width="8"
                height="20"
                fill={robotData.faceColor}
                stroke="#000"
                strokeWidth="2"
                rx="2"
              />
            </>
          )}

          {/* Main robot head */}
          <rect
            x="25"
            y="25"
            width="90"
            height="80"
            fill={robotData.faceColor}
            stroke="#000"
            strokeWidth="3"
            rx="15"
          />

          {/* Main visor/screen */}
          <rect
            x="35"
            y="35"
            width="70"
            height="45"
            fill={robotData.visorColor}
            stroke="#000"
            strokeWidth="2"
            rx="5"
          />

          {/* Visor reflection */}
          <rect x="38" y="38" width="25" height="15" fill="rgba(255,255,255,0.2)" rx="3" />

          {/* Robot eyes based on mood */}
          {robotData.eyeType === 'elite' ? (
            // Diamond-shaped elite eyes
            <>
              <polygon points="50,50 55,45 60,50 55,55" fill={robotData.eyeColor} />
              <polygon points="80,50 85,45 90,50 85,55" fill={robotData.eyeColor} />
              {robotData.glowIntensity === 'high' && (
                <>
                  <circle
                    cx="55"
                    cy="50"
                    r="8"
                    fill="none"
                    stroke={robotData.eyeColor}
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <circle
                    cx="85"
                    cy="50"
                    r="8"
                    fill="none"
                    stroke={robotData.eyeColor}
                    strokeWidth="1"
                    opacity="0.6"
                  />
                </>
              )}
            </>
          ) : robotData.eyeType === 'happy' ? (
            // Curved happy display lines
            <>
              <path
                d="M 45 48 Q 55 52 65 48"
                stroke={robotData.eyeColor}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 75 48 Q 85 52 95 48"
                stroke={robotData.eyeColor}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : robotData.eyeType === 'content' ? (
            // Standard robot eyes
            <>
              <rect x="48" y="48" width="8" height="4" fill={robotData.eyeColor} rx="2" />
              <rect x="84" y="48" width="8" height="4" fill={robotData.eyeColor} rx="2" />
            </>
          ) : robotData.eyeType === 'neutral' ? (
            // Dot eyes
            <>
              <circle cx="52" cy="50" r="3" fill={robotData.eyeColor} />
              <circle cx="88" cy="50" r="3" fill={robotData.eyeColor} />
            </>
          ) : robotData.eyeType === 'error' ? (
            // Error X patterns
            <>
              <path
                d="M 48 46 L 56 54 M 56 46 L 48 54"
                stroke={robotData.eyeColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 84 46 L 92 54 M 92 46 L 84 54"
                stroke={robotData.eyeColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          ) : (
            // Offline - no eyes
            <>
              <rect x="48" y="48" width="8" height="4" fill="#333" rx="2" />
              <rect x="84" y="48" width="8" height="4" fill="#333" rx="2" />
            </>
          )}

          {/* Status indicator on visor */}
          {robotData.eyeType !== 'offline' && (
            <rect x="67" y="65" width="6" height="3" fill={robotData.eyeColor} rx="1" />
          )}

          {/* Bottom chin piece */}
          <rect
            x="55"
            y="95"
            width="30"
            height="8"
            fill={robotData.faceColor}
            stroke="#000"
            strokeWidth="2"
            rx="4"
          />

          {/* Glow effects for high-performing robots */}
          {robotData.glowIntensity === 'high' && (
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}
        </svg>

        {/* Status indicators floating around elite robot */}
        {robotData.eyeType === 'elite' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                width: '6px',
                height: '6px',
                backgroundColor: '#00ff88',
                borderRadius: '50%',
                boxShadow: '0 0 10px #00ff88',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                width: '4px',
                height: '4px',
                backgroundColor: '#ffd700',
                borderRadius: '50%',
                boxShadow: '0 0 8px #ffd700',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '15px',
                left: '20px',
                width: '5px',
                height: '5px',
                backgroundColor: '#00ff88',
                borderRadius: '50%',
                boxShadow: '0 0 10px #00ff88',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '15px',
                right: '20px',
                width: '6px',
                height: '6px',
                backgroundColor: '#ffd700',
                borderRadius: '50%',
                boxShadow: '0 0 10px #ffd700',
              }}
            />
          </>
        )}
      </div>
    );
  };

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
    void submitLeaderboardScore(slug, { userKey: key, nickname, score, timeTakenMs: totalMs }).then((ok) => {
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
            setSelectedTopicQuiz({ questions: topic.quiz.questions, bonus: topic.bonus || null });
            setTopicQuizStatus('ready');
            return;
          }
          // Otherwise fall back to fetch
          setTopicQuizStatus('loading');
          try {
            const quiz = await firebaseQuizService.getOrGenerateTopicQuiz(topic.slug);
            if (quiz && Array.isArray(quiz.questions)) {
              setSelectedTopicQuiz({ questions: quiz.questions, bonus: quiz.bonus || null });
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
          {!authUser ? (
            <motion.button onClick={handleSignIn} className="modern-button modern-button-secondary px-4 py-2 text-sm font-bold">Sign In</motion.button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-secondary font-semibold px-2 py-1 rounded bg-base-200">
              {(() => { const u = authUser ? authUser.redditUsername : ''; const keep = Math.max(1, Math.ceil(u.length * 0.3)); const masked = '*'.repeat(Math.max(0, u.length - keep)) + u.slice(-keep); return <span className="text-accent">{masked}</span>; })()}
              <span>{authUser.nickname}</span>
            </div>
          )}
        </div>
        {/* Hidden audio element (user provided mp3 placed in public or assets). Fallback to /assets/bgm.mp3 */}
        <audio ref={audioRef} src="/assets/bgm.mp3" loop preload="auto" style={{ display: 'none' }} />

        {showNicknameModal && !authUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modern-card w-full max-w-md p-6 border-2 border-accent/40">
              <h2 className="text-2xl font-extrabold mb-4 text-gradient">Sign In</h2>
              <div className="mb-4">
                <label className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1 block">Reddit Username</label>
                <div className="flex items-center gap-2">
                  <span className="text-accent font-bold">u/</span>
                  <input value={pendingReddit} onChange={e => { setPendingReddit(e.target.value); if (lookupState !== 'idle') setLookupState('idle'); }} placeholder="yourname" className="flex-1 px-3 py-2 rounded border border-accent/40 bg-base-200 focus:outline-none focus:ring-2 focus:ring-accent" maxLength={40} />
                </div>
              </div>
              {lookupState === 'need-nickname' && (
                <div className="mb-4">
                  <label className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1 block">Nickname (new)</label>
                  <input value={pendingNickname} onChange={e => setPendingNickname(e.target.value)} placeholder="Choose nickname" className="w-full px-3 py-2 rounded border border-accent/40 bg-base-200 focus:outline-none focus:ring-2 focus:ring-accent" maxLength={40} />
                  <p className="mt-2 text-[10px] opacity-60">Username not found. Create a nickname to register.</p>
                </div>
              )}
              {signupError && <div className="text-error text-xs font-semibold mb-2">{signupError}</div>}
              <div className="flex gap-3 items-stretch">
                <button onClick={() => { setShowNicknameModal(false); setLookupState('idle'); setPendingNickname(''); }} className="modern-button modern-button-secondary flex-1 py-3 font-bold">Cancel</button>
                <button onClick={submitLocalAuth} disabled={!pendingReddit.trim() || (lookupState === 'need-nickname' && !pendingNickname.trim())} className="modern-button modern-button-primary flex-1 py-3 font-bold disabled:opacity-50">
                  {lookupState === 'checking' ? 'Checking…' : lookupState === 'need-nickname' ? 'Register' : 'Continue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        <div
          className={`grid grid-cols-1 gap-4 lg:gap-6 ${!quizStarted || showScore ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}
        >
          {/* No Topic Selected Prompt Modal */}
          {showNoTopicPrompt && !quizStarted && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="modern-card relative w-full max-w-md mx-auto p-6 pt-8 border-2 border-accent/40"
                style={{ boxShadow: '0 0 25px rgba(255,69,0,0.35), 0 0 8px rgba(255,255,255,0.15)' }}
              >
                <button
                  onClick={() => setShowNoTopicPrompt(false)}
                  className="absolute top-2 right-2 text-secondary hover:text-primary transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
                <h3 className="text-2xl font-extrabold mb-3 text-gradient">Select a Topic</h3>
                <p className="text-secondary mb-6 leading-relaxed">
                  You have not selected a topic. Would you like to pick one now or play a random daily quiz?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowNoTopicPrompt(false);
                      setShowTopicMenu(true);
                    }}
                    className="modern-button modern-button-primary w-full py-3 font-bold"
                  >
                    Choose Topic
                  </button>
                  <button
                    onClick={() => {
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
                    className="modern-button modern-button-secondary w-full py-3 font-bold"
                  >
                    Play Random Quiz
                  </button>
                  {/* Healing modal removed: no auto regeneration logic anymore */}
                </div>
                <div className="mt-4 text-xs text-center text-secondary">
                  Random quiz will use the daily curated questions.
                </div>
              </motion.div>
            </div>
          )}
          {/* Main Quiz Area */}
          <div className={!quizStarted || showScore ? 'lg:col-span-2' : 'lg:col-span-1'}>
            <div
              className={`modern-card p-4 md:p-6 relative overflow-hidden ${!quizStarted ? 'flex flex-col items-center' : ''}`}
            >
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-success/5 pointer-events-none" />

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

              {/* Header */}
              <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
                  Daily Subreddit Quiz
                </h1>
                <p className="text-lg text-secondary max-w-2xl mx-auto">
                  Test your knowledge and climb the leaderboard!
                </p>

                {/* Interactive Robot with Eye Tracking and Speech Bubbles */}
                {!quizStarted && (
                  <div className="mx-auto mt-2 mb-4 flex flex-col items-center justify-center w-full">
                    <div className="relative">
                      <InteractiveRobot username={authUser?.nickname || userInfo?.username || 'Player'} />
                    </div>
                  </div>
                )}

                {/* Playful Timeout Message */}
                <AnimatePresence>
                  {showTimeoutMessage && !quizStarted && (
                    <motion.div
                      className="mt-4 p-4 rounded-lg"
                      style={{
                        background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                      }}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.8 }}
                      transition={{ type: 'spring', damping: 15 }}
                    >
                      <p className="text-white font-semibold text-lg">
                        Hey, it was real hard to build this app, please try it out!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Hot Topics moved to separate section below */}
              </motion.div>

              {/* Message Display */}
              <AnimatePresence>
                {message.text && (
                  <motion.div
                    className={`p-3 md:p-6 rounded-lg mb-6 text-center font-medium mx-2 max-w-full overflow-hidden ${message.timesUp
                      ? 'times-up-glow'
                      : message.type === 'success'
                        ? `bg-success/20 text-success border border-success/30 ${message.text.includes('Correct') || message.text.includes('Good') || message.text.includes('Great') || message.text.includes('Excellent') || message.text.includes('Ammazza') || message.text.includes('Unstoppable') || message.text.includes('Bonus') ? 'message-dramatic message-correct' : ''}`
                        : message.type === 'error'
                          ? `bg-error/20 text-error border border-error/30 ${message.text.includes('Incorrect') ? 'message-dramatic message-incorrect' : ''}`
                          : 'bg-warning/20 text-warning border border-warning/30'
                      }`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: 1,
                      scale:
                        message.text.includes('Incorrect') ||
                          message.text.includes('Correct') ||
                          message.text.includes('Good') ||
                          message.text.includes('Great') ||
                          message.text.includes('Excellent') ||
                          message.text.includes('Ammazza') ||
                          message.text.includes('Unstoppable') ||
                          message.text.includes('Bonus')
                          ? window.innerWidth < 768
                            ? 1.05
                            : 1.2
                          : 1,
                      y:
                        message.text.includes('Incorrect') ||
                          message.text.includes('Correct') ||
                          message.text.includes('Good') ||
                          message.text.includes('Great') ||
                          message.text.includes('Excellent') ||
                          message.text.includes('Ammazza') ||
                          message.text.includes('Unstoppable') ||
                          message.text.includes('Bonus')
                          ? [-10, 0, -5, 0]
                          : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                      duration:
                        message.text.includes('Incorrect') ||
                          message.text.includes('Correct') ||
                          message.text.includes('Good') ||
                          message.text.includes('Great') ||
                          message.text.includes('Excellent') ||
                          message.text.includes('Ammazza') ||
                          message.text.includes('Unstoppable') ||
                          message.text.includes('Bonus')
                          ? 0.8
                          : 0.3,
                      ease:
                        message.text.includes('Incorrect') ||
                          message.text.includes('Correct') ||
                          message.text.includes('Good') ||
                          message.text.includes('Great') ||
                          message.text.includes('Excellent') ||
                          message.text.includes('Ammazza') ||
                          message.text.includes('Unstoppable') ||
                          message.text.includes('Bonus')
                          ? 'easeOut'
                          : 'easeInOut',
                    }}
                  >
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showSplash && (
                  <motion.div
                    key="splash"
                    className="splash-screen"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    onClick={() => setShowSplash(false)}
                  >
                    <div className="splash-content">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 1, type: 'spring' }}
                      >
                        <h1 className="splash-title">STREAX CHAMP</h1>
                        <p className="splash-subtitle">Press anywhere to start</p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {!quizStarted ? (
                  <motion.div
                    key="start"
                    className="text-center py-6 relative"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Animated Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {/* Floating Gaming Icons */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute text-xl opacity-20"
                          style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 20}%`,
                          }}
                          animate={{
                            y: [0, -15, 0],
                            rotate: [0, 360],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            delay: i * 0.5,
                          }}
                        >
                          {['🎮', '🏆', '⚡', '🔥', '💎', '🎯'][i]}
                        </motion.div>
                      ))}
                    </div>

                    {/* Main Hero Section */}
                    <motion.div
                      className="relative z-10 mb-8"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                    >
                      {/* Clean space where title used to be */}
                      <div className="h-20 mb-6"></div>

                      {/* Pulsing Subtitle */}
                      <motion.div className="text-center mb-2">
                        <button
                          onClick={() => {
                            setShowTopicMenu(true);
                            setTopicQuizStatus('idle');
                          }}
                          className="modern-button modern-button-primary px-4 py-2 font-bold"
                        >
                          {selectedTopic ? `Topic: ${selectedTopic.title}` : 'Topic Select'}
                        </button>
                      </motion.div>

                      {/* Topic menu handled via early return above */}
                    </motion.div>

                    {/* Stats Display */}
                    <motion.div
                      className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <div className="modern-card p-3 bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30">
                        <motion.div
                          className="text-xl font-bold text-accent"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {NUM_QUESTIONS}
                        </motion.div>
                        <div className="text-xs text-secondary">Questions</div>
                      </div>
                      <div className="modern-card p-3 bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30">
                        <motion.div
                          className="text-xl font-bold text-warning"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        >
                          15s
                        </motion.div>
                        <div className="text-xs text-secondary">Per Question</div>
                      </div>
                      <div className="modern-card p-3 bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
                        <motion.div
                          className="text-xl font-bold text-success"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        >
                          1st
                        </motion.div>
                        <div className="text-xs text-secondary">Glory Awaits</div>
                      </div>
                    </motion.div>

                    {/* Epic Start Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
                    >
                      <motion.button
                        onClick={() => {
                          if (quizStarted) return;
                          if (selectedTopic && (!selectedTopicQuiz || topicQuizStatus !== 'ready')) return;
                          if (!selectedTopic) { setShowNoTopicPrompt(true); return; }
                          startQuiz();
                        }}
                        disabled={(!!selectedTopic && (!selectedTopicQuiz || topicQuizStatus !== 'ready')) || quizStarted}
                        className={`relative px-8 py-4 text-xl font-black text-white rounded-xl overflow-hidden group transform transition-all duration-200 ${selectedTopic && (!selectedTopicQuiz || topicQuizStatus !== 'ready') ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                        style={{
                          background:
                            'linear-gradient(45deg, #ff4500, #ff6b35, #ff8c00, #ffa500, #ff4500)',
                          backgroundSize: '300% 300%',
                        }}
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        whileHover={{
                          boxShadow: [
                            '0 10px 30px rgba(255, 69, 0, 0.4)',
                            '0 10px 30px rgba(255, 107, 53, 0.4)',
                            '0 10px 30px rgba(255, 140, 0, 0.4)',
                          ],
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="relative z-10 flex items-center gap-3">
                          <motion.span
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          >
                            _
                          </motion.span>
                          {quizStarted ? 'IN PROGRESS' : (
                            selectedTopic
                              ? topicQuizStatus === 'ready'
                                ? 'START QUIZ'
                                : topicQuizStatus === 'error'
                                  ? 'GENERATION FAILED'
                                  : 'GENERATING…'
                              : 'START QUIZ'
                          )}
                          <motion.span
                            animate={{ rotate: [0, -360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          >
                            _
                          </motion.span>
                        </span>
                        {selectedTopic && (
                          <div className="mt-4 text-center">
                            {topicQuizStatus === 'idle' && <span className="text-secondary text-sm">Select a topic to start.</span>}
                            {topicQuizStatus === 'loading' && (
                              <div className="flex flex-col items-center gap-2">
                                <LoadingDots text="Thinking" />
                                <span className="text-xs text-secondary animate-pulse">Gemini is researching and drafting questions...</span>
                              </div>
                            )}
                            {topicQuizStatus === 'ready' && <span className="text-success text-sm font-bold">✓ Quiz Loaded</span>}
                            {topicQuizStatus === 'error' && <span className="text-error text-sm">Failed to load quiz. Try another topic.</span>}
                          </div>
                        )}

                        {/* Button shine effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        />
                      </motion.button>
                    </motion.div>

                    {/* User Info Display - Gamified Square Design */}
                  </motion.div>
                ) : showGap ? (
                  <motion.div
                    key="gap"
                    className="text-center py-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-8">
                      <motion.h3
                        className="text-2xl font-bold text-secondary mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        Loading Next Question
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ...
                        </motion.span>
                      </motion.h3>

                      {/* Loading Animation */}
                      <motion.div
                        className="flex justify-center mb-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex space-x-2">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-3 h-3 bg-accent rounded-full"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>

                      {multiplier > 0 && (
                        <motion.div
                          className="text-4xl font-bold text-success"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.6 }}
                        >
                          {getMultiplierText(multiplier)} Streak!
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ) : (showBonusQuestion && bonusQuestion) ? (
                  <motion.div
                    key="bonus"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-3xl font-bold text-warning mb-2">BONUS QUESTION!</h3>
                      <p className="text-secondary">
                        Perfect score! Here's your chance for an extra point!
                      </p>

                      {/* Prominent Bonus Timer */}
                      {timerActive && (
                        <div className="timer-container my-6">
                          <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                        </div>
                      )}
                    </div>

                    <motion.div
                      className="mb-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h4 className="text-xl md:text-2xl font-semibold mb-6 text-center">
                        {bonusQuestion?.question}
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        {bonusQuestion?.answers.map((answer) => (
                          <button
                            key={answer}
                            onClick={() => handleBonusAnswer(answer, bonusQuestion?.correctAnswer || '')}
                            disabled={selectedAnswer !== null}
                            className={`quiz-option quiz-option-big ${selectedAnswer && answer === correctAnswer
                              ? 'correct'
                              : selectedAnswer === answer
                                ? 'incorrect'
                                : ''
                              }`}
                          >
                            <span className="relative z-10 font-bold text-left text-lg">
                              {answer}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                ) : showScore ? (
                  <motion.div
                    key="score"
                    className="text-center py-12"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    style={{ position: 'relative', zIndex: 10 }}
                  >
                    {/* Celebration Background Animation */}
                    <CelebrationBackground score={score} />

                    <div className="mb-8 relative z-20">
                      <motion.div
                        className="mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                      >
                        <ScoreFace
                          score={score}
                          totalQuestions={NUM_QUESTIONS + (showBonusQuestion ? 1 : 0)}
                        />
                      </motion.div>
                      <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center">
                        Quiz Complete!
                      </h2>
                      <div className="text-center mb-6">
                        <motion.p
                          className="text-2xl md:text-3xl mb-4 font-semibold"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          Your Final Score:
                        </motion.p>
                        <motion.div
                          className="relative inline-block"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3, type: 'spring', damping: 8 }}
                          style={{
                            background:
                              score >= 4
                                ? 'linear-gradient(45deg, #FFD700, #FFA500, #FF6B6B)'
                                : score >= 3
                                  ? 'linear-gradient(45deg, #4ECDC4, #45B7D1, #96CEB4)'
                                  : 'linear-gradient(45deg, #6B7280, #9CA3AF, #D1D5DB)',
                            padding: '20px 40px',
                            borderRadius: '20px',
                            border: '4px solid rgba(255,255,255,0.3)',
                            boxShadow:
                              '0 10px 30px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.1)',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Animated background sparkles */}
                          {score >= 3 && (
                            <>
                              <motion.div
                                className="absolute"
                                style={{
                                  top: '10px',
                                  left: '10px',
                                  width: '6px',
                                  height: '6px',
                                  backgroundColor: 'rgba(255,255,255,0.8)',
                                  borderRadius: '50%',
                                }}
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                              />
                              <motion.div
                                className="absolute"
                                style={{
                                  top: '30px',
                                  right: '15px',
                                  width: '4px',
                                  height: '4px',
                                  backgroundColor: 'rgba(255,255,255,0.6)',
                                  borderRadius: '50%',
                                }}
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                              />
                              <motion.div
                                className="absolute"
                                style={{
                                  bottom: '10px',
                                  left: '20px',
                                  width: '5px',
                                  height: '5px',
                                  backgroundColor: 'rgba(255,255,255,0.7)',
                                  borderRadius: '50%',
                                }}
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
                              />
                            </>
                          )}

                          <motion.span
                            className="text-6xl md:text-8xl font-black text-white relative z-10"
                            style={{
                              textShadow:
                                '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
                              fontFamily: 'Impact, Arial Black, sans-serif',
                              letterSpacing: '2px',
                            }}
                            animate={{
                              textShadow:
                                score >= 3
                                  ? [
                                    '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
                                    '2px 2px 4px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.5)',
                                    '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
                                  ]
                                  : '2px 2px 4px rgba(0,0,0,0.5)',
                            }}
                            transition={{ duration: 2, repeat: score >= 3 ? Infinity : 0 }}
                          >
                            {score}/{NUM_QUESTIONS + (showBonusQuestion ? 1 : 0)}
                          </motion.span>
                        </motion.div>
                      </div>
                      <motion.p
                        className="text-secondary mt-4 text-lg font-semibold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        {score >= 4
                          ? 'Outstanding Performance!'
                          : score >= 3
                            ? 'Great Job!'
                            : 'Better Luck Next Time'}
                      </motion.p>
                    </div>
                    <div className="flex gap-4 justify-center relative z-20">
                      <button
                        onClick={startQuiz}
                        className="modern-button modern-button-primary px-6 py-3"
                      >
                        Play Again
                      </button>
                      <button
                        onClick={resetQuiz}
                        className="modern-button modern-button-secondary px-6 py-3"
                      >
                        Back to Start
                      </button>
                    </div>
                    {/* Hot Topics moved to section below */}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`question-${currentQuestionIndex}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Question Header with prominent timer */}
                    <div className="mb-6">
                      {/* Question info and progress */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <motion.div
                            className="text-base font-semibold text-secondary"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            Question {currentQuestionIndex + 1} of {NUM_QUESTIONS}
                          </motion.div>
                          <div className="flex gap-1">
                            {Array.from({ length: NUM_QUESTIONS }).map((_, i) => (
                              <motion.div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i < currentQuestionIndex
                                  ? 'bg-success'
                                  : i === currentQuestionIndex
                                    ? 'bg-accent'
                                    : 'bg-border'
                                  }`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Prominent Timer Display */}
                      {timerActive && (
                        <div className="timer-container mb-4">
                          <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                        </div>
                      )}
                    </div>

                    <motion.div
                      className="mb-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h4 className="text-lg md:text-xl font-semibold mb-4 leading-relaxed">
                        {questions[currentQuestionIndex]?.question}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {shuffledAnswers.map((answer, index) => (
                          <motion.button
                            key={answer}
                            onClick={() =>
                              handleAnswer(
                                answer,
                                questions[currentQuestionIndex]?.correctAnswer || ''
                              )
                            }
                            disabled={selectedAnswer !== null}
                            className={`quiz-option quiz-option-big ${selectedAnswer && answer === correctAnswer
                              ? 'correct'
                              : selectedAnswer === answer
                                ? 'incorrect'
                                : ''
                              }`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                            whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                          >
                            <span className="relative z-10 font-bold text-left text-base">
                              {answer}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Side Panel: History (idle) OR Topic Leaderboard (score screen) */}
          {(!quizStarted || showScore) && (
            <div className="lg:col-span-1">
              <div className="modern-card p-6 sticky top-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  {showScore ? (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-2xl font-bold text-gradient">{selectedTopic?.title || 'Topic'} Leaderboard</h2>
                      </div>
                      <div className="relative min-h-[160px] space-y-3">
                        {topicLbLoading && (
                          <div className="py-2 text-center"><LoadingDots text="Loading" /></div>
                        )}
                        {(!topicLeaderboard || topicLeaderboard.length === 0) && !topicLbLoading && (
                          <div className="text-center py-8 text-secondary text-sm">No scores yet.</div>
                        )}
                        {topicLeaderboard && topicLeaderboard.slice(0, 10).map((e, i) => (
                          <div key={e.userKey + i} className="flex items-center gap-4 bg-base-200/40 border border-base-300/40 rounded-lg px-4 py-2">
                            <span className="font-bold text-accent w-7 text-right">{i + 1}.</span>
                            <span className="font-semibold truncate max-w-[120px]">{e.nickname}</span>
                            <span className="ml-auto text-success font-extrabold text-lg">{e.score}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-2xl font-bold text-gradient">History</h2>
                      </div>
                      <div className="relative min-h-[160px] space-y-3">
                        {historyLoading && <div className="text-center py-4 text-secondary text-xs"><LoadingDots text="Loading" /></div>}
                        {!authUser && !historyLoading && (
                          <div className="text-center py-8 text-secondary text-sm italic">Log in to save history.</div>
                        )}
                        {authUser && !historyLoading && history.length === 0 && (
                          <div className="text-center py-8 text-secondary text-sm">No plays yet.</div>
                        )}
                        {history.slice(0, 10).map((h, i) => (
                          <div key={h.id} className="flex items-center gap-3 bg-base-200/40 border border-base-300/40 rounded-lg px-3 py-2">
                            <span className="text-accent font-bold w-6 text-right">{i + 1}.</span>
                            <button
                              onClick={() => { setSelectedTopic({ slug: h.slug, title: h.title }); localStorage.setItem('streax:selectedTopic', JSON.stringify({ slug: h.slug, title: h.title })); }}
                              className="text-xs px-3 py-1 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 font-medium truncate max-w-[110px]"
                            >{h.title}</button>
                            <span className="ml-auto text-success font-extrabold text-lg">{h.score}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Leaderboard + Hot Topics */}
      {!quizStarted && (
        <div className="mt-12 grid gap-10">
          <div>
            <h2 className="text-xl font-bold mb-4 tracking-wide text-secondary">Global Leaderboard</h2>
            <div className="modern-card p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  {landingSummaryLoading ? <LoadingDots text="Loading" /> : <span className="text-xs opacity-60">Top scores today</span>}
                  <button onClick={() => refreshLanding()} className="p-1 rounded hover:bg-base-300" aria-label="Refresh" title="Refresh">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-8.594 3.5 1 1 0 1 0-1.414 1.414A7 7 0 0 0 19 13c0-3.86-3.141-7-7-7Z" /></svg>
                  </button>
                </div>
                {(landingSummary?.globalTop || []).slice(0, 10).map((e, i) => (
                  <div key={e.slug + e.nickname + i} className="flex items-center gap-4 bg-base-200/40 border border-base-300/40 rounded-lg px-4 py-3">
                    <span className="font-bold text-accent min-w-7 text-right">{i + 1}.</span>
                    <span className="font-semibold truncate max-w-[120px]">{e.nickname}</span>
                    <button
                      onClick={() => { setSelectedTopic({ slug: e.slug, title: e.title }); localStorage.setItem('streax:selectedTopic', JSON.stringify({ slug: e.slug, title: e.title })); }}
                      className="text-xs px-3 py-1 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 font-medium mr-auto"
                    >{e.title}</button>
                    <span className="text-success font-extrabold text-xl tracking-wide">{e.score}</span>
                  </div>
                ))}
                {(landingSummary?.globalTop?.length || 0) === 0 && (
                  <div className="col-span-full text-center text-secondary py-6 text-sm">
                    {(authUser?.nickname || userInfo?.displayName || 'You')}, showcase your streak!
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4 tracking-wide text-secondary">Hot Topics</h2>
            <HotTopics
              topics={landingSummary?.hotTopics || []}
              loading={landingSummaryLoading}
              onSelect={(slug, title) => {
                setSelectedTopic({ slug, title });
                localStorage.setItem('streax:selectedTopic', JSON.stringify({ slug, title }));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
