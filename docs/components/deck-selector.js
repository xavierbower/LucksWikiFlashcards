import { getCategories, getSources } from '../lib/data-loader.js';

const sourceLabels = {
  'api': 'API Pipeline',
  'in-session': 'In-Session'
};

/**
 * Render the deck selector (mode toggle + category filters + source filters).
 * @param {HTMLElement} container
 * @param {object} state - { mode, activeCategories, activeSources }
 * @param {object} callbacks - { onModeChange, onCategoryToggle, onSourceToggle }
 */
export function renderDeckSelector(container, state, callbacks) {
  const categories = getCategories();
  const sources = getSources();

  container.innerHTML = `
    <div class="mode-toggle">
      <button class="${state.mode === 'spaced' ? 'active' : ''}" data-mode="spaced">Spaced Repetition</button>
      <button class="${state.mode === 'browse' ? 'active' : ''}" data-mode="browse">Browse All</button>
    </div>
    ${sources.length > 1 ? `
    <div class="source-filters">
      <span class="filter-label">Source:</span>
      ${sources.map(src => `
        <span class="source-chip ${state.activeSources.includes(src) || state.activeSources.length === 0 ? 'active' : ''}"
              data-source="${src}">
          ${sourceLabels[src] || src}
        </span>
      `).join('')}
    </div>
    ` : ''}
    <div class="category-filters">
      ${categories.map(cat => `
        <span class="cat-chip ${state.activeCategories.includes(cat) || state.activeCategories.length === 0 ? 'active' : ''}"
              data-cat="${cat}">
          ${cat}
        </span>
      `).join('')}
    </div>
  `;

  // Mode toggle
  container.querySelectorAll('.mode-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      callbacks.onModeChange(btn.dataset.mode);
    });
  });

  // Source chips
  container.querySelectorAll('.source-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      callbacks.onSourceToggle(chip.dataset.source);
    });
  });

  // Category chips
  container.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      callbacks.onCategoryToggle(chip.dataset.cat);
    });
  });
}
