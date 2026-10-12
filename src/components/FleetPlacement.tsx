import React, { useState, useEffect } from 'react';
import {
  Coordinate,
  PlacedShip,
  SHIP_DEFINITIONS,
  ShipType,
} from '../types/game';
import {
  canPlaceShip,
  generateRandomFleet,
  BOARD_SIZE,
} from '../lib/battleshipLogic';
import { RadarGrid } from './RadarGrid';
import { soundController } from '../lib/audio';
import { ShipFullIllustration } from './ShipGraphics';
import {
  RotateCcw,
  Dices,
  Trash2,
  CheckCircle2,
  Ship,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface FleetPlacementProps {
  onConfirmReady: (fleet: PlacedShip[]) => void;
  isLoading?: boolean;
}

const ALL_SHIP_TYPES: ShipType[] = [
  'carrier',
  'battleship',
  'cruiser',
  'submarine',
  'destroyer',
];

export const FleetPlacement: React.FC<FleetPlacementProps> = ({
  onConfirmReady,
  isLoading = false,
}) => {
  const [fleet, setFleet] = useState<PlacedShip[]>([]);
  const [selectedShipType, setSelectedShipType] = useState<ShipType | null>('carrier');
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);

  // Keyboard shortcut: press 'R' or Space to rotate orientation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotateOrientation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orientation]);

  // Determine unplaced ships
  const placedTypes = new Set(fleet.map((s) => s.type));
  const unplacedTypes = ALL_SHIP_TYPES.filter((t) => !placedTypes.has(t));

  // Automatically select next unplaced ship
  useEffect(() => {
    if (selectedShipType && placedTypes.has(selectedShipType)) {
      if (unplacedTypes.length > 0) {
        setSelectedShipType(unplacedTypes[0]);
      } else {
        setSelectedShipType(null);
      }
    }
  }, [fleet, selectedShipType, placedTypes, unplacedTypes]);

  const rotateOrientation = () => {
    soundController.playClick();
    setOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  };

  const handleRandomize = () => {
    soundController.playClick();
    const randomized = generateRandomFleet();
    setFleet(randomized);
    setSelectedShipType(null);
    soundController.playSonar();
  };

  const handleClear = () => {
    soundController.playClick();
    setFleet([]);
    setSelectedShipType('carrier');
  };

  // Check if preview placement at current hover is valid
  let previewValid = false;
  if (selectedShipType && hoverCoord) {
    const check = canPlaceShip(
      selectedShipType,
      hoverCoord,
      orientation,
      fleet
    );
    previewValid = check.valid;
  }

  const handleCellClick = (coord: Coordinate) => {
    // If clicking on an existing ship, remove it
    const existing = fleet.find((s) =>
      s.coordinates.some((c) => c.x === coord.x && c.y === coord.y)
    );

    if (existing) {
      soundController.playClick();
      setFleet((prev) => prev.filter((s) => s.id !== existing.id));
      setSelectedShipType(existing.type);
      return;
    }

    // Otherwise, place currently selected ship
    if (!selectedShipType) return;

    const check = canPlaceShip(
      selectedShipType,
      coord,
      orientation,
      fleet
    );

    if (check.valid) {
      soundController.playClick();
      const def = SHIP_DEFINITIONS[selectedShipType];
      const newShip: PlacedShip = {
        id: `ship_${selectedShipType}_${Date.now()}`,
        type: selectedShipType,
        name: def.name,
        size: def.size,
        orientation,
        origin: coord,
        coordinates: check.coordinates,
      };

      setFleet((prev) => [...prev, newShip]);

      // Pick next unplaced ship
      const nextUnplaced = ALL_SHIP_TYPES.filter(
        (t) => t !== selectedShipType && !placedTypes.has(t)
      );
      if (nextUnplaced.length > 0) {
        setSelectedShipType(nextUnplaced[0]);
      } else {
        setSelectedShipType(null);
        soundController.playSonar();
      }
    } else {
      // Invalid placement
      soundController.playClick();
    }
  };

  const isFleetComplete = fleet.length === ALL_SHIP_TYPES.length;

  const handleReady = () => {
    if (!isFleetComplete || isLoading) return;
    soundController.playSonar();
    onConfirmReady(fleet);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-2xl">
      {/* Title & Instructions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-900/40 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Ship className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl sm:text-2xl font-black tracking-wider text-slate-100 uppercase">
              Posicionamento da Frota
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Posicione todos os 5 navios na grade 10x10. Use a tecla{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs">
              R
            </kbd>{' '}
            para rotacionar.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={rotateOrientation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs sm:text-sm font-semibold text-slate-200 transition"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>Girar: {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}</span>
          </button>

          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-600/60 text-xs sm:text-sm font-semibold text-cyan-300 transition"
          >
            <Dices className="w-4 h-4 text-cyan-400" />
            <span>Aleatório</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-xs sm:text-sm font-semibold text-red-300 transition"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: 10x10 placement grid */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <RadarGrid
            title="SEU TERRITÓRIO NAVAL"
            subtitle="Clique na grade para posicionar ou remover navios"
            mode="placement"
            fleet={fleet}
            selectedShipType={selectedShipType}
            orientation={orientation}
            previewValid={previewValid}
            onCellClick={handleCellClick}
            onCellHover={setHoverCoord}
            hoverCoord={hoverCoord}
          />
        </div>

        {/* Right column: Shipyard & Confirmation */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-900/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center justify-between">
              <span>Frota de Guerra</span>
              <span className="text-xs text-slate-400 font-mono">
                {fleet.length}/5 posicionados
              </span>
            </h3>

            <div className="space-y-2">
              {ALL_SHIP_TYPES.map((type) => {
                const def = SHIP_DEFINITIONS[type];
                const isPlaced = placedTypes.has(type);
                const isSelected = selectedShipType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      soundController.playClick();
                      if (isPlaced) {
                        // Remove placed ship and select it
                        setFleet((prev) => prev.filter((s) => s.type !== type));
                      }
                      setSelectedShipType(type);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : isPlaced
                        ? 'bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-100'
                        : 'bg-slate-900/80 border-slate-700/60 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Detailed Warship Vector Silhouette */}
                      <div className="w-20 sm:w-24 h-8 flex items-center justify-center p-1 bg-slate-950/70 rounded border border-slate-800">
                        <ShipFullIllustration type={type} className="w-full h-full" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">
                          {def.name}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {def.size} células
                        </div>
                      </div>
                    </div>

                    <div>
                      {isPlaced ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Pronto
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-cyan-400/80">
                          {isSelected ? 'Posicionando...' : 'Selecionar'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strategy Tip Box */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              Dica: Espalhe seus navios pelas bordas e cantos para dificultar a
              busca tática de radar do inimigo.
            </p>
          </div>

          {/* Ready & Deploy Button */}
          <button
            type="button"
            onClick={handleReady}
            disabled={!isFleetComplete || isLoading}
            className={`w-full py-3.5 px-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              isFleetComplete && !isLoading
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span>Salvando posicionamento...</span>
            ) : isFleetComplete ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Confirmar Frota & Estou Pronto!</span>
              </>
            ) : (
              <span>Posicione todos os 5 navios</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
