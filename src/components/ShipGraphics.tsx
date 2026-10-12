import React from 'react';
import { ShipType, SHIP_DEFINITIONS } from '../types/game';

interface ShipSegmentProps {
  type: ShipType;
  segmentIndex: number; // 0 = bow (proa), size-1 = stern (popa)
  size: number;
  orientation: 'horizontal' | 'vertical';
  isHit?: boolean;
  isRevealedEnemy?: boolean;
  className?: string;
}

/**
 * Renders an authentic warship hull segment for individual 10x10 grid cells.
 * Connects seamlessly with adjacent segments to form a continuous naval vessel.
 */
export const ShipSegment: React.FC<ShipSegmentProps> = ({
  type,
  segmentIndex,
  size,
  orientation,
  isHit = false,
  isRevealedEnemy = false,
  className = '',
}) => {
  const isBow = segmentIndex === 0;
  const isStern = segmentIndex === size - 1;
  const isMid = !isBow && !isStern;

  // Steel color palette
  const baseColor = isRevealedEnemy ? '#4338ca' : '#0e7490'; // indigo for revealed enemy, cyan for player
  const metalDark = isRevealedEnemy ? '#1e1b4b' : '#083344';
  const metalHighlight = isRevealedEnemy ? '#818cf8' : '#22d3ee';
  const deckColor = isRevealedEnemy ? '#312e81' : '#155e75';

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      title={`${SHIP_DEFINITIONS[type]?.name || 'Navio'} (${segmentIndex + 1}/${size})`}
    >
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full"
        style={{
          transform: orientation === 'vertical' ? 'rotate(90deg)' : 'none',
        }}
      >
        <defs>
          <linearGradient id={`hullGrad_${type}_${isRevealedEnemy}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={metalHighlight} stopOpacity="0.9" />
            <stop offset="25%" stopColor={baseColor} />
            <stop offset="75%" stopColor={deckColor} />
            <stop offset="100%" stopColor={metalDark} />
          </linearGradient>

          <pattern id="flightDeckStripe" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="4" x2="8" y2="4" stroke="#f8fafc" strokeWidth="1" strokeDasharray="3 3" />
          </pattern>
        </defs>

        {/* 1. BOW (PROA - FRONT) */}
        {isBow && (
          <g>
            {/* Pointed hydrodynamic prow */}
            <path
              d="M 38 6 C 24 6, 8 12, 3 20 C 8 28, 24 34, 38 34 Z"
              fill={`url(#hullGrad_${type}_${isRevealedEnemy})`}
              stroke={metalHighlight}
              strokeWidth="1.5"
            />
            {/* Bow wave breaker / anchor deck */}
            <path
              d="M 38 10 C 26 10, 14 15, 8 20 C 14 25, 26 30, 38 30 Z"
              fill={deckColor}
              opacity="0.85"
            />
            {/* Bow detail based on ship type */}
            {type === 'carrier' ? (
              // Carrier runway start
              <polygon points="12,14 38,14 38,26 12,26" fill="#0f172a" opacity="0.6" />
            ) : type === 'submarine' ? (
              // Submarine torpedo tube caps
              <g>
                <circle cx="10" cy="17" r="1.5" fill="#0284c7" />
                <circle cx="10" cy="23" r="1.5" fill="#0284c7" />
                <line x1="16" y1="12" x2="28" y2="12" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="16" y1="28" x2="28" y2="28" stroke="#38bdf8" strokeWidth="1.5" />
              </g>
            ) : (
              // Forward Naval Gun Turret
              <g>
                <circle cx="24" cy="20" r="4.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                <line x1="24" y1="20" x2="10" y2="20" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
            {/* Hull plating seam */}
            <line x1="38" y1="6" x2="38" y2="34" stroke={metalDark} strokeWidth="1" />
          </g>
        )}

        {/* 2. MID BODY (CORPO CENTRAL / CONVÉS / TORRES) */}
        {isMid && (
          <g>
            {/* Steel hull block */}
            <rect
              x="2"
              y="6"
              width="36"
              height="28"
              fill={`url(#hullGrad_${type}_${isRevealedEnemy})`}
              stroke={metalHighlight}
              strokeWidth="1.2"
            />
            {/* Deck overlay */}
            <rect x="2" y="10" width="36" height="20" fill={deckColor} opacity="0.85" />

            {/* Type-specific interior structure */}
            {type === 'carrier' ? (
              // Carrier Flight deck runway markings & Control Island
              <g>
                <rect x="2" y="11" width="36" height="18" fill="#0f172a" opacity="0.75" />
                <line x1="2" y1="20" x2="38" y2="20" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="4 3" />
                {segmentIndex === 2 && (
                  // Control Island superstructure on starboard side
                  <g>
                    <rect x="14" y="6" width="16" height="6" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="22" cy="9" r="1.5" fill="#f59e0b" />
                    <line x1="26" y1="6" x2="26" y2="2" stroke="#38bdf8" strokeWidth="1.2" />
                  </g>
                )}
              </g>
            ) : type === 'submarine' ? (
              // Submarine Conning Tower & Periscope
              <g>
                <rect x="8" y="14" width="24" height="12" rx="4" fill="#0369a1" stroke="#38bdf8" strokeWidth="1" />
                {segmentIndex === 1 && (
                  <g>
                    <circle cx="20" cy="20" r="3" fill="#0f172a" stroke="#7dd3fc" strokeWidth="1" />
                    <circle cx="20" cy="20" r="1" fill="#38bdf8" />
                  </g>
                )}
              </g>
            ) : type === 'battleship' ? (
              // Heavy Gun Turret or Armored Bridge Citadel
              <g>
                {segmentIndex === 1 ? (
                  // Armored Bridge Tower & Radar
                  <g>
                    <polygon points="10,12 30,12 28,28 12,28" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                    <circle cx="20" cy="20" r="3.5" fill="#334155" />
                    <line x1="20" y1="12" x2="20" y2="6" stroke="#f8fafc" strokeWidth="1.5" />
                    <line x1="17" y1="7" x2="23" y2="7" stroke="#f8fafc" strokeWidth="1.5" />
                  </g>
                ) : (
                  // Second Main Artillery Double-Gun Turret
                  <g>
                    <circle cx="20" cy="20" r="5.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                    <line x1="20" y1="18" x2="6" y2="18" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="20" y1="22" x2="6" y2="22" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" />
                  </g>
                )}
              </g>
            ) : (
              // Cruiser / Destroyer bridge & Smokestack
              <g>
                <rect x="12" y="13" width="16" height="14" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <circle cx="20" cy="20" r="2.5" fill="#f59e0b" />
                <line x1="12" y1="20" x2="4" y2="20" stroke="#94a3b8" strokeWidth="1.5" />
              </g>
            )}

            {/* Bulkhead joints */}
            <line x1="2" y1="6" x2="2" y2="34" stroke={metalDark} strokeWidth="1" />
            <line x1="38" y1="6" x2="38" y2="34" stroke={metalDark} strokeWidth="1" />
          </g>
        )}

        {/* 3. STERN (POPA - REAR / ENGINES) */}
        {isStern && (
          <g>
            {/* Tapered or rounded stern hull */}
            <path
              d="M 2 6 C 16 6, 32 10, 37 20 C 32 30, 16 34, 2 34 Z"
              fill={`url(#hullGrad_${type}_${isRevealedEnemy})`}
              stroke={metalHighlight}
              strokeWidth="1.5"
            />
            {/* Aft deck */}
            <path
              d="M 2 10 C 14 10, 26 13, 31 20 C 26 27, 14 30, 2 30 Z"
              fill={deckColor}
              opacity="0.85"
            />

            {/* Stern detail */}
            {type === 'carrier' ? (
              // Carrier aft flight deck & arresting cables
              <g>
                <rect x="2" y="11" width="24" height="18" fill="#0f172a" opacity="0.75" />
                <line x1="10" y1="12" x2="10" y2="28" stroke="#f8fafc" strokeWidth="1" />
                <line x1="18" y1="12" x2="18" y2="28" stroke="#f8fafc" strokeWidth="1" />
              </g>
            ) : type === 'submarine' ? (
              // Submarine aft rudder and dual propeller
              <g>
                <polygon points="26,14 36,18 36,22 26,26" fill="#0369a1" />
                <circle cx="36" cy="20" r="2.5" fill="#f59e0b" />
              </g>
            ) : (
              // Aft Gun Turret or Helipad
              <g>
                <circle cx="16" cy="20" r="4.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                <line x1="16" y1="20" x2="28" y2="20" stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            )}

            {/* Forward bulkhead seam */}
            <line x1="2" y1="6" x2="2" y2="34" stroke={metalDark} strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Full Warship Vector Silhouette for Shipyard Cards and Fleet Overviews
 */
export const ShipFullIllustration: React.FC<{
  type: ShipType;
  className?: string;
  isCompact?: boolean;
}> = ({ type, className = '', isCompact = false }) => {
  const def = SHIP_DEFINITIONS[type];
  const size = def?.size || 3;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 160 40"
        className="w-full h-auto max-h-12 drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
      >
        <defs>
          <linearGradient id={`shipFullGrad_${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#0891b2" />
            <stop offset="75%" stopColor="#0e7490" />
            <stop offset="100%" stopColor="#083344" />
          </linearGradient>
        </defs>

        {type === 'carrier' && (
          // Carrier: 5 cells (length ~150)
          <g>
            <path
              d="M 152 7 C 120 7, 24 10, 8 20 C 24 30, 120 33, 152 33 Z"
              fill={`url(#shipFullGrad_${type})`}
              stroke="#67e8f9"
              strokeWidth="1.5"
            />
            {/* Flight Deck */}
            <polygon points="20,11 146,11 146,29 20,29" fill="#0f172a" opacity="0.8" />
            <line x1="24" y1="20" x2="142" y2="20" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="6 4" />
            {/* Carrier Island */}
            <rect x="90" y="6" width="22" height="6" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <line x1="104" y1="6" x2="104" y2="2" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Aircraft parking silhouettes */}
            <polygon points="40,14 44,14 42,17" fill="#38bdf8" opacity="0.8" />
            <polygon points="56,14 60,14 58,17" fill="#38bdf8" opacity="0.8" />
            <polygon points="72,14 76,14 74,17" fill="#38bdf8" opacity="0.8" />
          </g>
        )}

        {type === 'battleship' && (
          // Battleship: 4 cells (length ~130)
          <g>
            <path
              d="M 142 8 C 110 8, 30 11, 14 20 C 30 29, 110 32, 142 32 Z"
              fill={`url(#shipFullGrad_${type})`}
              stroke="#a78bfa"
              strokeWidth="1.5"
            />
            {/* Deck */}
            <path
              d="M 136 11 C 108 11, 38 13, 24 20 C 38 27, 108 29, 136 29 Z"
              fill="#1e1b4b"
              opacity="0.8"
            />
            {/* Forward double turret */}
            <circle cx="44" cy="20" r="6" fill="#1e293b" stroke="#c084fc" strokeWidth="1" />
            <line x1="44" y1="18" x2="26" y2="18" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
            <line x1="44" y1="22" x2="26" y2="22" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />

            {/* Armored Bridge tower */}
            <polygon points="68,13 90,13 88,27 70,27" fill="#0f172a" stroke="#c084fc" strokeWidth="1" />
            <line x1="79" y1="13" x2="79" y2="5" stroke="#f8fafc" strokeWidth="1.5" />

            {/* Rear double turret */}
            <circle cx="114" cy="20" r="6" fill="#1e293b" stroke="#c084fc" strokeWidth="1" />
            <line x1="114" y1="18" x2="132" y2="18" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
            <line x1="114" y1="22" x2="132" y2="22" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {type === 'cruiser' && (
          // Cruiser: 3 cells (length ~110)
          <g>
            <path
              d="M 130 9 C 100 9, 36 12, 22 20 C 36 28, 100 31, 130 31 Z"
              fill={`url(#shipFullGrad_${type})`}
              stroke="#67e8f9"
              strokeWidth="1.5"
            />
            {/* Deck */}
            <path
              d="M 124 12 C 96 12, 42 14, 30 20 C 42 26, 96 28, 124 28 Z"
              fill="#164e63"
              opacity="0.8"
            />
            {/* Forward gun */}
            <circle cx="46" cy="20" r="4.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
            <line x1="46" y1="20" x2="32" y2="20" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
            {/* Superstructure / Radar */}
            <rect x="66" y="13" width="22" height="14" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="77" cy="20" r="3" fill="#f59e0b" />
            {/* Aft missile launcher */}
            <rect x="98" y="15" width="12" height="10" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          </g>
        )}

        {type === 'submarine' && (
          // Submarine: 3 cells (length ~110)
          <g>
            {/* Streamlined cylindrical submarine hull */}
            <path
              d="M 126 12 C 100 12, 34 13, 20 20 C 34 27, 100 28, 126 28 C 132 24, 132 16, 126 12 Z"
              fill={`url(#shipFullGrad_${type})`}
              stroke="#34d399"
              strokeWidth="1.5"
            />
            {/* Conning tower / Fin */}
            <rect x="62" y="14" width="26" height="12" rx="4" fill="#064e3b" stroke="#6ee7b7" strokeWidth="1" />
            <circle cx="75" cy="20" r="3" fill="#022c22" stroke="#34d399" strokeWidth="1" />
            {/* Diving planes */}
            <line x1="38" y1="12" x2="50" y2="12" stroke="#34d399" strokeWidth="2" />
            <line x1="38" y1="28" x2="50" y2="28" stroke="#34d399" strokeWidth="2" />
            {/* Stern propeller */}
            <polygon points="126,16 136,19 136,21 126,24" fill="#f59e0b" />
          </g>
        )}

        {type === 'destroyer' && (
          // Destroyer: 2 cells (length ~90)
          <g>
            <path
              d="M 115 10 C 90 10, 46 12, 34 20 C 46 28, 90 30, 115 30 Z"
              fill={`url(#shipFullGrad_${type})`}
              stroke="#fbbf24"
              strokeWidth="1.5"
            />
            {/* Deck */}
            <path
              d="M 110 13 C 86 13, 50 14, 40 20 C 50 26, 86 27, 110 27 Z"
              fill="#78350f"
              opacity="0.75"
            />
            {/* Forward gun */}
            <circle cx="52" cy="20" r="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
            <line x1="52" y1="20" x2="40" y2="20" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
            {/* Compact bridge */}
            <rect x="68" y="14" width="18" height="12" rx="2" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
            <circle cx="77" cy="20" r="2" fill="#ef4444" />
          </g>
        )}
      </svg>
    </div>
  );
};
