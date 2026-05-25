import { Player } from 'shared/types.js';

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
 * 
 * Qualification rules:
 * - A player must keep at least a '1' and a '4' to qualify.
 * - If qualified, the score is the sum of the remaining 4 dice (max score 24).
 * - If not qualified, they are disqualified (isDQ = true, score = 0).
 * 
 * @param keptDice Array of dice values that have been set aside (max length 6).
 */
export function calculateScore(keptDice: number[]): {
  score: number;
  isDQ: boolean;
  hasOne: boolean;
  hasFour: boolean;
} {
  const hasOne = keptDice.includes(1);
  const hasFour = keptDice.includes(4);

  // If we don't have all 6 dice yet, we can't finalize the DQ or score, 
  // but we can compute the current qualification status.
  if (keptDice.length < 6) {
    return {
      score: 0,
      isDQ: false, // Turn hasn't finished yet
      hasOne,
      hasFour,
    };
  }

  // Once all 6 dice are kept, evaluate final qualification
  if (hasOne && hasFour) {
    // Remove exactly one '1' and one '4' to sum the other 4 dice
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
    // Fails to qualify -> Bust
    return {
      score: 0,
      isDQ: true,
      hasOne,
      hasFour,
    };
  }
}

/**
 * Computes shootout score (qualification rules are suspended, sum of all 6 dice).
 * @param dice Array of exactly 6 dice face values.
 */
export function calculateShootoutScore(dice: number[]): number {
  if (dice.length !== 6) {
    throw new Error('Shootout roll must contain exactly 6 dice.');
  }
  return dice.reduce((sum, val) => sum + val, 0);
}

/**
 * Evaluates the results of a standard game round or shootout round.
 * Returns the winner IDs and whether a shootout is required to break a tie.
 * 
 * @param players Array of players with their final round scores.
 * @param isShootoutPhase True if evaluating shootout scores, false for standard round.
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
    // During a shootout, qualification rules are suspended. 
    // We look purely at shootoutScore.
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
    // Standard round evaluation:
    // Filter out DQ'd players (they get score 0 and isDQ = true)
    const qualifiedPlayers = players.filter(p => !p.isDQ);

    if (qualifiedPlayers.length === 0) {
      // All players were disqualified! This is a tie at 0 points.
      // Everyone who participated goes to a Shootout tie-breaker.
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
