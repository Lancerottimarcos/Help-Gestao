import React from 'react';

interface FlamengoMockupCardProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export const FlamengoMockupCard: React.FC<FlamengoMockupCardProps> = ({
  title = 'Flamengo divulga os 5 finalistas no uniforme feito pelo público',
  subtitle = 'O designer que ganhar leva R$ 10.000,00 + 1 Uniforme',
  className = '',
}) => {
  return (
    <div className={`w-full h-full relative overflow-hidden select-none flex flex-col justify-between ${className}`}>
      {/* Background Gradient matching exemplo.png */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f2ece3] via-[#f7d9a8] to-[#e67e10]" />

      {/* Subtle Feather / Textured Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-15 mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at top, rgba(0,0,0,0.1) 0%, transparent 70%), repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)`
        }}
      />

      {/* Upper Area: Jerseys Mockup on Mannequins */}
      <div className="relative z-10 pt-4 px-4 flex-1 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[280px] h-[210px] sm:h-[230px] flex items-center justify-center">
          
          {/* Secondary Jersey (Back perspective, slightly angled to the right) */}
          <div className="absolute right-2 top-4 w-[130px] h-[160px] opacity-85 rotate-6 scale-90 drop-shadow-md">
            <svg viewBox="0 0 160 200" className="w-full h-full">
              <defs>
                <linearGradient id="jerseyBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f3eee5" />
                  <stop offset="100%" stopColor="#ded4c3" />
                </linearGradient>
              </defs>
              {/* Back silhouette */}
              <path
                d="M 50 15 Q 80 25 110 15 L 145 40 L 135 70 L 120 62 L 122 175 Q 80 185 38 175 L 40 62 L 25 70 L 15 40 Z"
                fill="url(#jerseyBackGrad)"
                stroke="#c9bfae"
                strokeWidth="1.5"
              />
              {/* Collar trim */}
              <path d="M 50 15 Q 80 25 110 15" stroke="#b91c1c" strokeWidth="4" fill="none" />
              <path d="M 50 17 Q 80 27 110 17" stroke="#111827" strokeWidth="2" fill="none" />
              {/* Sleeve trim */}
              <path d="M 135 70 L 120 62" stroke="#b91c1c" strokeWidth="3" />
            </svg>
          </div>

          {/* Primary Front Jersey (Main Showcase) */}
          <div className="relative z-10 w-[175px] h-[200px] drop-shadow-2xl">
            <svg viewBox="0 0 180 210" className="w-full h-full filter drop-shadow-[0_12px_18px_rgba(0,0,0,0.25)]">
              <defs>
                <linearGradient id="jerseyFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#faf6ef" />
                  <stop offset="50%" stopColor="#f0e6d6" />
                  <stop offset="100%" stopColor="#ded3be" />
                </linearGradient>
                <pattern id="featherTexture" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 0 10 Q 10 0 20 10 Q 10 20 0 10 Z" fill="none" stroke="#d5c8b2" strokeWidth="0.6" opacity="0.4" />
                </pattern>
              </defs>

              {/* Jersey Body & Sleeves Silhouette */}
              <path
                d="M 52 18 C 72 32 108 32 128 18 L 172 45 C 174 52 165 78 160 82 L 140 70 L 142 195 C 142 198 138 200 135 200 C 95 205 85 205 45 200 C 42 200 38 198 38 195 L 40 70 L 20 82 C 15 78 6 52 8 45 Z"
                fill="url(#jerseyFrontGrad)"
                stroke="#c4b8a3"
                strokeWidth="1.5"
              />

              {/* Feather Texture overlay on fabric */}
              <path
                d="M 52 18 C 72 32 108 32 128 18 L 172 45 C 174 52 165 78 160 82 L 140 70 L 142 195 C 95 205 85 205 45 200 L 40 70 L 20 82 C 15 78 6 52 8 45 Z"
                fill="url(#featherTexture)"
              />

              {/* Ribbed Collar: Black & Red Stripes */}
              <path
                d="M 52 18 C 72 34 108 34 128 18"
                stroke="#18181b"
                strokeWidth="5"
                fill="none"
              />
              <path
                d="M 54 22 C 72 36 106 36 126 22"
                stroke="#dc2626"
                strokeWidth="3.5"
                fill="none"
              />

              {/* Left Sleeve Ribbed Trim */}
              <line x1="8" y1="46" x2="20" y2="81" stroke="#dc2626" strokeWidth="4" />
              <line x1="10" y1="47" x2="22" y2="82" stroke="#18181b" strokeWidth="3" />

              {/* Right Sleeve Ribbed Trim */}
              <line x1="172" y1="46" x2="160" y2="81" stroke="#dc2626" strokeWidth="4" />
              <line x1="170" y1="47" x2="158" y2="82" stroke="#18181b" strokeWidth="3" />

              {/* CRF (Clube de Regatas do Flamengo) Crest on Chest */}
              <g transform="translate(68, 62) scale(0.95)">
                {/* Red embroidered monogram CRF */}
                <path
                  d="M 12 4 C 6 4 2 8 2 14 C 2 20 6 24 12 24 C 15 24 18 22 20 20 L 17 17 C 15 19 14 20 12 20 C 8 20 6 17 6 14 C 6 11 8 8 12 8 C 14 8 16 9 17 11 L 20 8 C 18 6 15 4 12 4 Z"
                  fill="#b91c1c"
                />
                <path
                  d="M 18 4 L 18 24 L 23 24 L 23 15 L 28 24 L 33 24 L 27 14 C 31 13 32 10 32 8 C 32 5 29 4 25 4 Z M 23 8 L 25 8 C 27 8 28 9 28 10 C 28 11 27 12 25 12 L 23 12 Z"
                  fill="#b91c1c"
                />
                <path
                  d="M 28 4 L 38 4 L 38 8 L 32 8 L 32 12 L 37 12 L 37 15 L 32 15 L 32 24 L 28 24 Z"
                  fill="#b91c1c"
                />
              </g>

              {/* Realistic Fabric Shadow Contours */}
              <path d="M 60 70 Q 64 130 55 185" stroke="rgba(0,0,0,0.06)" strokeWidth="4" fill="none" />
              <path d="M 120 70 Q 116 130 125 185" stroke="rgba(0,0,0,0.06)" strokeWidth="4" fill="none" />
              <path d="M 90 40 Q 90 120 90 190" stroke="rgba(255,255,255,0.4)" strokeWidth="3" fill="none" />
            </svg>
          </div>
        </div>

        {/* 4 Finalist Kits Circular Badges (matching exemplo.png exactly) */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 pt-1 z-10">
          {/* 1. Black/Red */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-black/80 shadow-md ring-1 ring-black/40 overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-900 via-red-950 to-neutral-900 flex items-center justify-center border border-red-500/40">
              <span className="text-[8px] font-black text-red-500">CRF</span>
            </div>
          </div>

          {/* 2. Black/Gold */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-black/80 shadow-md ring-1 ring-black/40 overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-900 via-amber-950 to-neutral-950 flex items-center justify-center border border-amber-500/40">
              <span className="text-[8px] font-black text-amber-400">CRF</span>
            </div>
          </div>

          {/* 3. Black/Red Wave */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-black/80 shadow-md ring-1 ring-black/40 overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-neutral-900 via-red-900 to-black flex items-center justify-center border border-red-600/40">
              <span className="text-[8px] font-black text-white">CRF</span>
            </div>
          </div>

          {/* 4. Textured Black */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-black/80 shadow-md ring-1 ring-black/40 overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 flex items-center justify-center border border-amber-400/30">
              <span className="text-[8px] font-black text-amber-300">CRF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Banner Area: Bold Typography & Slogan (matching exemplo.png) */}
      <div className="relative z-10 px-5 sm:px-6 pb-4 sm:pb-5 text-center space-y-1">
        <h2 className="text-white text-base sm:text-lg font-black tracking-tight leading-tight drop-shadow-md">
          Flamengo divulga os<br />
          <span className="text-amber-100">5 finalistas</span> no uniforme<br />
          feito pelo público
        </h2>
        <p className="text-[10px] sm:text-[11px] font-bold text-white/95 tracking-wide drop-shadow-xs pt-0.5">
          O designer que ganhar leva <strong className="text-white">R$ 10.000,00 + 1 Uniforme</strong>
        </p>

        {/* Portal Publicitário Circle Logo at the Bottom */}
        <div className="pt-2 flex justify-center">
          <div className="w-10 h-10 rounded-full border border-white/60 bg-white/20 backdrop-blur-xs p-1 flex flex-col items-center justify-center shadow-xs">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
            <span className="text-[5px] font-black tracking-widest text-white uppercase mt-0.5">PORTAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
