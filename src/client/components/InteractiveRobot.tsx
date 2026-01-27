import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveRobotProps {
  username: string;
}

export const InteractiveRobot: React.FC<InteractiveRobotProps> = ({ username }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [globalMousePosition, setGlobalMousePosition] = useState({ x: 0, y: 0 });
  const [progress, setProgress] = useState(0); // Progress bar (0-100)
  const [systemStatus, setSystemStatus] = useState<{ ai: boolean; db: boolean }>({ ai: true, db: true });
  const [healingActive, setHealingActive] = useState(false);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);

  // Robot dialogues are now hardcoded - no need to fetch from API
  // Disabled API polling to reduce unnecessary requests
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
  }, [lines, username, systemStatus]);

  // Track global mouse position for robot following
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Calculate relative position from center (-1 to 1)
      const relativeX = (event.clientX - centerX) / (window.innerWidth / 2);
      const relativeY = (event.clientY - centerY) / (window.innerHeight / 2);

      setGlobalMousePosition({ x: relativeX, y: relativeY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate robot horizontal position based on mouse
  const robotHorizontalOffset = useMemo(() => {
    const maxMove = 150; // Maximum pixels to move left/right
    return globalMousePosition.x * maxMove;
  }, [globalMousePosition.x]);

  // Handle mouse movement for local eye tracking
  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setMousePosition({
      x: event.clientX - centerX,
      y: event.clientY - centerY,
    });
  };

  // Calculate eye position for the visor display
  const getEyeOffset = () => {
    const maxMove = 8;

    // Use global mouse Y position for vertical eye movement
    const verticalOffset = globalMousePosition.y * maxMove;

    // Use local mouse X position for horizontal eye movement
    const horizontalOffset = (mousePosition.x / 100) * maxMove;

    return { x: horizontalOffset, y: verticalOffset };
  };

  const eyeOffset = getEyeOffset();

  // Speech bubble is visually attached above the robot head.

  // Cycle through messages when hovered
  useEffect(() => {
    if (isHovered && !exhausted) {
      const interval = window.setInterval(() => {
        setCurrentMessage((prev) => {
          const next = prev + 1;
          if (next >= messages.length) {
            setExhausted(true);
            return prev; // stop advancing
          }
          setProgress(0); // Reset progress when advancing
          return next;
        });
      }, 3000);
      return () => clearInterval(Number(interval));
    }
  }, [isHovered, messages.length, exhausted]);

  // Progress bar animation (fills up to 100% over 3 seconds)
  useEffect(() => {
    if (isHovered && !exhausted) {
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
  }, [isHovered, currentMessage, exhausted]);

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
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Robot Head - Futuristic Design */}
      <div ref={headRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px' }}>
        {/* Speech Bubble moved to the parent container so left:50% reliably centers over the head */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              ref={bubbleRef}
              initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              style={{
                position: 'absolute',
                top: -40,
                left: '50%',
                backgroundColor: '#7c3aed',
                color: 'white',
                padding: '8px 12px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 'bold',
                zIndex: 20,
                whiteSpace: 'nowrap',
                maxWidth: 'unset',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Translucent progress bar */}
              {!exhausted && (
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
              <span style={{ position: 'relative', zIndex: 1 }}>{messages[currentMessage]}</span>
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
                  borderTop: '8px solid #7c3aed',
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
            background: 'linear-gradient(135deg, #374151 0%, #1f2937 50%, #111827 100%)',
            borderRadius: '20px',
            border: '3px solid #dc2626',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            marginTop: 30,
            overflow: 'visible',
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
            }}
          />

          {/* Main visor/screen */}
          <div
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
                animate={{
                  boxShadow: isHovered ? '0 0 15px #00ff88, 0 0 25px #00ff88' : '0 0 8px #00ff88',
                }}
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#00ff88',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px #00ff88',
                }}
              />
              {/* Right eye */}
              <motion.div
                animate={{
                  boxShadow: isHovered ? '0 0 15px #00ff88, 0 0 25px #00ff88' : '0 0 8px #00ff88',
                }}
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#00ff88',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px #00ff88',
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
                background: 'linear-gradient(to bottom, transparent, #00ff88, transparent)',
                boxShadow: '0 0 10px #00ff88',
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

      {/* Exhausted message overlay (nudge into app) */}
      <AnimatePresence>
        {exhausted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 12,
              color: '#f59e0b',
              background: 'rgba(17,24,39,0.6)',
              border: '1px solid rgba(245,158,11,0.5)',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            That’s all you get. Inside with you — the real challenge awaits.
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
        {/* New System Status LED */}
        <motion.div
          animate={{
            backgroundColor: (!systemStatus.ai || !systemStatus.db) ? '#ef4444' : '#00ff88',
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            boxShadow: (!systemStatus.ai || !systemStatus.db) ? '0 0 8px #ef4444' : '0 0 8px #00ff88',
          }}
        />
      </motion.div>

      {/* System online text */}
      <div style={{
        fontFamily: 'monospace',
        color: '#00ff88',
        textShadow: '0 0 5px #00ff88',
        fontSize: 11,
        whiteSpace: 'nowrap',
        marginTop: 12
      }}>
        SYSTEM ONLINE - USER: {username.toUpperCase()}
      </div>
    </motion.div>
  );
};
