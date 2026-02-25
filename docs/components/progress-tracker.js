/**
 * Render the progress bar and session stats.
 * @param {HTMLElement} progressContainer
 * @param {HTMLElement} statsContainer
 * @param {object} stats - { reviewed, total, correct, sessionCards }
 */
export function renderProgress(progressContainer, statsContainer, stats) {
  const pct = stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0;

  progressContainer.innerHTML = `
    <div class="progress-bar-container">
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="progress-text">
        <span>${stats.reviewed} / ${stats.total} cards reviewed</span>
        <span>${pct}%</span>
      </div>
    </div>
  `;

  if (stats.sessionCards > 0) {
    statsContainer.classList.remove('hidden');
    statsContainer.innerHTML = `
      <div class="stats-bar">
        <div class="stat">
          <div class="stat-value">${stats.sessionCards}</div>
          <div class="stat-label">This session</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.correct}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.sessionCards > 0 ? Math.round((stats.correct / stats.sessionCards) * 100) : 0}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
      </div>
    `;
  } else {
    statsContainer.classList.add('hidden');
  }
}
