import {
  Coordinate,
  PlacedShip,
  SHIP_DEFINITIONS,
  ShipType,
  AttackRecord,
} from '../types/game';

export const BOARD_SIZE = 10;
export const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const ROWS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function coordLabel(x: number, y: number): string {
  if (x < 0 || x >= 10 || y < 0 || y >= 10) return '??';
  return `${COLUMNS[x]}${y + 1}`;
}

export function parseCoordKey(key: string): Coordinate {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

/**
 * Checks if candidate coordinates fit inside 10x10 and don't collide with existing ships
 */
export function canPlaceShip(
  shipType: ShipType,
  origin: Coordinate,
  orientation: 'horizontal' | 'vertical',
  existingShips: PlacedShip[],
  ignoreShipId?: string
): { valid: boolean; coordinates: Coordinate[] } {
  const size = SHIP_DEFINITIONS[shipType].size;
  const coordinates: Coordinate[] = [];

  for (let i = 0; i < size; i++) {
    const x = orientation === 'horizontal' ? origin.x + i : origin.x;
    const y = orientation === 'vertical' ? origin.y + i : origin.y;

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      return { valid: false, coordinates: [] };
    }

    coordinates.push({ x, y });
  }

  // Check collision with other ships
  const occupied = new Set<string>();
  for (const ship of existingShips) {
    if (ship.id === ignoreShipId) continue;
    for (const c of ship.coordinates) {
      occupied.add(coordKey(c.x, c.y));
    }
  }

  for (const c of coordinates) {
    if (occupied.has(coordKey(c.x, c.y))) {
      return { valid: false, coordinates: [] };
    }
  }

  return { valid: true, coordinates };
}

/**
 * Generate full randomized 5-ship fleet
 */
