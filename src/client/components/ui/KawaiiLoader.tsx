import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface KawaiiLoaderProps {
    isVisible: boolean;
    progress: number; // 0 to 100
    message?: string;
}

export const KawaiiLoader: React.FC<KawaiiLoaderProps> = ({ isVisible, progress, message = 'loading' }) => {
    const [show, setShow] = useState(isVisible);

    useEffect(() => {
        console.log('[KawaiiLoader] isVisible changed:', isVisible, 'progress:', progress);
        if (isVisible) setShow(true);
        else {
            // Small delay to allow exit animation if desired, but for now instant unmount to be snappy
            const t = setTimeout(() => setShow(false), 500);
            return () => clearTimeout(t);
        }
    }, [isVisible]);

    if (!show && !isVisible) return null;

    console.log('[KawaiiLoader] Rendering portal, show:', show, 'isVisible:', isVisible);

    return createPortal(
        <div
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center 
                 bg-[#FFC0CB] text-white transition-opacity duration-500
                 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{
                background: 'linear-gradient(180deg, #FFC0CB 0%, #FFB6C1 100%)'
            }}
        >
            {/* Centered Content */}
            <div className="flex flex-col items-center w-full max-w-md z-10 -mt-20">
                <h2 className="text-4xl font-bold tracking-wider mb-6 text-white drop-shadow-md">
                    {message}
                </h2>

                {/* Custom Progress Bar */}
                <div className="relative w-64 h-8 bg-white/20 border-2 border-white rounded-full p-1 shadow-sm">
                    {/* Fill */}
                    <div
                        className="h-full bg-white/40 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />

                    {/* Cloud Thumb - moves with progress */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
                        style={{ left: `calc(${progress}% - 20px)` }}
                    >
                        {/* Cute Cloud SVG */}
                        <svg
                            width="45"
                            height="30"
                            viewBox="0 0 50 35"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="drop-shadow-md"
                        >
                            <path
                                d="M12.5 27.5C12.5 30.2614 14.7386 32.5 17.5 32.5H35C39.1421 32.5 42.5 29.1421 42.5 25C42.5 20.8579 39.1421 17.5 35 17.5C35 17.1587 35.0213 16.8236 35.0617 16.4952C34.4697 12.0163 30.6358 8.61111 26 8.61111C21.3642 8.61111 17.5303 12.0163 16.9383 16.4952C16.9787 16.8236 17 17.1587 17 17.5C12.8579 17.5 9.5 20.8579 9.5 25C9.5 25.8673 9.64687 26.6976 9.91685 27.4728"
                                fill="white"
                                stroke="#FFB6C1"
                                strokeWidth="2"
                            />
                            {/* Cute Face */}
                            <circle cx="22" cy="22" r="1.5" fill="#FF9EAA" />
                            <circle cx="30" cy="22" r="1.5" fill="#FF9EAA" />
                            <path d="M25 24C25 24 25.5 25 26 25C26.5 25 27 24 27 24" stroke="#FF9EAA" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Animated Waves at bottom */}
            <div className="absolute bottom-0 left-0 right-0 w-full h-32 overflow-hidden">
                {/* Wave 1 (Back) */}
                <div
                    className="absolute bottom-0 w-[200%] h-full opacity-60 animate-wave-slow"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='1' d='M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: '50% 100%',
                    }}
                />
                {/* Wave 2 (Front) */}
                <div
                    className="absolute bottom-[-10px] w-[200%] h-full opacity-80 animate-wave-fast"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='1' d='M0,256L48,245.3C96,235,192,213,288,192C384,171,480,149,576,165.3C672,181,768,235,864,240C960,245,1056,203,1152,186.7C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: '50% 100%',
                        animationDelay: '-2s'
                    }}
                />
            </div>

            <style>{`
        @keyframes wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-wave-slow {
          animation: wave 15s linear infinite;
        }
        .animate-wave-fast {
          animation: wave 10s linear infinite;
        }
      `}</style>
        </div>,
        document.body
    );
};
