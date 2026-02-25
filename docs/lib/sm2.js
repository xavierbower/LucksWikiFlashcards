/**
 * SM-2 spaced repetition algorithm.
 *
 * Quality ratings:
 *   0 = Again (complete blackout)
 *   1 = Hard  (incorrect, but remembered after seeing answer)
 *   2 = Good  (correct with some effort)
 *   3 = Easy  (correct with no effort)
 *
 * Maps from our 4-button UI to SM-2's 0-5 scale:
 *   Again -> 0, Hard -> 2, Good -> 4, Easy -> 5
 */

const QUALITY_MAP = { again: 0, hard: 2, good: 4, easy: 5 };

/**
 * Calculate next review parameters using SM-2.
 * @param {object} progress - Current card progress
 * @param {string} quality - One of 'again', 'hard', 'good', 'easy'
 * @returns {object} Updated progress
 */
export function sm2(progress, quality) {
  const q = QUALITY_MAP[quality] ?? 4;
  let { repetitions, easeFactor, interval } = progress;

  if (q < 3) {
    // Failed: reset repetitions
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor (minimum 1.3)
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate next review date
  const now = new Date();
  const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    nextReviewDate: nextReview.toISOString(),
    lastQuality: quality,
  };
}

/**
 * Check if a card is due for review.
 * @param {object} progress - Card progress
 * @returns {boolean}
 */
export function isDue(progress) {
  if (!progress.nextReviewDate) return true;
  return new Date() >= new Date(progress.nextReviewDate);
}

/**
 * Sort cards by review priority (most overdue first).
 * @param {object[]} cards - Array of { card, progress }
 * @returns {object[]}
 */
export function sortByPriority(cards) {
  const now = Date.now();
  return cards.sort((a, b) => {
    const aDate = a.progress.nextReviewDate ? new Date(a.progress.nextReviewDate).getTime() : 0;
    const bDate = b.progress.nextReviewDate ? new Date(b.progress.nextReviewDate).getTime() : 0;
    // New cards (no review date) come first, then most overdue
    if (!a.progress.nextReviewDate && b.progress.nextReviewDate) return -1;
    if (a.progress.nextReviewDate && !b.progress.nextReviewDate) return 1;
    return aDate - bDate;
  });
}