export function generateRandomFleet(): PlacedShip[] {
  const shipTypes: ShipType[] = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
  const fleet: PlacedShip[] = [];

  for (const type of shipTypes) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 200) {
      attempts++;
      const orientation: 'horizontal' | 'vertical' = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const size = SHIP_DEFINITIONS[type].size;
      const maxX = orientation === 'horizontal' ? BOARD_SIZE - size : BOARD_SIZE - 1;
      const maxY = orientation === 'vertical' ? BOARD_SIZE - size : BOARD_SIZE - 1;

      const origin: Coordinate = {
        x: Math.floor(Math.random() * (maxX + 1)),
        y: Math.floor(Math.random() * (maxY + 1)),
      };

      const check = canPlaceShip(type, origin, orientation, fleet);
      if (check.valid) {
        fleet.push({
          id: `ship_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type,
          name: SHIP_DEFINITIONS[type].name,
          size,
          orientation,
          origin,
          coordinates: check.coordinates,
        });
        placed = true;
      }
    }
  }

  return fleet;
}

/**
 * Serialize fleet to string array for Firestore storage
 * Format: "type:orientation:x,y:x0,y0;x1,y1;..."
 */
export function serializeFleet(fleet: PlacedShip[]): string[] {
  return fleet.map((s) => {
    const coordsStr = s.coordinates.map((c) => `${c.x},${c.y}`).join(';');
    return `${s.type}:${s.orientation}:${s.origin.x},${s.origin.y}:${coordsStr}`;
  });
}

/**
 * Deserialize fleet from string array
 */
export function deserializeFleet(fleetStrings: string[]): PlacedShip[] {
  if (!Array.isArray(fleetStrings)) return [];
  return fleetStrings
    .map((str) => {
      try {
        const parts = str.split(':');
        if (parts.length < 4) return null;
        const type = parts[0] as ShipType;
        const orientation = parts[1] as 'horizontal' | 'vertical';
        const [origX, origY] = parts[2].split(',').map(Number);
        const coordinates = parts[3].split(';').map((pt) => {
          const [x, y] = pt.split(',').map(Number);
          return { x, y };
        });

        const def = SHIP_DEFINITIONS[type] || { name: type, size: coordinates.length };
        return {
          id: `ship_${type}_${origX}_${origY}`,
          type,
          name: def.name,
          size: def.size,
          orientation,
          origin: { x: origX, y: origY },
          coordinates,
        };
      } catch {
        return null;
      }
    })
    .filter((s): s is PlacedShip => s !== null);
}

/**
 * Encode attack record for Firestore: "x,y,result,sunkName"
 */
export function encodeAttack(rec: AttackRecord): string {
  return `${rec.x},${rec.y},${rec.result},${rec.sunkShipName || ''}`;
}

/**
 * Parse attack string: "x,y,result,sunkName"
 */
export function parseAttack(str: string): AttackRecord | null {
  try {
    const [xStr, yStr, result, sunkShipName] = str.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    if (isNaN(x) || isNaN(y)) return null;
    return {
      x,
      y,
      result: result === 'hit' ? 'hit' : 'miss',
      sunkShipName: sunkShipName || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Evaluate an attack against a fleet, taking existing hits into account
 */
export function evaluateAttack(
  coord: Coordinate,
  fleet: PlacedShip[],
  existingAttacks: AttackRecord[]
): {
  result: 'hit' | 'miss';
  sunkShipName?: string;
  allSunk: boolean;
} {
  // Find which ship was hit if any
  let hitShip: PlacedShip | null = null;
  for (const ship of fleet) {
    const hit = ship.coordinates.some((c) => c.x === coord.x && c.y === coord.y);
    if (hit) {
      hitShip = ship;
      break;
    }
  }

  if (!hitShip) {
    return { result: 'miss', allSunk: false };
  }

  // Hit! Now check if that ship is completely sunk
  const currentHits = new Set<string>();
  for (const att of existingAttacks) {
    if (att.result === 'hit') {
      currentHits.add(coordKey(att.x, att.y));
    }
  }
  // add this new hit
  currentHits.add(coordKey(coord.x, coord.y));

  const isShipSunk = hitShip.coordinates.every((c) => currentHits.has(coordKey(c.x, c.y)));
  const sunkShipName = isShipSunk ? hitShip.name : undefined;

  // Check if ALL ships are sunk
  const totalShipCells = fleet.reduce((acc, s) => acc + s.coordinates.length, 0);
  let totalHitShipCells = 0;
  for (const ship of fleet) {
    for (const c of ship.coordinates) {
      if (currentHits.has(coordKey(c.x, c.y))) {
        totalHitShipCells++;
      }
    }
  }

  const allSunk = totalHitShipCells >= totalShipCells && totalShipCells > 0;

  return {
    result: 'hit',
    sunkShipName,
    allSunk,
  };
}

/**
 * Smart AI Next Move for Practice Mode (Hunt and Target algorithm)
 */
export function getSmartAiAttack(pastAttacks: AttackRecord[]): Coordinate {
  const attacked = new Set<string>();
  const hitCoords: Coordinate[] = [];
  const sunkShipCoords = new Set<string>();

  for (const att of pastAttacks) {
    attacked.add(coordKey(att.x, att.y));
    if (att.result === 'hit') {
      hitCoords.push({ x: att.x, y: att.y });
    }
  }

  // Identify unsunk hits (hits whose surrounding ships might still be active)
  const candidateTargets: Coordinate[] = [];

  // Check each hit cell for unhit neighbors
  for (const hit of hitCoords) {
    const neighbors = [
      { x: hit.x + 1, y: hit.y },
      { x: hit.x - 1, y: hit.y },
      { x: hit.x, y: hit.y + 1 },
      { x: hit.x, y: hit.y - 1 },
    ];

    for (const n of neighbors) {
      if (n.x >= 0 && n.x < BOARD_SIZE && n.y >= 0 && n.y < BOARD_SIZE) {
        if (!attacked.has(coordKey(n.x, n.y))) {
          // If we have two consecutive hits, prioritize continuing along that axis
          const opposite = { x: hit.x - (n.x - hit.x), y: hit.y - (n.y - hit.y) };
          if (hitCoords.some((h) => h.x === opposite.x && h.y === opposite.y)) {
            // High priority!
            candidateTargets.unshift(n);
          } else {
            candidateTargets.push(n);
          }
        }
      }
    }
  }

  if (candidateTargets.length > 0) {
    return candidateTargets[0];
  }

  // Parity hunt (checkerboard pattern: (x + y) % 2 === 0)
  const parityPool: Coordinate[] = [];
  const allPool: Coordinate[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!attacked.has(coordKey(x, y))) {
        allPool.push({ x, y });
        if ((x + y) % 2 === 0) {
          parityPool.push({ x, y });
        }
      }
    }
  }

  const pool = parityPool.length > 0 ? parityPool : allPool;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
