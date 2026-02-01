import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveRobotProps {
  username: string;
  errorMessage?: string | undefined;
  hasPlayed?: boolean;
  totalPoints?: number; // New prop for aggregated score
  forceState?: 'neutral' | 'happy' | 'angry' | 'dead' | 'surprised';
}

export const InteractiveRobot: React.FC<InteractiveRobotProps> = ({ username, errorMessage, hasPlayed, totalPoints = 0, forceState }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [lines] = useState<string[]>([]);
  // Removed exhausted state, using time-based trigger
  // Removed globalMousePosition state
  const [progress, setProgress] = useState(0); // Progress bar (0-100)
  const [systemStatus] = useState<{ ai: boolean; db: boolean }>({ ai: true, db: true });
  const [healingActive] = useState(false);
  const [blinkOpen, setBlinkOpen] = useState(true); // Control for eye blinking
  const [timeOnPage, setTimeOnPage] = useState(0); // Track time for timeout message
  const [isNear, setIsNear] = useState(false); // Proximity detection
  const [isVisorHovered, setIsVisorHovered] = useState(false); // New specific hover state
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);

  const TIMEOUT_LIMIT = 20; // Seconds before "Inside with you" message
  const TIMEOUT_MSG = "That’s all you get. Inside with you. The real challenge awaits.";

  // --- BLINKING LOGIC ---
  // Only blink if there is NO error (circuits unbroken)
  useEffect(() => {
    if (errorMessage) {
      setBlinkOpen(true); // Force eyes open on error
      return;
    }

    let timeoutId: number;
    const triggerBlink = () => {
      setBlinkOpen(false); // Close eyes
      setTimeout(() => {
        setBlinkOpen(true); // Open eyes after short duration
        // Schedule next blink randomly between 2.5s and 6s
        timeoutId = window.setTimeout(triggerBlink, Math.random() * 3500 + 2500);
      }, 150); // Blink duration
    };

    // Initial blink schedule
    timeoutId = window.setTimeout(triggerBlink, Math.random() * 3000 + 1000);

    return () => clearTimeout(timeoutId);
  }, [errorMessage]);

  // Robot dialogues are now hardcoded - no need to fetch from API
  // Disabled API polling to reduce unnecessary requests - > lines for future implementation
  /*
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/robot/dialogues/today');
        const data = await r.json();
        const fetched: string[] = Array.isArray(data?.lines) ? data.lines.slice(0, 20) : [];
        if (!cancelled) {
          setLines(fetched);
          if (data.systemStatus) setSystemStatus(data.systemStatus);
          setHealingActive(!!data.healingInProgress);
        }
      } catch {
        // noop; keep default fallback below
      }
    })();
    return () => { cancelled = true; };
  }, []);
  */

  const messages = useMemo(() => {
    // PRIORITY: If an error message is provided, show only that
    if (errorMessage) {
      return [errorMessage];
    }

    const statusLines: string[] = [];
    if (healingActive) {
      statusLines.push('STAND BY. REPAIRING DATA-STREAM...');
    } else if (!systemStatus.ai) {
      statusLines.push('Critical Anomaly: Gemini connection severed.');
      statusLines.push('I am currently out of juice. Try again in 2... if I heal.');
      statusLines.push('Quota Exhausted. The Great Eye is resting.');
    }
    if (!systemStatus.db) {
      statusLines.push('Firestore core offline. Memories... fading.');
    }

    const fallback = [
      `Halt, ${username}. Enjoy your experience.`,
      'New comer? Keep moving, we have a lot to show.',
      'This page is not everything we have to offer.',
      'Still lingering? Hmph.',
      'Enough gawking. Inside.'
    ];
    const base = lines.length ? lines : fallback;
    return [...statusLines, ...base.slice(0, 20)];
  }, [lines, username, systemStatus, errorMessage, healingActive]);

  // Track global mouse position for robot following AND proximity
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Calculate relative position from center (-1 to 1)
      const relativeX = (event.clientX - centerX) / (window.innerWidth / 2);
      const relativeY = (event.clientY - centerY) / (window.innerHeight / 2);

      // setGlobalMousePosition({ x: relativeX, y: relativeY }); // Removed

      // Proximity Check (using headRef if available, or just center screen)
      // Check if mouse is within a certain radius of the center (roughly where robot is)
      const dist = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      // Threshold: 0.15 means very close to the screen center (precise visor focus)
      setIsNear(dist < 0.15);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Timer for "Timeout" state
  useEffect(() => {
    if (hasPlayed) return; // Don't run timer if user has played

    const timer = setInterval(() => {
      setTimeOnPage(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasPlayed]);

  // Calculate robot position (parallax effect)
  const robotHorizontalOffset = useMemo(() => {
    // Strict Focus: If Timeout is active AND Visor NOT hovered -> Robot stays center (0)
    if (timeOnPage > TIMEOUT_LIMIT && !hasPlayed && !errorMessage && !isVisorHovered) {
      return 0;
    }

    if (isNear || isHovered) {
      return (mousePos.x / window.innerWidth - 0.5) * 20; // Reverted centering
    }
    return 0; // Default center
  }, [mousePos.x, isNear, isHovered, timeOnPage, hasPlayed, errorMessage, isVisorHovered]);

  // Handle mouse movement for local eye tracking
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle global mouse movement for eye tracking
  useEffect(() => {
    const handleWindowMouseMove = (event: MouseEvent) => {
      // If we have a ref to the container, calculate relative position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        setMousePos({
          x: event.clientX - centerX,
          y: event.clientY - centerY
        });
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, []);

  // Calculate eye position for the visor display
  const getEyeOffset = () => {
    // If Timeout Active -> Look down strictly
    // EXCEPTION: If user hovers VISOR, we allow tracking/interaction
    if (timeOnPage > TIMEOUT_LIMIT && !hasPlayed && !errorMessage && !isVisorHovered) {
      return { x: 0, y: 15 }; // Look down at the CTA, ignore cursor
    }

    if (isNear || isHovered) {
      const x = (mousePos.x - window.innerWidth / 2) / 30;
      const y = (mousePos.y - window.innerHeight / 2) / 30;
      return { x, y };
    }
    return { x: 0, y: 0 };
  };

  const eyeOffset = getEyeOffset();

  // Speech bubble is visually attached above the robot head.

  // Cycle through messages when hovered
  useEffect(() => {
    // Stop cycling if timeout reached
    if (timeOnPage > TIMEOUT_LIMIT && !hasPlayed) return;

    if (isHovered) {
      const interval = window.setInterval(() => {
        setCurrentMessage((prev) => {
          const next = prev + 1;
          if (next >= messages.length) return 0; // Loop or stay? User said "never finish". Let's loop.
          setProgress(0); // Reset progress when advancing
          return next;
        });
      }, 3000);
      return () => clearInterval(Number(interval));
    }
  }, [isHovered, messages.length, timeOnPage, hasPlayed]);

  // Progress bar animation (fills up to 100% over 3 seconds)
  useEffect(() => {
    if (timeOnPage > TIMEOUT_LIMIT && !hasPlayed) return;

    if (isHovered) {
      setProgress(0);
      const startTime = Date.now();
      const duration = 3000;
      const frame = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);
        if (elapsed < duration) {
          requestAnimationFrame(frame);
        }
      };
      requestAnimationFrame(frame);
    }
  }, [isHovered, currentMessage, timeOnPage, hasPlayed]);

  // --- FACIAL EXPRESSION LOGIC ---
  type FaceState = 'neutral' | 'happy' | 'angry' | 'dead' | 'surprised';

  const currentFace: FaceState = useMemo(() => {
    if (forceState) return forceState;
    if (errorMessage) return 'dead'; // Dead/Error takes priority
    if (isVisorHovered) return 'happy'; // Direct interaction = Happy
    if (isHovered) return 'surprised'; // General attention = Alert/Surprised
    return 'neutral';
  }, [errorMessage, isVisorHovered, isHovered, forceState]);

  // Eye Variants for Morphing
  const leftEyeVariant = {
    neutral: { height: 10, width: 10, borderRadius: '50%', rotate: 0, scaleY: 1 }, // Default Circle
    happy: { height: 6, width: 14, borderRadius: '4px', rotate: -15, scaleY: 1 }, // Inverse arch hint
    angry: { height: 4, width: 14, borderRadius: '2px', rotate: 20, scaleY: 1 },
    dead: { height: 2, width: 14, borderRadius: '0px', rotate: 45, scaleY: 1 }, // X shape part 1 (simulated with line)
    surprised: { height: 16, width: 12, borderRadius: '50%', rotate: 0, scaleY: 1 },
    blink: { scaleY: 0.1 },
    active: { height: 12, width: 8, borderRadius: '50%', rotate: 0, scaleY: 1 } // Oval (Active)
  };

  const rightEyeVariant = {
    neutral: { height: 10, width: 10, borderRadius: '50%', rotate: 0, scaleY: 1 }, // Default Circle
    happy: { height: 6, width: 14, borderRadius: '4px', rotate: 15, scaleY: 1 },
    angry: { height: 4, width: 14, borderRadius: '2px', rotate: -20, scaleY: 1 },
    dead: { height: 2, width: 14, borderRadius: '0px', rotate: -45, scaleY: 1 },
    surprised: { height: 16, width: 12, borderRadius: '50%', rotate: 0, scaleY: 1 },
    blink: { scaleY: 0.1 },
    active: { height: 12, width: 8, borderRadius: '50%', rotate: 0, scaleY: 1 } // Oval (Active)
  };

  // Determine current variant based on blink state
  // If blinking (and not dead/angry which shouldn't blink usually, but logic marks blinking disabled on error)
  const getEyeState = () => {
    if (!blinkOpen && currentFace !== 'dead') return 'blink';
    // If neutral (no specific face triggers), check if we should be in "Active" (Oval) or "Idle" (Circle/Neutral)
    if (currentFace === 'neutral') {
      // If Near OR Hovered -> Active (Oval)
      if (isNear || isHovered) return 'active';
      // Else -> Neutral (Circle)
      return 'neutral';
    }
    return currentFace;
  };

  const [tempEmote, setTempEmote] = useState<string | null>(null);

  // Trigger random emote on happy state (visor hover)
  useEffect(() => {
    if (currentFace === 'happy') {
      const emotes = [':)', ':D', ':O', 'UwU', '^.^', '<3', 'xD'];
      // Ensure we always fallback to a string if something goes wrong, though index is safe here
      setTempEmote(emotes[Math.floor(Math.random() * emotes.length)] || ':)');
    } else {
      setTempEmote(null);
    }
  }, [currentFace]);

  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        width: '100%',
        minHeight: '220px',
        position: 'relative',
      }}
      animate={{
        x: robotHorizontalOffset
      }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Robot Head - Futuristic Design */}
      <div ref={headRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px' }}>
        {/* Speech Bubble moved to the parent container so left:50% reliably centers over the head */}
        <AnimatePresence>
          {(isHovered || errorMessage) && (
            <motion.div
              ref={bubbleRef}
              initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              style={{
                position: 'absolute',
                top: -55,
                left: '50%',
                backgroundColor: errorMessage ? 'rgba(239, 68, 68, 0.95)' : 'rgba(17, 24, 39, 0.95)', // Darker, more opaque
                backdropFilter: 'blur(8px)',
                border: errorMessage ? '1px solid #ef4444' : '1px solid #7c3aed',
                color: 'white',
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 0', // Chat bubble style
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: '"Share Tech Mono", monospace', // Tech font feel
                zIndex: 30,
                whiteSpace: 'normal',
                maxWidth: '260px',
                width: 'max-content',
                boxShadow: errorMessage
                  ? '0 10px 25px rgba(239, 68, 68, 0.4), inset 0 0 0 1px rgba(255,255,255,0.1)'
                  : '0 10px 25px rgba(124, 58, 237, 0.3), inset 0 0 0 1px rgba(255,255,255,0.1)',
                textAlign: 'center',
                overflow: 'hidden',
                transformOrigin: 'bottom left'
              }}
            >
              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: errorMessage ? '#ef4444' : '#a78bfa', opacity: 0.8 }} />
              {/* Translucent progress bar */}
              {!(timeOnPage > TIMEOUT_LIMIT && !hasPlayed) && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    width: `${progress}%`,
                    background: 'rgba(255, 255, 255, 0.4)',
                    transition: 'width 0.1s linear',
                    borderRadius: '0 0 12px 12px'
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {(timeOnPage > TIMEOUT_LIMIT && !hasPlayed)
                  ? TIMEOUT_MSG
                  : (tempEmote || messages[currentMessage])
                }
              </span>
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: errorMessage ? '8px solid #ef4444' : '8px solid #7c3aed', // Match bubble color
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.03 }}
          style={{
            position: 'relative',
            width: '140px',
            height: '120px',
            background: 'linear-gradient(135deg, #374151 0%, #111827 100%)',
            borderRadius: '24px', // Slightly rounder
            border: errorMessage ? '3px solid #ef4444' : '3px solid #dc2626',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: errorMessage
              ? '0 0 30px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 20px rgba(0,0,0,0.5)'
              : '0 15px 35px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 1px rgba(0,0,0,0.5)', // Deep shadow + rim light
            marginTop: 30,
            overflow: 'visible',
            filter: errorMessage ? 'grayscale(0.8) sepia(0.5) hue-rotate(-50deg)' : 'none'
          }}
        >
          {/* (speech bubble removed from here; parent now renders the bubble centered over the head) */}
          {/* Top sensors/antennas */}
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              left: '20px',
              width: '12px',
              height: '12px',
              background: 'linear-gradient(45deg, #374151, #1f2937)',
              border: '2px solid #dc2626',
              borderRadius: '3px',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.3)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '20px',
              width: '12px',
              height: '12px',
              background: 'linear-gradient(45deg, #374151, #1f2937)',
              border: '2px solid #dc2626',
              borderRadius: '3px',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.3)'
            }}
          />

          {/* Side panels */}
          <div
            style={{
              position: 'absolute',
              left: '-8px',
              top: '30px',
              width: '12px',
              height: '25px',
              background: 'linear-gradient(90deg, #374151, #1f2937)',
              border: '2px solid #dc2626',
              borderRadius: '0 3px 3px 0',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.8), 0 5px 10px rgba(0,0,0,0.4)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '-8px',
              top: '30px',
              width: '12px',
              height: '25px',
              background: 'linear-gradient(90deg, #1f2937, #374151)',
              border: '2px solid #dc2626',
              borderRadius: '3px 0 0 3px',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.8), 0 5px 10px rgba(0,0,0,0.4)'
            }}
          />

          {/* Main visor/screen */}
          <div
            onMouseEnter={() => setIsVisorHovered(true)} // DETECT VISOR HOVER
            onMouseLeave={() => setIsVisorHovered(false)}
            style={{
              position: 'relative',
              width: '110px',
              height: '70px',
              background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
              border: '2px solid #dc2626',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)',
              cursor: 'cell' // Indicate interaction
            }}
          >
            {/* Visor reflection effect */}
            <div
              style={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                right: '5px',
                height: '20px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                borderRadius: '4px',
              }}
            />

            {/* Eyes/tracking dots in the visor */}
            <motion.div
              animate={{
                x: eyeOffset.x,
                y: eyeOffset.y,
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 15 }}
              style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              {/* Left eye */}
              <motion.div
                variants={leftEyeVariant}
                animate={getEyeState()}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  backgroundColor: errorMessage ? '#ef4444' : (currentFace === 'happy' ? '#ff69b4' : '#00ff88'), // Pink for happy
                  boxShadow: errorMessage ? '0 0 8px #ef4444' : (currentFace === 'happy' ? '0 0 10px #ff69b4' : '0 0 8px #00ff88'),
                }}
              />
              {/* Right eye */}
              <motion.div
                variants={rightEyeVariant}
                animate={getEyeState()}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  backgroundColor: errorMessage ? '#ef4444' : (currentFace === 'happy' ? '#ff69b4' : '#00ff88'), // Pink for happy
                  boxShadow: errorMessage ? '0 0 8px #ef4444' : (currentFace === 'happy' ? '0 0 10px #ff69b4' : '0 0 8px #00ff88'),
                }}
              />
            </motion.div>

            {/* Scanning line effect */}
            <motion.div
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                position: 'absolute',
                top: '0',
                bottom: '0',
                width: '2px',
                background: errorMessage
                  ? 'linear-gradient(to bottom, transparent, #ef4444, transparent)' // Red scan line
                  : 'linear-gradient(to bottom, transparent, #00ff88, transparent)',
                boxShadow: errorMessage ? '0 0 10px #ef4444' : '0 0 10px #00ff88',
              }}
            />
          </div>

          {/* Bottom chin piece */}
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 40,
              height: 10,
              background: 'linear-gradient(135deg, #374151, #1f2937)',
              border: '2px solid #dc2626',
              borderRadius: '0 0 8px 8px',
            }}
          />
        </motion.div>
      </div>

      {/* Styled Call-to-Action Box (replaces exhausted message) */}
      <AnimatePresence>
        {timeOnPage > TIMEOUT_LIMIT && !hasPlayed && !errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              marginTop: 20,
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.8) 0%, rgba(45, 212, 191, 0.8) 100%)', // Red to Teal
              padding: '2px', // Border gradient
              borderRadius: '12px',
              boxShadow: '0 0 20px rgba(45, 212, 191, 0.5)', // Teal glow
              cursor: 'pointer'
            }}
          >
            <div style={{
              background: '#111827',
              borderRadius: '10px',
              padding: '12px 20px',
              color: '#fff',
              fontFamily: 'monospace',
              textAlign: 'center',
              textShadow: '0 0 5px rgba(255,255,255,0.5)'
            }}>
              Hey, it was real hard to build this app, please try it out!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Robot Neck/Body */}
      <motion.div
        animate={{
          scale: isHovered ? 1.02 : 1,
        }}
        style={{
          marginTop: '8px',
          width: '50px',
          height: '30px',
          background: 'linear-gradient(135deg, #374151, #1f2937)',
          border: '2px solid #dc2626',
          borderRadius: '0 0 12px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* Status lights */}
        <motion.div
          animate={{
            backgroundColor: isHovered ? '#00ff88' : '#22c55e',
          }}
          style={{
            width: '4px',
            height: '15px',
            backgroundColor: '#22c55e',
            borderRadius: '2px',
            boxShadow: '0 0 4px currentColor',
          }}
        />
        <motion.div
          animate={{
            backgroundColor: isHovered ? '#3b82f6' : '#60a5fa',
          }}
          style={{
            width: '4px',
            height: '15px',
            backgroundColor: '#60a5fa',
            borderRadius: '2px',
            boxShadow: '0 0 4px currentColor',
          }}
        />
      </motion.div>

      {/* Username label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: 12,
        }}
      >

        <span style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: '#00ff88',
          textShadow: '0 0 5px #00ff88',
          whiteSpace: 'nowrap',
          letterSpacing: '0.05em'
        }}>
          {username}: {totalPoints}
        </span>
      </motion.div>
    </motion.div>
  );
};
