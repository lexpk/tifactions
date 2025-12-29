let gameId = null;

window.addEventListener('DOMContentLoaded', () => {
  const params = getUrlParams();

  if (!params.game) {
    showError('No game ID provided');
    return;
  }

  gameId = params.game;
  document.getElementById('gameIdDisplay').textContent = gameId;
  loadStatus();

  // Auto-refresh every 10 seconds
  setInterval(loadStatus, 10000);
});

async function loadStatus() {
  try {
    const status = await API.getStatus(gameId);

    if (status.error) {
      showError(status.error);
      return;
    }

    if (!status.players || !Array.isArray(status.players)) {
      showError('Invalid game data received from server');
      return;
    }

    displayPlayers(status.players, status.allSelected);

    if (status.revealed) {
      await showReveal();
    }

  } catch (error) {
    showError('Failed to load status: ' + error.message);
  }
}

function displayPlayers(players, allSelected) {
  const container = document.getElementById('playerList');
  container.innerHTML = '';

  players.forEach(player => {
    const item = document.createElement('a');
    item.className = 'player-item player-link';
    item.href = `./player.html?game=${encodeURIComponent(gameId)}&player=${encodeURIComponent(player.name)}`;

    let statusClass = 'status-waiting';
    let statusText = 'Selecting';

    if (!player.hasSetPassword) {
      statusClass = 'status-no-password';
      statusText = 'Open';
    } else if (player.hasSelected) {
      statusClass = 'status-selected';
      statusText = 'Selected';
    }

    item.innerHTML = `
      <span class="player-name">${escapeHtml(player.name)}</span>
      <span class="player-status ${statusClass}">${statusText}</span>
    `;

    container.appendChild(item);
  });
}

async function showReveal() {
  try {
    const reveal = await API.getReveal(gameId);

    if (reveal.error) {
      return; // Not revealed yet, that's fine
    }

    if (!reveal.players || !Array.isArray(reveal.players)) {
      return;
    }

    document.getElementById('revealCard').classList.remove('hidden');

    const content = document.getElementById('revealResults');
    content.innerHTML = '';

    reveal.players.forEach(player => {
      const card = document.createElement('div');
      card.style.marginBottom = '1.5rem';
      card.style.paddingBottom = '1rem';
      card.style.borderBottom = '1px solid var(--border)';

      card.innerHTML = `
        <h4 style="margin-bottom: 0.5rem;">${escapeHtml(player.name)}</h4>
        <div style="color: var(--success); font-weight: 500; margin-bottom: 0.5rem;">
          ${player.selectedFaction.name}
        </div>
        <details>
          <summary>Show all options (${player.factions.length})</summary>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
            ${player.factions.map(f =>
              `<span style="padding: 0.25rem 0.75rem; background: var(--bg-lighter); border-radius: 12px; font-size: 0.9rem;">
                ${escapeHtml(f.name)}
              </span>`
            ).join('')}
          </div>
        </details>
      `;

      content.appendChild(card);
    });

    // Verify all commitments
    if (typeof verifyAllCommitments === 'function') {
      verifyAllCommitments(reveal.players);
    }

  } catch (error) {
    console.error('Failed to load reveal:', error);
  }
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showSuccess('Link copied!');
  }).catch(() => {
    showError('Failed to copy');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
