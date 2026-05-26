import { Player } from './types.js';

/**
 * Rolls standard six-sided dice.
 * @param count The number of dice to roll.
 */
export function rollDice(count: number): number[] {
  if (count <= 0) return [];
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * 6) + 1);
  }
  return results;
}

/**
 * Calculates a player's score and qualification status based on kept dice.
 */
export function calculateScore(keptDice: number[]): {
  score: number;
  isDQ: boolean;
  hasOne: boolean;
  hasFour: boolean;
} {
  const hasOne = keptDice.includes(1);
  const hasFour = keptDice.includes(4);

  if (keptDice.length < 6) {
    return {
      score: 0,
      isDQ: false,
      hasOne,
      hasFour,
    };
  }

  if (hasOne && hasFour) {
    const diceCopy = [...keptDice];
    const indexOne = diceCopy.indexOf(1);
    diceCopy.splice(indexOne, 1);
    
    const indexFour = diceCopy.indexOf(4);
    diceCopy.splice(indexFour, 1);

    const score = diceCopy.reduce((sum, val) => sum + val, 0);

    return {
      score,
      isDQ: false,
      hasOne: true,
      hasFour: true,
    };
  } else {
    return {
      score: 0,
      isDQ: true,
      hasOne,
      hasFour,
    };
  }
}

/**
 * Calculates the current running score based on kept dice.
 * It removes up to one 1 and one 4 (if they exist) as qualification dice,
 * and sums the rest.
 */
export function getRunningScore(keptDice: number[]): number {
  const diceCopy = [...keptDice];
  
  const indexOne = diceCopy.indexOf(1);
  if (indexOne !== -1) {
    diceCopy.splice(indexOne, 1);
  }
  
  const indexFour = diceCopy.indexOf(4);
  if (indexFour !== -1) {
    diceCopy.splice(indexFour, 1);
  }
  
  return diceCopy.reduce((sum, val) => sum + val, 0);
}

/**
 * Computes shootout score.
 */
export function calculateShootoutScore(dice: number[]): number {
  if (dice.length !== 6) {
    throw new Error('Shootout roll must contain exactly 6 dice.');
  }
  return dice.reduce((sum, val) => sum + val, 0);
}

/**
 * Evaluates winners and shootout ties.
 */
export function resolveWinners(
  players: Player[],
  isShootoutPhase = false
): {
  winnerIds: string[];
  requiresShootout: boolean;
} {
  if (players.length === 0) {
    return { winnerIds: [], requiresShootout: false };
  }

  if (isShootoutPhase) {
    let maxShootoutScore = -1;
    let leaders: Player[] = [];

    for (const player of players) {
      const score = player.shootoutScore ?? 0;
      if (score > maxShootoutScore) {
        maxShootoutScore = score;
        leaders = [player];
      } else if (score === maxShootoutScore) {
        leaders.push(player);
      }
    }

    return {
      winnerIds: leaders.map(p => p.id),
      requiresShootout: leaders.length > 1,
    };
  } else {
    const qualifiedPlayers = players.filter(p => !p.isDQ);

    if (qualifiedPlayers.length === 0) {
      return {
        winnerIds: players.map(p => p.id),
        requiresShootout: players.length > 1,
      };
    }

    let maxScore = -1;
    let leaders: Player[] = [];

    for (const player of qualifiedPlayers) {
      if (player.score > maxScore) {
        maxScore = player.score;
        leaders = [player];
      } else if (player.score === maxScore) {
        leaders.push(player);
      }
    }

    return {
      winnerIds: leaders.map(p => p.id),
      requiresShootout: leaders.length > 1,
    };
  }
}
