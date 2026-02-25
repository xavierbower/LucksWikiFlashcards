const STORAGE_KEY = 'lucks-lab-flashcards';

const DEFAULT_STATE = {
  familiarityLevel: null,
  darkMode: 'auto',
  cardProgress: {},
  sessionHistory: [],
};

/**
 * Load all persisted state from localStorage.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/**
 * Save state to localStorage.
 */
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Get progress for a specific card.
 */
export function getCardProgress(state, cardId) {
  return state.cardProgress[cardId] || {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReviewDate: null,
    lastQuality: null,
  };
}

/**
 * Update progress for a specific card.
 */
export function setCardProgress(state, cardId, progress) {
  state.cardProgress[cardId] = progress;
  saveState(state);
}

/**
 * Export state as JSON string (for backup).
 */
export function exportState() {
  return localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_STATE);
}

/**
 * Import state from JSON string.
 */
export function importState(jsonString) {
  const parsed = JSON.parse(jsonString);
  const merged = { ...DEFAULT_STATE, ...parsed };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * Reset all progress (keeps level preference).
 */
export function resetProgress(state) {
  state.cardProgress = {};
  state.sessionHistory = [];
  saveState(state);
}
