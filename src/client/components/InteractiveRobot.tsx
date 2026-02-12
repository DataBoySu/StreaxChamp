import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { CONFIG } from '../../shared/constants';

import { useSystemStatus } from '../hooks/useSystemStatus'; // NEW

interface InteractiveRobotProps {
  username: string;
  errorMessage?: string | undefined;
  hasPlayed?: boolean;
  totalPoints?: number;
  forceState?: 'neutral' | 'scoff' | 'angry' | 'dead' | 'surprised';
}

export const InteractiveRobot: React.FC<InteractiveRobotProps> = ({
  username, errorMessage, hasPlayed, totalPoints = 0, forceState
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [blinkOpen, setBlinkOpen] = useState(true);
  const [timeOnPage, setTimeOnPage] = useState(0);

  // REFACTORED: Autonomous System Check
  const { status: systemStatus } = useSystemStatus();

  // Interaction States
  const [isVisorHovered, setIsVisorHovered] = useState(false);
  const [isVisorCenter, setIsVisorCenter] = useState(false);
  // const [tempEmote, setTempEmote] = useState<string | null>(null);
  const tempEmote = null; // Emotes disabled per user request

  // Mouse Tracking Motion Values (Smooth Physics)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 }; // Smooth but responsive
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Eye movement range (divide by factor to limit range)
  const eyeX = useTransform(smoothX, (v) => v / 25);
  const eyeY = useTransform(smoothY, (v) => v / 25);

  const containerRef = useRef<HTMLDivElement>(null);
  const visorRef = useRef<HTMLDivElement>(null);

  const TIMEOUT_LIMIT = CONFIG.ROBOT.INTERACTIVE.TIMEOUT_LIMIT;
  const ANGER_LIMIT = CONFIG.ROBOT.INTERACTIVE.ANGER_LIMIT;
  const TIMEOUT_MSG = CONFIG.ROBOT.INTERACTIVE.TIMEOUT_MSG;
  const ANGER_MSG = CONFIG.ROBOT.INTERACTIVE.ANGER_MSG;

  // --- MOUSE TRACKING ---
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // 1. Update Motion Values relative to center of screen
      const { innerWidth, innerHeight } = window;
      const x = event.clientX - innerWidth / 2;
      const y = event.clientY - innerHeight / 2;

      // Update spring targets
      mouseX.set(x);
      mouseY.set(y);

      // 2. Calculate "Exact Middle" Visor Logic
      if (visorRef.current) {
        const rect = visorRef.current.getBoundingClientRect();
        const visorCenterX = rect.left + rect.width / 2;
        const visorCenterY = rect.top + rect.height / 2;

        const distFromVisorCenter = Math.sqrt(
          Math.pow(event.clientX - visorCenterX, 2) +
          Math.pow(event.clientY - visorCenterY, 2)
        );

        // If within 20px -> Happy Center
        const isCenter = distFromVisorCenter < 20;
        if (isCenter !== isVisorCenter) setIsVisorCenter(isCenter);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, isVisorCenter]);

  // --- BLINKING LOGIC ---
  useEffect(() => {
    // errorMessage is temporary, so it's okay to stay open during its display
    if (errorMessage) { setBlinkOpen(true); return; }

    // Recursive timeout for random blinking
    let timeoutId: number;
    const blink = () => {
      setBlinkOpen(false); // Close
      setTimeout(() => {
        setBlinkOpen(true); // Open
        // Schedule next blink
        timeoutId = window.setTimeout(blink, Math.random() * 3000 + 2000);
      }, 150);
    };

    // Start initial blink
    timeoutId = window.setTimeout(blink, 2000);
    return () => clearTimeout(timeoutId);
  }, [errorMessage]);

  // --- TIMER ---
  useEffect(() => {
    if (hasPlayed) return;
    const timer = setInterval(() => setTimeOnPage(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [hasPlayed]);

  // --- MESSAGE LOGIC ---
  const [tempSystemMessage, setTempSystemMessage] = useState<string | null>(null);
  const lastSystemStatus = useRef(systemStatus);

  useEffect(() => {
    // If status changed to a "bad" state, show a temporary message
    if (systemStatus !== lastSystemStatus.current && systemStatus !== 'ok' && systemStatus !== 'offline') {
      const msg = systemStatus === 'maintenance' ? "System is in maintenance mode!" : "We've hit our generation limit!";
      setTempSystemMessage(msg);
      // Clean up after 6 seconds (1.5 cycles)
      const timer = setTimeout(() => setTempSystemMessage(null), 6000);
      lastSystemStatus.current = systemStatus;
      return () => clearTimeout(timer);
    }
    lastSystemStatus.current = systemStatus;
  }, [systemStatus]);

  const messages = useMemo(() => {
    if (errorMessage) return [errorMessage];
    if (tempSystemMessage) return [tempSystemMessage];

    return CONFIG.ROBOT.INTERACTIVE.IDLE_MESSAGES.map(msg =>
      msg.replace('{{username}}', username)
    );
  }, [username, errorMessage, tempSystemMessage]);

  // --- MESSAGE CYCLE LOGIC ---
  const [isPlaying, setIsPlaying] = useState(false);

  // Trigger Play
  useEffect(() => {
    // If hovered, not currently playing, and not in timeout/angry mode
    if (isHovered && !isPlaying && !(timeOnPage > TIMEOUT_LIMIT && !hasPlayed)) {
      setIsPlaying(true);
    }
  }, [isHovered, isPlaying, timeOnPage, hasPlayed]);

  // Handle Play Duration
  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        setIsPlaying(false);
        setCurrentMessageIndex(prev => (prev + 1) % messages.length);
      }, 4000); // 4 seconds per message
      return () => clearTimeout(timer);
    }
  }, [isPlaying, messages.length]);

  // --- FACE STATE DETERMINATION ---
  const currentFace = useMemo(() => {
    if (forceState) return forceState;
    if (errorMessage) return 'dead';

    // If user has waited too long (Angry Mode)
    if (timeOnPage > ANGER_LIMIT && !hasPlayed) return 'angry';

    if (isVisorCenter) return 'scoff'; // Middle = Scoff (Unamused)
    if (isVisorHovered) return 'surprised';
    if (isHovered) return 'surprised';
    return 'neutral';
  }, [forceState, errorMessage, isVisorCenter, isVisorHovered, isHovered, timeOnPage, hasPlayed, ANGER_LIMIT]);

  /* 
  // --- EMOTE (On Happy) ---
  // DISABLED: User requested to disable emote injections (:) etc) for now.
  // Preserved for future improvements.
  useEffect(() => {
    if (currentFace === 'happy') {
      const emotes = [':)', ':D', '^.^', '<3', 'xD'];
      setTempEmote(emotes[Math.floor(Math.random() * emotes.length)]);
    } else {
      setTempEmote(null);
    }
  }, [currentFace]);
  */

  // --- EYE VARIANTS (Framer Motion) ---
  const eyeVariants = {
    neutral: { height: 10, width: 10, borderRadius: '50%', rotate: 0 },
    blink: { height: 2, width: 10, borderRadius: '1px', rotate: 0 },
    scoff: { height: 4, width: 14, borderRadius: '1px', rotate: 0 }, // Flat, unamused (- -)
    dead: { height: 4, width: 14, borderRadius: '2px', rotate: 0 },
    surprised: { height: 16, width: 12, borderRadius: '50%', rotate: 0 },
    angry: { height: 4, width: 14, borderRadius: '2px', rotate: 0 }, // Rotation handled in render
  };

  const getEyeState = () => {
    if (!blinkOpen && currentFace !== 'dead') return 'blink';
    return currentFace;
  };

  const getEyeColor = () => {
    if (errorMessage) return '#ef4444'; // Red (Error)
    if (currentFace === 'angry') return '#ef4444'; // Red (Angry)
    if (currentFace === 'scoff') return '#00ff88'; // Green (Neutral/Annoyed) - user said "scoff is something else", keeping green makes it distinct from red angry
    return '#00ff88'; // Green (Neutral)
  };
  const eyeColor = getEyeColor();
  const eyeShadow = `0 0 10px ${eyeColor}`;

  // Determine Active Message
  let activeMessage = (tempEmote || messages[currentMessageIndex]);
  // Override if timed out
  if (timeOnPage > TIMEOUT_LIMIT && !hasPlayed) activeMessage = TIMEOUT_MSG;
  // Override if angery
  if (timeOnPage > ANGER_LIMIT && !hasPlayed) activeMessage = ANGER_MSG;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0px', width: '100%', minHeight: '180px', position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px' }}>

        {/* MESSAGE BUBBLE */}
        <AnimatePresence mode='wait'>
          {(isHovered || isPlaying || errorMessage || (timeOnPage > TIMEOUT_LIMIT && !hasPlayed && isHovered)) && (
            <motion.div
              key="bubble"
              initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              style={{
                position: 'absolute', top: -55, left: '50%',
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: errorMessage ? '1px solid #ef4444' : '1px solid #7c3aed',
                color: 'white', padding: '12px 18px', borderRadius: '16px 16px 16px 0',
                fontFamily: '"Share Tech Mono", monospace', fontSize: 14, zIndex: 30,
                width: 'max-content', maxWidth: '260px', textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
            >
              {/* Progress Bar (Only show if cycling messages and not timed out) */}
              {!(timeOnPage > TIMEOUT_LIMIT && !hasPlayed) && !errorMessage && !tempEmote && (
                <motion.div
                  // Key changes when message index changes -> restarts animation automatically
                  key={currentMessageIndex}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4, ease: "linear" }}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, height: '3px',
                    background: 'rgba(255,255,255,0.4)', borderRadius: '0 0 0 4px'
                  }}
                />
              )}

              <span style={{ position: 'relative', zIndex: 1 }}>
                {activeMessage}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ROBOT HEAD */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          style={{
            position: 'relative', width: '140px', height: '120px', marginTop: 10,
            background: 'linear-gradient(135deg, #374151 0%, #111827 100%)',
            borderRadius: '24px',
            border: errorMessage ? '3px solid #ef4444' : '3px solid #dc2626',
            boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {/* Antennas */}
          <div style={{ position: 'absolute', top: '-8px', left: '20px', width: '12px', height: '12px', background: '#374151', border: '2px solid #dc2626', borderRadius: '3px' }} />
          <div style={{ position: 'absolute', top: '-8px', right: '20px', width: '12px', height: '12px', background: '#374151', border: '2px solid #dc2626', borderRadius: '3px' }} />
          <div style={{ position: 'absolute', left: '-8px', top: '30px', width: '12px', height: '25px', background: '#374151', border: '2px solid #dc2626', borderRadius: '0 3px 3px 0' }} />
          <div style={{ position: 'absolute', right: '-8px', top: '30px', width: '12px', height: '25px', background: '#374151', border: '2px solid #dc2626', borderRadius: '3px 0 0 3px' }} />

          {/* VISOR */}
          <div
            ref={visorRef}
            onMouseEnter={() => setIsVisorHovered(true)}
            onMouseLeave={() => { setIsVisorHovered(false); setIsVisorCenter(false); }}
            style={{
              position: 'relative', width: '110px', height: '70px',
              background: '#000', borderRadius: '8px', border: '2px solid #dc2626',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'crosshair'
            }}
          >
            {/* Glare */}
            <div style={{ position: 'absolute', top: '5px', left: '5px', right: '5px', height: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)', borderRadius: '4px', zIndex: 10, pointerEvents: 'none' }} />

            {/* EYES */}
            <motion.div
              style={{ x: eyeX, y: eyeY, display: 'flex', gap: '20px', alignItems: 'center' }}
            >
              {/* Left Eye */}
              <motion.div
                variants={eyeVariants}
                animate={getEyeState()}
                // Override rotation for happy/dead/angry states
                style={{
                  rotate: (currentFace === 'dead' || currentFace === 'angry') ? 20 : 0,
                  backgroundColor: eyeColor,
                  boxShadow: eyeShadow
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
              {/* Right Eye */}
              <motion.div
                variants={eyeVariants}
                animate={getEyeState()}
                style={{
                  rotate: (currentFace === 'dead' || currentFace === 'angry') ? -20 : 0,
                  backgroundColor: eyeColor,
                  boxShadow: eyeShadow
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            </motion.div>

            {/* Scanline */}
            <div className="scanline" style={{
              position: 'absolute', top: 0, bottom: 0, width: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: errorMessage
                ? 'linear-gradient(to bottom, transparent, #ef4444, transparent)'
                : 'linear-gradient(to bottom, transparent, #00ff88, transparent)',
              opacity: 0.8,
              pointerEvents: 'none'
            }} />
          </div>

          {/* Chin */}
          <div style={{ position: 'absolute', bottom: -6, width: 40, height: 10, background: 'linear-gradient(135deg, #374151, #1f2937)', border: '2px solid #dc2626', borderRadius: '0 0 8px 8px' }} />
        </motion.div>
      </div>

      {/* BODY */}
      <motion.div
        animate={{ scale: isHovered ? 1.05 : 1 }}
        style={{ marginTop: '8px', width: '50px', height: '30px', background: 'linear-gradient(135deg, #374151, #1f2937)', border: '2px solid #dc2626', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
      >
        <div style={{ width: '4px', height: '15px', background: isHovered ? '#00ff88' : '#22c55e', borderRadius: '2px', transition: 'background 0.3s' }} />
        <div style={{ width: '4px', height: '15px', background: isHovered ? '#3b82f6' : '#60a5fa', borderRadius: '2px', transition: 'background 0.3s' }} />
      </motion.div>

      {/* USERNAME */}
      <div style={{
        marginTop: 12, padding: '8px 16px', borderRadius: '8px',
        background: 'rgba(17, 24, 39, 0.95)', border: '2px solid rgba(0, 255, 136, 0.3)',
        fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: '#00ff88', fontWeight: 'bold',
        textShadow: '0 0 5px rgba(0,255,136, 0.5)'
      }}>
        {username}: {totalPoints}
      </div>
    </div>
  );
};