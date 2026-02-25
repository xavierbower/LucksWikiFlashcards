import { getCard } from '../lib/data-loader.js';

/**
 * Render a flashcard with flip animation and assessment buttons.
 * @param {HTMLElement} container
 * @param {object} card - Flashcard object
 * @param {object} callbacks - { onAssess(quality), onRelatedClick(cardId) }
 */
export function renderCard(container, card, callbacks) {
  const isFlipped = false;

  container.innerHTML = `
    <div class="card-container">
      <div class="card" id="flashcard">
        <div class="card-face card-front">
          <div class="card-meta">
            <span class="card-category" style="color: var(--cat-${card.category})">${card.category}</span>
            ${card.source ? `<span class="card-source source-${card.source}">${card.source === 'api' ? 'API' : 'In-Session'}</span>` : ''}
          </div>
          <div class="card-question">${escapeHtml(card.question)}</div>
          ${card.hint ? `<button class="hint-btn" id="hint-btn">Show hint</button><div class="card-hint hidden" id="hint-text">${escapeHtml(card.hint)}</div>` : ''}
          <div class="tap-hint">Tap to reveal answer</div>
        </div>
        <div class="card-face card-back">
          <div class="card-meta">
            <span class="card-category" style="color: var(--cat-${card.category})">${card.category}</span>
            ${card.source ? `<span class="card-source source-${card.source}">${card.source === 'api' ? 'API' : 'In-Session'}</span>` : ''}
          </div>
          <div class="card-answer">${escapeHtml(card.answer)}</div>
          ${renderRelated(card, callbacks)}
        </div>
      </div>
    </div>
    <div class="assessment hidden" id="assessment">
      <button class="assess-btn again" data-quality="again">Again</button>
      <button class="assess-btn hard" data-quality="hard">Hard</button>
      <button class="assess-btn good" data-quality="good">Good</button>
      <button class="assess-btn easy" data-quality="easy">Easy</button>
    </div>
  `;

  const flashcard = container.querySelector('#flashcard');
  const assessment = container.querySelector('#assessment');
  const hintBtn = container.querySelector('#hint-btn');
  const hintText = container.querySelector('#hint-text');

  // Flip card
  flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
    if (flashcard.classList.contains('flipped')) {
      assessment.classList.remove('hidden');
    }
  });

  // Hint button
  if (hintBtn) {
    hintBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hintText.classList.remove('hidden');
      hintBtn.classList.add('hidden');
    });
  }

  // Assessment buttons
  assessment.querySelectorAll('.assess-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      callbacks.onAssess(btn.dataset.quality);
    });
  });

  // Related card links
  container.querySelectorAll('.related-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onRelatedClick(link.dataset.cardId);
    });
  });
}

function renderRelated(card, callbacks) {
  if (!card.relatedCardIds || card.relatedCardIds.length === 0) return '';

  const links = card.relatedCardIds.slice(0, 3).map(id => {
    const related = getCard(id);
    if (!related) return '';
    const preview = related.question.length > 50
      ? related.question.slice(0, 50) + '...'
      : related.question;
    return `<span class="related-link" data-card-id="${id}">${escapeHtml(preview)}</span>`;
  }).filter(Boolean).join('');

  if (!links) return '';
  return `<div class="related-cards"><h4>See also</h4>${links}</div>`;
}

/**
 * Render empty/done state.
 */
export function renderEmpty(container, message, subtitle) {
  container.innerHTML = `
    <div class="empty-state">
      <h2>${escapeHtml(message)}</h2>
      <p>${escapeHtml(subtitle)}</p>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
