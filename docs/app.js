import { loadDatabase, getFilteredCards, getCard } from './lib/data-loader.js';
import { loadState, saveState, getCardProgress, setCardProgress, resetProgress } from './lib/storage.js';
import { sm2, isDue, sortByPriority } from './lib/sm2.js';
import { renderCard, renderEmpty } from './components/card-viewer.js';
import { renderDeckSelector } from './components/deck-selector.js';
import { renderProgress } from './components/progress-tracker.js';
import { renderSettings } from './components/settings-panel.js';

// ── State ──
let appState = loadState();
let deckState = { mode: 'spaced', activeCategories: [], activeSources: [] };
let sessionStats = { sessionCards: 0, correct: 0 };
let currentDeck = [];
let currentIndex = 0;

// ── DOM refs ──
const $onboarding = document.getElementById('onboarding');
const $study = document.getElementById('study');
const $settingsPanel = document.getElementById('settings-panel');
const $deckSelector = document.getElementById('deck-selector');
const $progress = document.getElementById('progress-tracker');
const $cardArea = document.getElementById('card-area');
const $sessionStats = document.getElementById('session-stats');
const $settingsBtn = document.getElementById('settings-btn');

// ── Init ──
async function init() {
  applyTheme();

  try {
    await loadDatabase();
  } catch (err) {
    $onboarding.innerHTML = `
      <h1>Lucks Lab Flashcards</h1>
      <p class="subtitle">Could not load flashcard data.</p>
      <p style="color: var(--danger)">${err.message}</p>
    `;
    return;
  }

  if (appState.familiarityLevel) {
    showStudyScreen();
  } else {
    showOnboarding();
  }
}

// ── Screens ──
function showOnboarding() {
  $onboarding.classList.remove('hidden');
  $study.classList.add('hidden');
  $settingsPanel.classList.add('hidden');

  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.familiarityLevel = btn.dataset.level;
      saveState(appState);
      showStudyScreen();
    });
  });
}

function showStudyScreen() {
  $onboarding.classList.add('hidden');
  $study.classList.remove('hidden');
  $settingsPanel.classList.add('hidden');

  buildDeck();
  renderUI();
}

function showSettings() {
  $onboarding.classList.add('hidden');
  $study.classList.add('hidden');
  $settingsPanel.classList.remove('hidden');

  renderSettings($settingsPanel, appState, {
    onBack: showStudyScreen,
    onDarkModeChange: (mode) => {
      appState.darkMode = mode;
      saveState(appState);
      applyTheme();
    },
    onLevelChange: () => {
      appState.familiarityLevel = null;
      saveState(appState);
      showOnboarding();
    },
    onReset: () => {
      resetProgress(appState);
      sessionStats = { sessionCards: 0, correct: 0 };
      showStudyScreen();
    },
  });
}

// ── Deck Building ──
function buildDeck() {
  const cards = getFilteredCards(appState.familiarityLevel, deckState.activeCategories, deckState.activeSources);

  if (deckState.mode === 'spaced') {
    // SM-2 mode: show due cards sorted by priority
    const withProgress = cards.map(card => ({
      card,
      progress: getCardProgress(appState, card.id),
    }));

    const dueCards = withProgress.filter(({ progress }) => isDue(progress));
    const sorted = sortByPriority(dueCards);
    currentDeck = sorted.map(({ card }) => card);
  } else {
    // Browse mode: show all cards in order
    currentDeck = cards;
  }

  currentIndex = 0;
}

// ── Rendering ──
function renderUI() {
  // Deck selector
  renderDeckSelector($deckSelector, deckState, {
    onModeChange: (mode) => {
      deckState.mode = mode;
      buildDeck();
      renderUI();
    },
    onCategoryToggle: (category) => {
      const idx = deckState.activeCategories.indexOf(category);
      if (idx >= 0) {
        deckState.activeCategories.splice(idx, 1);
      } else {
        deckState.activeCategories.push(category);
      }
      buildDeck();
      renderUI();
    },
    onSourceToggle: (source) => {
      const idx = deckState.activeSources.indexOf(source);
      if (idx >= 0) {
        deckState.activeSources.splice(idx, 1);
      } else {
        deckState.activeSources.push(source);
      }
      buildDeck();
      renderUI();
    },
  });

  // Progress
  const allCards = getFilteredCards(appState.familiarityLevel, deckState.activeCategories, deckState.activeSources);
  const reviewedCount = allCards.filter(c => {
    const p = getCardProgress(appState, c.id);
    return p.repetitions > 0;
  }).length;

  renderProgress($progress, $sessionStats, {
    reviewed: reviewedCount,
    total: allCards.length,
    correct: sessionStats.correct,
    sessionCards: sessionStats.sessionCards,
  });

  // Current card
  renderCurrentCard();
}

function renderCurrentCard() {
  if (currentDeck.length === 0) {
    if (deckState.mode === 'spaced') {
      renderEmpty($cardArea, 'All caught up!', 'No cards due for review. Check back later or switch to Browse mode.');
    } else {
      renderEmpty($cardArea, 'No cards found', 'Try selecting different categories.');
    }
    return;
  }

  if (currentIndex >= currentDeck.length) {
    renderEmpty($cardArea, 'Session complete!', `You reviewed ${sessionStats.sessionCards} cards this session.`);
    return;
  }

  const card = currentDeck[currentIndex];

  renderCard($cardArea, card, {
    onAssess: (quality) => {
      // Update SM-2 progress
      const progress = getCardProgress(appState, card.id);
      const updated = sm2(progress, quality);
      setCardProgress(appState, card.id, updated);

      // Update session stats
      sessionStats.sessionCards++;
      if (quality === 'good' || quality === 'easy') {
        sessionStats.correct++;
      }

      // Record in session history
      if (!appState.sessionHistory) appState.sessionHistory = [];
      appState.sessionHistory.push({
        cardId: card.id,
        quality,
        timestamp: new Date().toISOString(),
      });
      saveState(appState);

      // Next card
      currentIndex++;
      renderUI();
    },
    onRelatedClick: (cardId) => {
      const relatedCard = getCard(cardId);
      if (relatedCard) {
        // Insert related card next in deck
        currentDeck.splice(currentIndex + 1, 0, relatedCard);
        currentIndex++;
        renderCurrentCard();
      }
    },
  });
}

// ── Theme ──
function applyTheme() {
  const html = document.documentElement;
  html.classList.remove('dark', 'auto-dark');

  if (appState.darkMode === 'dark') {
    html.classList.add('dark');
  } else if (appState.darkMode === 'auto') {
    html.classList.add('auto-dark');
  }
}

// ── Event Listeners ──
$settingsBtn.addEventListener('click', showSettings);

// ── Start ──
init();
