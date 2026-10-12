import React, { useState } from 'react';
import {
  BOARD_SIZE,
  COLUMNS,
  ROWS,
  coordKey,
  coordLabel,
} from '../lib/battleshipLogic';
import {
  AttackRecord,
  Coordinate,
  PlacedShip,
  ShipType,
  SHIP_DEFINITIONS,
} from '../types/game';
import { soundController } from '../lib/audio';
import { Crosshair, Flame, Waves, ShieldAlert, Anchor } from 'lucide-react';
import { ShipSegment } from './ShipGraphics';

interface RadarGridProps {
  title: string;
  subtitle?: string;
  mode: 'attack' | 'defense' | 'placement';
  fleet?: PlacedShip[];
  revealedFleet?: PlacedShip[]; // Opponent's ships revealed after game finishes
  attacks?: AttackRecord[];
  isMyTurn?: boolean;
  onCellClick?: (coord: Coordinate) => void;
  // Placement mode props
  selectedShipType?: ShipType | null;
  orientation?: 'horizontal' | 'vertical';
  previewValid?: boolean;
  onCellHover?: (coord: Coordinate | null) => void;
  hoverCoord?: Coordinate | null;
}

export const RadarGrid: React.FC<RadarGridProps> = ({
  title,
  subtitle,
  mode,
  fleet = [],
  revealedFleet = [],
  attacks = [],
  isMyTurn = false,
  onCellClick,
  selectedShipType,
  orientation = 'horizontal',
  previewValid = true,
  onCellHover,
  hoverCoord,
}) => {
  const [internalHover, setInternalHover] = useState<Coordinate | null>(null);
  const activeHover = hoverCoord !== undefined ? hoverCoord : internalHover;

  // Build lookup maps
  const attackMap = new Map<string, AttackRecord>();
  for (const att of attacks) {
    attackMap.set(coordKey(att.x, att.y), att);
  }

  const shipMap = new Map<string, PlacedShip>();
  for (const ship of fleet) {
    for (const c of ship.coordinates) {
      shipMap.set(coordKey(c.x, c.y), ship);
    }
  }

  const revealedMap = new Map<string, PlacedShip>();
  for (const ship of revealedFleet) {
    for (const c of ship.coordinates) {
      revealedMap.set(coordKey(c.x, c.y), ship);
    }
  }

  // Calculate preview coordinates for placement mode
  const previewCells = new Set<string>();
  if (mode === 'placement' && selectedShipType && activeHover) {
    const size = SHIP_DEFINITIONS[selectedShipType].size;
    for (let i = 0; i < size; i++) {
      const px = orientation === 'horizontal' ? activeHover.x + i : activeHover.x;
      const py = orientation === 'vertical' ? activeHover.y + i : activeHover.y;
      if (px >= 0 && px < BOARD_SIZE && py >= 0 && py < BOARD_SIZE) {
        previewCells.add(coordKey(px, py));
      }
    }
  }

  const handleMouseEnter = (x: number, y: number) => {
    const coord = { x, y };
    setInternalHover(coord);
    onCellHover?.(coord);
    if (mode === 'attack' && isMyTurn && !attackMap.has(coordKey(x, y))) {
      soundController.playRadarBlip();
    }
  };

  const handleMouseLeave = () => {
    setInternalHover(null);
    onCellHover?.(null);
  };

  const handleClick = (x: number, y: number) => {
    if (mode === 'attack') {
      if (!isMyTurn) return;
      if (attackMap.has(coordKey(x, y))) return; // Already attacked
      onCellClick?.({ x, y });
    } else if (mode === 'placement') {
      onCellClick?.({ x, y });
    }
  };

  const canTarget = mode === 'attack' && isMyTurn;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wider uppercase text-cyan-400">
              {title}
            </h3>
            {mode === 'attack' && isMyTurn && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
          )}
        </div>

        {activeHover && (
          <div className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900/80 border border-cyan-500/30 text-cyan-300">
            COORD: {coordLabel(activeHover.x, activeHover.y)}
          </div>
        )}
      </div>

      {/* 10x10 Grid container */}
      <div className="relative bg-slate-950/90 p-2 sm:p-3 rounded-xl border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.12)]">
        {/* Subtle Radar sweep effect on attack board */}
        {mode === 'attack' && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-20">
            <div className="radar-sweep absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </div>
        )}

        {/* Top Coordinate Header (A-J) */}
        <div className="grid grid-cols-11 mb-1 text-center font-mono text-[10px] sm:text-xs text-slate-400 font-bold">
          <div className="w-6 sm:w-8"></div>
          {COLUMNS.map((col) => (
            <div key={col} className="w-7 sm:w-9 md:w-10">
              {col}
            </div>
          ))}
        </div>

        {/* Grid Rows (1-10) */}
        <div className="flex flex-col gap-1">
          {ROWS.map((rowName, y) => (
            <div key={rowName} className="flex items-center gap-1">
              {/* Row Label (1-10) */}
              <div className="w-6 sm:w-8 text-right pr-1 font-mono text-[10px] sm:text-xs text-slate-400 font-bold">
                {rowName}
              </div>

              {/* Grid Cells */}
              {COLUMNS.map((colName, x) => {
                const key = coordKey(x, y);
                const attack = attackMap.get(key);
                const ship = shipMap.get(key);
                const revealedShip = revealedMap.get(key);
                const isPreview = previewCells.has(key);
                const isHovered = activeHover?.x === x && activeHover?.y === y;

                const isHit = attack?.result === 'hit';
                const isMiss = attack?.result === 'miss';
                const isSunk = isHit && attack?.sunkShipName;

                let cellBg = 'bg-slate-900/80 border-slate-700/50';
                let cellCursor = 'cursor-default';

                if (mode === 'attack') {
                  if (canTarget && !attack) {
                    cellCursor = 'cursor-crosshair hover:border-cyan-400 hover:bg-cyan-950/40';
                  }
                  if (isHit) {
                    cellBg = 'bg-red-950/90 border-red-500 shadow-[inset_0_0_8px_rgba(239,68,68,0.5)]';
                  } else if (isMiss) {
                    cellBg = 'bg-slate-800/80 border-cyan-800/60';
                  } else if (revealedShip) {
                    // Game finished: reveal unattacked enemy ships
                    cellBg = 'bg-indigo-950/70 border-dashed border-indigo-400/80';
                  }
                } else if (mode === 'defense') {
                  if (ship) {
                    cellBg = isHit
                      ? 'bg-red-950/90 border-red-500 animate-pulse'
                      : 'bg-cyan-900/70 border-cyan-400 shadow-[inset_0_0_6px_rgba(6,182,212,0.4)]';
                  } else if (isMiss) {
                    cellBg = 'bg-slate-800/60 border-slate-700';
                  }
                } else if (mode === 'placement') {
                  if (ship) {
                    cellBg = 'bg-cyan-900/80 border-cyan-400 cursor-pointer hover:bg-red-900/50 hover:border-red-400';
                  } else if (isPreview) {
                    cellBg = previewValid
                      ? 'bg-emerald-500/40 border-emerald-400'
                      : 'bg-red-500/40 border-red-400';
                    cellCursor = 'cursor-pointer';
                  } else {
                    cellCursor = 'cursor-pointer hover:border-cyan-400/60 hover:bg-slate-800/60';
                  }
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleClick(x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    onMouseLeave={handleMouseLeave}
                    disabled={mode === 'attack' && (!canTarget || !!attack)}
                    aria-label={`${colName}${rowName}`}
                    className={`relative w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded border transition-all duration-150 flex items-center justify-center ${cellBg} ${cellCursor} group`}
                  >
                    {/* Ship Segment Graphic on Defense and Placement */}
                    {ship && (
                      <div className="absolute inset-0 p-0.5 flex items-center justify-center pointer-events-none">
                        {(() => {
                          const segIdx = ship.coordinates.findIndex((c) => c.x === x && c.y === y);
                          return (
                            <ShipSegment
                              type={ship.type}
                              segmentIndex={segIdx >= 0 ? segIdx : 0}
                              size={ship.size}
                              orientation={ship.orientation}
                              isHit={isHit}
                              className={isHit ? 'opacity-60 grayscale-[40%]' : ''}
                            />
                          );
                        })()}
                      </div>
                    )}

                    {/* Ship Segment Graphic for Revealed Opponent Fleet (Endgame) */}
                    {mode === 'attack' && revealedShip && (
                      <div className="absolute inset-0 p-0.5 flex items-center justify-center pointer-events-none">
                        {(() => {
                          const segIdx = revealedShip.coordinates.findIndex((c) => c.x === x && c.y === y);
                          return (
                            <ShipSegment
                              type={revealedShip.type}
                              segmentIndex={segIdx >= 0 ? segIdx : 0}
                              size={revealedShip.size}
                              orientation={revealedShip.orientation}
                              isRevealedEnemy={true}
                              isHit={isHit}
                              className={isHit ? 'opacity-50' : 'opacity-85'}
                            />
                          );
                        })()}
                      </div>
                    )}

                    {/* Placement Preview Ship Segment */}
                    {mode === 'placement' && isPreview && selectedShipType && activeHover && !ship && (
                      <div className="absolute inset-0 p-0.5 flex items-center justify-center pointer-events-none">
                        {(() => {
                          const segIdx =
                            orientation === 'horizontal'
                              ? x - activeHover.x
                              : y - activeHover.y;
                          const size = SHIP_DEFINITIONS[selectedShipType].size;
                          return (
                            <ShipSegment
                              type={selectedShipType}
                              segmentIndex={Math.max(0, Math.min(size - 1, segIdx))}
                              size={size}
                              orientation={orientation}
                              className={previewValid ? 'opacity-85 drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'opacity-40 filter hue-rotate-180'}
                            />
                          );
                        })()}
                      </div>
                    )}

                    {/* Crosshair targeting reticle on hover in attack mode */}
                    {mode === 'attack' && canTarget && !attack && isHovered && (
                      <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300 animate-spin-slow pointer-events-none z-10" />
                    )}

                    {/* Hit Flame Icon overlay */}
                    {isHit && (
                      <div className="relative z-10 flex items-center justify-center pointer-events-none">
                        <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                        <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                        </span>
                      </div>
                    )}

                    {/* Miss Icon (Water splash) */}
                    {isMiss && (
                      <div className="relative z-10 flex items-center justify-center pointer-events-none">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.9)] border border-cyan-100" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
