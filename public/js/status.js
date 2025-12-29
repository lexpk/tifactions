let gameId = null;

window.addEventListener('DOMContentLoaded', () => {
  const params = getUrlParams();

  if (!params.game) {
    showError('No game ID provided');
    return;
  }

  gameId = params.game;
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
    displayCommitments(status.players);

  } catch (error) {
    showError('Failed to load status: ' + error.message);
  }
}

function displayPlayers(players, allSelected) {
  const container = document.getElementById('playerStatus');
  container.innerHTML = '';

  players.forEach(player => {
    const item = document.createElement('div');
    item.className = 'player-item';

    let statusClass = 'status-waiting';
    let statusText = 'Waiting';

    if (!player.hasSetPassword) {
      statusClass = 'status-no-password';
      statusText = 'No Password Set';
    } else if (player.hasSelected) {
      statusClass = 'status-selected';
      statusText = 'Selected ✓';
    }

    item.innerHTML = `
      <span class="player-name">${escapeHtml(player.name)}</span>
      <span class="player-status ${statusClass}">${statusText}</span>
    `;

    container.appendChild(item);
  });

  if (allSelected) {
    const alert = document.createElement('div');
    alert.className = 'alert-success mt-2';
    alert.textContent = '🎉 All players have selected! Results are now available.';
    container.appendChild(alert);
  }
}

function displayCommitments(players) {
  const container = document.getElementById('commitmentsList');
  container.innerHTML = '';

  players.forEach(player => {
    const commitmentDiv = document.createElement('div');
    commitmentDiv.style.marginBottom = '1.5rem';

    let html = `
      <h4 style="margin-bottom: 0.5rem;">${escapeHtml(player.name)}</h4>
      <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.25rem;">
        Assignment Commitment:
      </p>
      <div class="commitment" style="margin-bottom: 0.5rem;">${player.assignmentCommitment}</div>
    `;

    if (player.selectionCommitment) {
      html += `
        <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.25rem;">
          Selection Commitment:
        </p>
        <div class="commitment">${player.selectionCommitment}</div>
      `;
    }

    commitmentDiv.innerHTML = html;
    container.appendChild(commitmentDiv);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
