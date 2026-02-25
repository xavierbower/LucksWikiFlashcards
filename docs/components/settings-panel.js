import { exportState, importState, resetProgress } from '../lib/storage.js';

/**
 * Render the settings panel.
 * @param {HTMLElement} container
 * @param {object} state - App state
 * @param {object} callbacks - { onBack(), onDarkModeChange(mode), onLevelChange(), onReset() }
 */
export function renderSettings(container, state, callbacks) {
  const isDark = state.darkMode === 'dark' || (state.darkMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  container.innerHTML = `
    <div class="settings-header">
      <button class="back-btn" id="settings-back">&larr; Back</button>
      <h2>Settings</h2>
      <div></div>
    </div>

    <div class="setting-group">
      <h3>Appearance</h3>
      <div class="setting-row">
        <label>Dark Mode</label>
        <label class="toggle">
          <input type="checkbox" id="dark-toggle" ${isDark ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="setting-group">
      <h3>Level</h3>
      <div class="setting-row">
        <label>Current: <strong>${formatLevel(state.familiarityLevel)}</strong></label>
        <button class="settings-action" id="change-level">Change</button>
      </div>
    </div>

    <div class="setting-group">
      <h3>Data</h3>
      <div class="settings-btn-row">
        <button class="settings-action" id="export-btn">Export Progress</button>
        <button class="settings-action" id="import-btn">Import Progress</button>
      </div>
      <input type="file" id="import-file" accept=".json" style="display:none">
    </div>

    <div class="setting-group">
      <h3>Danger Zone</h3>
      <div class="settings-btn-row">
        <button class="settings-action danger" id="reset-btn">Reset All Progress</button>
      </div>
    </div>
  `;

  // Back button
  container.querySelector('#settings-back').addEventListener('click', callbacks.onBack);

  // Dark mode toggle
  container.querySelector('#dark-toggle').addEventListener('change', (e) => {
    callbacks.onDarkModeChange(e.target.checked ? 'dark' : 'light');
  });

  // Change level
  container.querySelector('#change-level').addEventListener('click', callbacks.onLevelChange);

  // Export
  container.querySelector('#export-btn').addEventListener('click', () => {
    const data = exportState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lucks-lab-flashcards-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  const importBtn = container.querySelector('#import-btn');
  const importFile = container.querySelector('#import-file');

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importState(reader.result);
        location.reload();
      } catch {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  });

  // Reset
  container.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      callbacks.onReset();
    }
  });
}

function formatLevel(level) {
  const labels = { new_member: 'New Member', experienced: 'Experienced', pi: 'PI / Senior' };
  return labels[level] || level;
}
