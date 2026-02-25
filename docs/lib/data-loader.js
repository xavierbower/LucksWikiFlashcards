let database = null;
let cardIndex = null;
let takeawayIndex = null;

/**
 * Fetch and cache the flashcard database.
 * @returns {Promise<object>} The FlashcardDatabase
 */
export async function loadDatabase() {
  if (database) return database;

  const response = await fetch('data/flashcards.json');
  if (!response.ok) {
    throw new Error(`Failed to load flashcard data: ${response.status}`);
  }

  database = await response.json();
  buildIndices();
  return database;
}

function buildIndices() {
  cardIndex = new Map();
  takeawayIndex = new Map();

  for (const card of database.flashcards) {
    cardIndex.set(card.id, card);
  }
  for (const takeaway of database.takeaways) {
    takeawayIndex.set(takeaway.id, takeaway);
  }
}

/**
 * Get a card by ID.
 */
export function getCard(id) {
  return cardIndex?.get(id) ?? null;
}

/**
 * Get a takeaway by ID.
 */
export function getTakeaway(id) {
  return takeawayIndex?.get(id) ?? null;
}

/**
 * Get flashcards filtered by level, optional categories, and optional sources.
 * @param {string} level - Familiarity level
 * @param {string[]} [categories] - Category filter (empty = all)
 * @param {string[]} [sources] - Source filter: 'api', 'in-session' (empty = all)
 * @returns {object[]}
 */
export function getFilteredCards(level, categories = [], sources = []) {
  if (!database) return [];
  return database.flashcards.filter(card => {
    if (card.familiarityLevel !== level) return false;
    if (categories.length > 0 && !categories.includes(card.category)) return false;
    if (sources.length > 0 && !sources.includes(card.source)) return false;
    return true;
  });
}

/**
 * Get all unique sources present in the data.
 */
export function getSources() {
  if (!database) return [];
  return [...new Set(database.flashcards.map(c => c.source).filter(Boolean))].sort();
}

/**
 * Get all unique categories present in the data.
 */
export function getCategories() {
  if (!database) return [];
  return [...new Set(database.flashcards.map(c => c.category))].sort();
}

/**
 * Get database stats.
 */
export function getStats() {
  return database?.stats ?? { totalPages: 0, totalTakeaways: 0, totalRelationships: 0, totalFlashcards: 0 };
}
