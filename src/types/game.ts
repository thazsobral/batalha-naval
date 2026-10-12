export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface ShipDefinition {
  type: ShipType;
  name: string;
  size: number;
  color: string;
}

export const SHIP_DEFINITIONS: Record<ShipType, ShipDefinition> = {
  carrier: {
    type: 'carrier',
    name: 'Porta-aviões',
    size: 5,
    color: '#3b82f6', // blue
  },
  battleship: {
    type: 'battleship',
    name: 'Encouraçado',
    size: 4,
    color: '#8b5cf6', // purple
  },
  cruiser: {
    type: 'cruiser',
    name: 'Cruzador',
    size: 3,
    color: '#06b6d4', // cyan
  },
  submarine: {
    type: 'submarine',
    name: 'Submarino',
    size: 3,
    color: '#10b981', // emerald
  },
  destroyer: {
    type: 'destroyer',
    name: 'Contratorpedeiro',
    size: 2,
    color: '#f59e0b', // amber
  },
};

export interface Coordinate {
  x: number; // 0-9
  y: number; // 0-9
}

export interface PlacedShip {
  id: string;
  type: ShipType;
  name: string;
  size: number;
  orientation: 'horizontal' | 'vertical';
  origin: Coordinate;
  coordinates: Coordinate[];
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface AttackRecord {
  x: number;
  y: number;
  result: 'hit' | 'miss';
  sunkShipName?: string;
  timestamp?: number;
}

export type PlayerRole = 'host' | 'guest';

export interface RoomData {
  id: string;
  code: string;
  hostUid: string;
  hostName: string;
  guestUid?: string | null;
  guestName?: string | null;
  status: 'waiting' | 'placing' | 'battle' | 'finished';
  hostReady: boolean;
  guestReady: boolean;
  currentTurn: 'host' | 'guest';
  winner: 'host' | 'guest' | 'none';
  hostAttacks: string[]; // encoded "x,y,result,sunkName"
  guestAttacks: string[]; // encoded "x,y,result,sunkName"
  lastAction: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardData {
  roomId: string;
  playerId: string;
  role: 'host' | 'guest';
  fleet: string[]; // encoded "type:x0,y0;x1,y1;..."
  createdAt: string;
  updatedAt: string;
}
