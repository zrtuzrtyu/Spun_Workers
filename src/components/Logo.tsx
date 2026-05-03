import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
          {/* Outer Glow */}
          <circle cx="60" cy="65" r="45" fill="#A855F7" fillOpacity="0.2" className="animate-pulse" />

          {/* Escaping Smoke Cloud */}
          <g className="animate-[bounce_4s_ease-in-out_infinite]">
            <path d="M60 30 C50 30 45 20 55 15 C55 5 70 5 75 15 C85 15 85 25 75 30 Z" fill="#F3F4F6" stroke="#1F2937" strokeWidth="4" strokeLinejoin="round"/>
            <path d="M50 40 C45 40 40 35 45 30 C45 25 55 25 60 30 C65 30 65 35 60 40 Z" fill="#E5E7EB" stroke="#1F2937" strokeWidth="4" strokeLinejoin="round"/>
          </g>

          {/* Glass Orb Base */}
          <circle cx="60" cy="70" r="40" fill="#8B5CF6" fillOpacity="0.15" stroke="#1F2937" strokeWidth="4"/>

          {/* Inner Smoke Swirl (The 'S' shape) */}
          <g className="animate-[spin_8s_linear_infinite]" style={{ transformOrigin: '60px 70px' }}>
            <path d="M 45 70 C 45 50, 75 60, 75 80 C 75 90, 55 90, 45 80" fill="#FFFFFF" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="55" cy="60" r="12" fill="#FFFFFF" stroke="#1F2937" strokeWidth="4"/>
            <circle cx="65" cy="75" r="14" fill="#FFFFFF" stroke="#1F2937" strokeWidth="4"/>
            <circle cx="48" cy="78" r="8" fill="#FFFFFF" stroke="#1F2937" strokeWidth="4"/>

            {/* Inner Smoke Fills (to hide overlapping strokes) */}
            <path d="M 45 70 C 45 50, 75 60, 75 80 C 75 90, 55 90, 45 80" fill="#FFFFFF"/>
            <circle cx="55" cy="60" r="10" fill="#FFFFFF"/>
            <circle cx="65" cy="75" r="12" fill="#FFFFFF"/>
            <circle cx="48" cy="78" r="6" fill="#FFFFFF"/>
          </g>

          {/* Orb Top Opening */}
          <path d="M 50 32 L 70 32 L 65 38 L 55 38 Z" fill="#4C1D95" stroke="#1F2937" strokeWidth="4" strokeLinejoin="round"/>
          <ellipse cx="60" cy="32" rx="10" ry="4" fill="#1F2937"/>

          {/* Glass Highlights */}
          <path d="M 30 60 A 30 30 0 0 1 45 40" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
          <path d="M 80 85 A 30 30 0 0 1 65 95" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
          <circle cx="35" cy="75" r="3" fill="#FFFFFF" opacity="0.8"/>
        </svg>
      </div>
      {showText && (
        <span className="font-display font-semibold text-xl tracking-tight">
          <span className="text-foreground">Spunn</span>
          <span className="text-zinc-500"> Force</span>
        </span>
      )}
    </div>
  );
}
