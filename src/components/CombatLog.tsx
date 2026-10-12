import React from 'react';
import { AttackRecord, PlacedShip, SHIP_DEFINITIONS } from '../types/game';
import { coordLabel } from '../lib/battleshipLogic';
import { Flame, Waves, ShieldAlert, Radio, Send } from 'lucide-react';
import { ShipFullIllustration } from './ShipGraphics';

interface CombatLogProps {
  myAttacks: AttackRecord[];
  opponentAttacks: AttackRecord[];
  myFleet: PlacedShip[];
  opponentRoleName: string;
  myRoleName: string;
  onSendRadioMessage?: (msg: string) => void;
}

const RADIO_PHRASES = [
  'Torpedo a caminho!',
  'Bela jogada!',
  'Alvo na mira!',
  'Socorro, estamos afundando!',
  'Radar detectou movimento!',
  'Boa partida, comandante!',
];

export const CombatLog: React.FC<CombatLogProps> = ({
  myAttacks,
  opponentAttacks,
  myFleet,
  opponentRoleName,
  myRoleName,
  onSendRadioMessage,
}) => {
  // Combine all attacks into chronological timeline
  const combined = [
    ...myAttacks.map((a) => ({ ...a, by: myRoleName, isMine: true })),
    ...opponentAttacks.map((a) => ({ ...a, by: opponentRoleName, isMine: false })),
  ].reverse();

  // Calculate my damaged ships
  const opponentHits = new Set(
    opponentAttacks.filter((a) => a.result === 'hit').map((a) => `${a.x},${a.y}`)
  );

  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-xl border border-cyan-900/40 p-3 sm:p-4 text-xs font-mono">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2 mb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Registro Tático de Combate</span>
        </div>
        <span className="text-[10px] text-slate-500">CANAL 108.5 MHz</span>
      </div>

      {/* Fleet Status Summary */}
      <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-slate-800">
        <div className="p-2 rounded bg-slate-900/60 border border-cyan-500/20">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
            Sua Frota
          </div>
          <div className="space-y-1">
            {myFleet.map((ship) => {
              const hitsOnThisShip = ship.coordinates.filter((c) =>
                opponentHits.has(`${c.x},${c.y}`)
              ).length;
              const isSunk = hitsOnThisShip >= ship.size;

              return (
                <div
                  key={ship.id}
                  className="flex items-center justify-between text-[10px] py-0.5"
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                    <div className="w-8 h-3 shrink-0 flex items-center justify-center">
                      <ShipFullIllustration type={ship.type} className="w-full h-full" />
                    </div>
                    <span className={isSunk ? 'line-through text-red-400' : 'text-slate-300'}>
                      {ship.name}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] px-1 rounded shrink-0 ${
                      isSunk
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'text-cyan-400'
                    }`}
                  >
                    {isSunk ? 'AFUNDADO' : `${ship.size - hitsOnThisShip}/${ship.size}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-2 rounded bg-slate-900/60 border border-red-500/20">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
            Navios Inimigos Afundados
          </div>
          <div className="space-y-1">
            {myAttacks
              .filter((a) => a.sunkShipName)
              .map((a, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 text-[10px] text-red-400 font-bold"
                >
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  <span>{a.sunkShipName}</span>
                </div>
              ))}
            {myAttacks.filter((a) => a.sunkShipName).length === 0 && (
              <div className="text-[10px] text-slate-600 italic">
                Nenhum navio afundado ainda
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Attack Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1 scrollbar-thin">
        {combined.length === 0 ? (
          <div className="text-center text-slate-600 py-6 italic text-[11px]">
            Aguardando primeiros disparos da artilharia naval...
          </div>
        ) : (
          combined.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-1.5 rounded border text-[11px] ${
                entry.result === 'hit'
                  ? 'bg-red-950/30 border-red-900/40 text-red-300'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {entry.result === 'hit' ? (
                  <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                ) : (
                  <Waves className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                )}
                <span>
                  <strong className={entry.isMine ? 'text-cyan-400' : 'text-amber-400'}>
                    {entry.by}
                  </strong>{' '}
                  disparou em <strong>{coordLabel(entry.x, entry.y)}</strong>:
                </span>
              </div>

              <div>
                {entry.sunkShipName ? (
                  <span className="text-[10px] font-bold text-red-400 bg-red-950 px-1 py-0.5 rounded border border-red-800">
                    AFUNDOU {entry.sunkShipName.toUpperCase()}!
                  </span>
                ) : entry.result === 'hit' ? (
                  <span className="text-[10px] font-bold text-orange-400">FOGO!</span>
                ) : (
                  <span className="text-[10px] text-slate-500">ÁGUA</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Radio Chat Emotes */}
      {onSendRadioMessage && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>Transmissão de Rádio Rápida:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {RADIO_PHRASES.slice(0, 4).map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => onSendRadioMessage(phrase)}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
