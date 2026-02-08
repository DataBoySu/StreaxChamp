import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- UTILITY: Throttle function to limit re-renders ---
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

interface InteractiveRobotProps {
  username: string;
  errorMessage?: string | undefined;
  hasPlayed?: boolean;
  totalPoints?: number;
  forceState?: 'neutral' | 'happy' | 'angry' | 'dead' | 'surprised';
}

export const InteractiveRobot: React.FC<InteractiveRobotProps> = ({
  username, errorMessage, hasPlayed, totalPoints = 0, forceState
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [blinkOpen, setBlinkOpen] = useState(true);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [isNear, setIsNear] = useState(false);

  // Specific Visor States
  const [isVisorHovered, setIsVisorHovered] = useState(false);
  const [isVisorCenter, setIsVisorCenter] = useState(false); // New state for exact middle
  const [tempEmote, setTempEmote] = useState<string | null>(null);

  // Refs for direct DOM manipulation
  const containerRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<HTMLDivElement>(null);
  const visorRef = useRef<HTMLDivElement>(null);

  const TIMEOUT_LIMIT = 20;
  const TIMEOUT_MSG = "That’s all you get. Inside with you. The real challenge awaits.";

  // --- OPTIMIZED MOUSE TRACKING ---
  const handleMouseMove = useCallback(throttle((event: MouseEvent) => {
    if (timeOnPage > TIMEOUT_LIMIT && !hasPlayed && !errorMessage && !isVisorHovered) return;

    // 1. Calculate Global Eye Tracking (Robot looking at cursor)
    const { innerWidth, innerHeight } = window;
    const x = (event.clientX - innerWidth / 2) / 30;
    const y = (event.clientY - innerHeight / 2) / 30;

    // Update CSS Variable on the Eyes Container directly
    if (eyesRef.current) {
      eyesRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }

    // 2. Calculate Proximity for "Active" state
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const relativeX = (event.clientX - centerX) / (centerX);
    const relativeY = (event.clientY - centerY) / (centerY);
    const dist = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    setIsNear(dist < 0.15);

    // 3. Calculate "Exact Middle" of Visor Logic
    if (visorRef.current) {
      const rect = visorRef.current.getBoundingClientRect();
      const visorCenterX = rect.left + rect.width / 2;
      const visorCenterY = rect.top + rect.height / 2;

      // Distance from center of visor
      const distFromVisorCenter = Math.sqrt(
        Math.pow(event.clientX - visorCenterX, 2) +
        Math.pow(event.clientY - visorCenterY, 2)
      );

      // If within 15px radius of center -> Happy. Else -> Surprised (if hovered)
      setIsVisorCenter(distFromVisorCenter < 15);
    }

  }, 16), [timeOnPage, hasPlayed, errorMessage, isVisorHovered]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // --- BLINKING LOGIC ---
  useEffect(() => {
    if (errorMessage) { setBlinkOpen(true); return; }
    let timeoutId: number;
    const triggerBlink = () => {
      setBlinkOpen(false);
      setTimeout(() => {
        setBlinkOpen(true);
        timeoutId = window.setTimeout(triggerBlink, Math.random() * 3500 + 2500);
      }, 150);
    };
    timeoutId = window.setTimeout(triggerBlink, Math.random() * 3000 + 1000);
    return () => clearTimeout(timeoutId);
  }, [errorMessage]);

  // --- MESSAGE ROTATION ---
  const messages = useMemo(() => {
    if (errorMessage) return [errorMessage];
    return [
      `Halt, ${username}. Enjoy your experience.`,
      'New comer? Keep moving, we have a lot to show.',
      'This page is not everything we have to offer.',
      'Still lingering? Hmph.',
      'Enough gawking. Inside.'
    ];
  }, [username, errorMessage]);

  useEffect(() => {
    if (timeOnPage > TIMEOUT_LIMIT && !hasPlayed) return;
    if (isHovered) {
      const interval = window.setInterval(() => {
        setCurrentMessage(p => (p + 1) >= messages.length ? 0 : p + 1);
        setProgress(0);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isHovered, messages.length, timeOnPage, hasPlayed]);

  // --- PROGRESS BAR ---
  useEffect(() => {
    if (!isHovered) { setProgress(0); return; }
    let start = Date.now();
    let frameId: number;
    const animate = () => {
      const p = Math.min(((Date.now() - start) / 3000) * 100, 100);
      setProgress(p);
      if (p < 100) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isHovered, currentMessage]);

  // --- FACE STATE LOGIC ---
  const currentFace = useMemo(() => {
    if (forceState) return forceState;
    if (errorMessage) return 'dead';

    // NEW LOGIC: 
    if (isVisorCenter) return 'happy';    // Exact middle -> Happy
    if (isVisorHovered) return 'surprised'; // On display but not middle -> Wide Eyed
    if (isHovered) return 'surprised';      // Hovering robot generally -> Alert

    return 'neutral';
  }, [errorMessage, isVisorHovered, isVisorCenter, isHovered, forceState]);

  // --- EMOTE RANDOMIZER (Only when Happy/Center) ---
  useEffect(() => {
    if (currentFace === 'happy') {
      const emotes = [':)', ':D', '^.^', '<3', 'xD'];
      setTempEmote(emotes[Math.floor(Math.random() * emotes.length)]);
    } else {
      setTempEmote(null);
    }
  }, [currentFace]);

  // --- EYE STYLES ---
  const getEyeStyles = (side: 'left' | 'right') => {
    const isHappy = currentFace === 'happy';
    const isDead = currentFace === 'dead';
    const isSurprised = currentFace === 'surprised';
    const isActive = isNear || isHovered;

    const color = errorMessage ? '#ef4444' : (isHappy ? '#ff69b4' : '#00ff88');

    // Base dimensions
    let w = 10, h = 10, r = '50%', rot = 0;

    if (!blinkOpen && !isDead) { h = 1; w = 10; r = '2px'; } // Blink
    else if (isHappy) { w = 14; h = 6; r = '4px'; rot = side === 'left' ? -15 : 15; }
    else if (isDead) { w = 14; h = 2; r = '0px'; rot = side === 'left' ? 45 : -45; }
    else if (isSurprised) { w = 12; h = 16; r = '50%'; } // Wide eyes
    else if (isActive) { w = 8; h = 12; } // Oval active state

    return {
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: r,
      transform: `rotate(${rot}deg)`,
      backgroundColor: color,
      boxShadow: `0 0 ${isHappy ? 10 : 8}px ${color}`,
      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px', width: '100%', minHeight: '220px', position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px' }}>

        {/* MESSAGE BUBBLE */}
        <AnimatePresence>
          {(isHovered || errorMessage) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              style={{
                position: 'absolute', top: -55, left: '50%',
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: errorMessage ? '1px solid #ef4444' : '1px solid #7c3aed',
                color: 'white', padding: '12px 18px', borderRadius: '16px 16px 16px 0',
                fontFamily: '"Share Tech Mono", monospace', fontSize: 14, zIndex: 30,
                width: 'max-content', maxWidth: '260px', textAlign: 'center'
              }}
            >
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${progress}%`, background: 'rgba(255,255,255,0.4)', transition: 'width 0.1s linear' }} />
              {timeOnPage > TIMEOUT_LIMIT && !hasPlayed
                ? TIMEOUT_MSG
                : (tempEmote || messages[currentMessage])
              }
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEAD COMPONENT (Restored Original Look) */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          style={{
            position: 'relative', width: '140px', height: '120px', marginTop: 30,
            background: 'linear-gradient(135deg, #374151 0%, #111827 100%)', // Original Gradient
            borderRadius: '24px',
            border: errorMessage ? '3px solid #ef4444' : '3px solid #dc2626',
            boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {/* Antennas & Ears (Restored) */}
          <div style={{ position: 'absolute', top: '-8px', left: '20px', width: '12px', height: '12px', background: '#374151', border: '2px solid #dc2626', borderRadius: '3px' }} />
          <div style={{ position: 'absolute', top: '-8px', right: '20px', width: '12px', height: '12px', background: '#374151', border: '2px solid #dc2626', borderRadius: '3px' }} />
          <div style={{ position: 'absolute', left: '-8px', top: '30px', width: '12px', height: '25px', background: '#374151', border: '2px solid #dc2626', borderRadius: '0 3px 3px 0' }} />
          <div style={{ position: 'absolute', right: '-8px', top: '30px', width: '12px', height: '25px', background: '#374151', border: '2px solid #dc2626', borderRadius: '3px 0 0 3px' }} />

          {/* VISOR (The Screen) */}
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
            {/* Visor Glare/Reflection */}
            <div style={{ position: 'absolute', top: '5px', left: '5px', right: '5px', height: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)', borderRadius: '4px' }} />

            {/* EYES CONTAINER */}
            <div
              ref={eyesRef}
              style={{ display: 'flex', gap: '20px', alignItems: 'center', transition: 'transform 0.1s ease-out' }}
            >
              <div style={getEyeStyles('left')} />
              <div style={getEyeStyles('right')} />
            </div>

            {/* SCANLINE (Restored: Vertical line moving Left->Right) */}
            <div className="scanline" style={{
              position: 'absolute', top: 0, bottom: 0, width: '2px',
              background: errorMessage
                ? 'linear-gradient(to bottom, transparent, #ef4444, transparent)'
                : 'linear-gradient(to bottom, transparent, #00ff88, transparent)',
              animation: 'scan 2s linear infinite'
            }} />
            <style>{`@keyframes scan { 0% { left: -20%; opacity: 0; } 50% { opacity: 1; } 100% { left: 120%; opacity: 0; } }`}</style>
          </div>

          {/* Chin Piece (Restored) */}
          <div style={{ position: 'absolute', bottom: -6, width: 40, height: 10, background: 'linear-gradient(135deg, #374151, #1f2937)', border: '2px solid #dc2626', borderRadius: '0 0 8px 8px' }} />
        </motion.div>
      </div>

      {/* BODY/NECK (Restored Original Logic & Look) */}
      <motion.div
        animate={{ scale: isHovered ? 1.02 : 1 }}
        style={{ marginTop: '8px', width: '50px', height: '30px', background: 'linear-gradient(135deg, #374151, #1f2937)', border: '2px solid #dc2626', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
      >
        <div style={{ width: '4px', height: '15px', background: isHovered ? '#00ff88' : '#22c55e', borderRadius: '2px', transition: 'background 0.3s' }} />
        <div style={{ width: '4px', height: '15px', background: isHovered ? '#3b82f6' : '#60a5fa', borderRadius: '2px', transition: 'background 0.3s' }} />
      </motion.div>

      {/* USERNAME TAG */}
      <div style={{
        marginTop: 12, padding: '8px 16px', borderRadius: '8px',
        background: 'rgba(17, 24, 39, 0.9)', border: '2px solid rgba(0, 255, 136, 0.3)',
        fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: '#00ff88', fontWeight: 'bold'
      }}>
        {username}: {totalPoints}
      </div>
    </div>
  );
};