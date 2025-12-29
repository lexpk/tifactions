let gameState = {
  gameId: null,
  playerName: null,
  isAuthenticated: false,
  selectedFactionId: null,
  token: null
};

// Token storage helpers
function getStoredToken(gameId, playerName) {
  const key = `tifactions_token_${gameId}_${playerName}`;
  return sessionStorage.getItem(key);
}

function storeToken(gameId, playerName, token) {
  const key = `tifactions_token_${gameId}_${playerName}`;
  sessionStorage.setItem(key, token);
}

function clearStoredToken(gameId, playerName) {
  const key = `tifactions_token_${gameId}_${playerName}`;
  sessionStorage.removeItem(key);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  const params = getUrlParams();

  if (!params.game || !params.player) {
    showError('Invalid player link');
    return;
  }

  gameState.gameId = params.game;
  gameState.playerName = decodeURIComponent(params.player);

  // Check for stored token
  const storedToken = getStoredToken(gameState.gameId, gameState.playerName);
  if (storedToken) {
    gameState.token = storedToken;
    gameState.isAuthenticated = true;
    await loadPlayerData();
  } else {
    await checkAuthStatus();
  }
});

async function checkAuthStatus() {
  try {
    const status = await API.getStatus(gameState.gameId);

    if (status.error) {
      showError(status.error);
      return;
    }

    if (!status.players || !Array.isArray(status.players)) {
      showError('Invalid game data received from server');
      return;
    }

    const player = status.players.find(p => p.name === gameState.playerName);

    if (!player) {
      showError('Player not found in this game');
      return;
    }

    // Set auth UI
    if (player.hasSetPassword) {
      document.getElementById('authTitle').textContent = 'Welcome Back!';
      document.getElementById('passwordHelp').textContent = 'Enter your password to view your factions';
    } else {
      document.getElementById('authTitle').textContent = 'Set Your Password';
      document.getElementById('passwordHelp').textContent = 'Choose a password to protect your faction options (minimum 4 characters)';
    }

  } catch (error) {
    showError('Failed to load game: ' + error.message);
  }
}

async function authenticate() {
  const password = document.getElementById('password').value;

  if (!password) {
    showError('Please enter a password');
    return;
  }

  try {
    const result = await API.authenticate(gameState.gameId, gameState.playerName, password);

    if (result.error) {
      showError(result.error);
      return;
    }

    if (result.action === 'password_set') {
      showSuccess('Password set successfully!');
    }

    // Store the JWT token
    if (result.token) {
      gameState.token = result.token;
      storeToken(gameState.gameId, gameState.playerName, result.token);
    }

    gameState.isAuthenticated = true;
    await loadPlayerData();

  } catch (error) {
    showError('Authentication failed: ' + error.message);
  }
}

async function loadPlayerData() {
  try {
    const data = await API.getOptions(gameState.gameId, gameState.playerName, gameState.token);

    if (data.error) {
      // If token is invalid/expired, clear it and show auth screen
      if (data.error.includes('token') || data.error.includes('Token') || data.error.includes('authenticated')) {
        clearStoredToken(gameState.gameId, gameState.playerName);
        gameState.token = null;
        gameState.isAuthenticated = false;
        await checkAuthStatus();
        return;
      }
      showError(data.error);
      return;
    }

    document.getElementById('authSection').classList.add('hidden');

    if (data.revealed) {
      await showReveal();
    } else if (data.hasSelected) {
      showWaiting();
    } else {
      showSelection(data);
    }

  } catch (error) {
    showError('Failed to load factions: ' + error.message);
  }
}

function showSelection(data) {
  document.getElementById('selectionSection').classList.remove('hidden');
  document.getElementById('assignmentCommitment').textContent = data.assignmentCommitment;

  const grid = document.getElementById('factionsGrid');
  grid.innerHTML = '';

  data.factions.forEach(faction => {
    const card = document.createElement('div');
    card.className = 'faction-card';
    card.onclick = () => selectFaction(faction.id);
    card.innerHTML = `
      <div class="faction-name">${faction.name}</div>
      <div class="faction-expansion">${faction.expansion === 'base' ? 'Base Game' : 'Prophecy of Kings'}</div>
    `;
    card.dataset.factionId = faction.id;
    grid.appendChild(card);
  });
}

function selectFaction(factionId) {
  // Remove previous selection
  document.querySelectorAll('.faction-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Mark new selection
  const selected = document.querySelector(`[data-faction-id="${factionId}"]`);
  if (selected) {
    selected.classList.add('selected');
    gameState.selectedFactionId = factionId;
    document.getElementById('confirmButton').disabled = false;
  }
}

async function confirmSelection() {
  if (!gameState.selectedFactionId) {
    showError('Please select a faction');
    return;
  }

  if (!confirm('Confirm your selection? This cannot be changed!')) {
    return;
  }

  try {
    const result = await API.selectFaction(
      gameState.gameId,
      gameState.playerName,
      gameState.selectedFactionId,
      gameState.token
    );

    if (result.error) {
      showError(result.error);
      return;
    }

    showSuccess('Selection confirmed! Returning to lobby...');

    // Redirect back to lobby after a short delay
    setTimeout(() => {
      window.location.href = `./lobby.html?game=${encodeURIComponent(gameState.gameId)}`;
    }, 1500);

  } catch (error) {
    showError('Failed to submit selection: ' + error.message);
  }
}

function showWaiting() {
  document.getElementById('selectionSection').classList.add('hidden');
  document.getElementById('waitingSection').classList.remove('hidden');

  checkStatus();

  // Poll for updates every 5 seconds
  setInterval(checkStatus, 5000);
}

async function checkStatus() {
  try {
    const status = await API.getStatus(gameState.gameId);

    if (status.error || !status.players) {
      console.error('Failed to check status:', status.error || 'Invalid response');
      return;
    }

    if (status.revealed) {
      await showReveal();
      return;
    }

    const selected = status.players.filter(p => p.hasSelected).length;
    const total = status.players.length;

    const statusDiv = document.getElementById('waitingStatus');
    statusDiv.innerHTML = `<p>${selected} of ${total} players have selected</p>`;

    if (status.allSelected) {
      await showReveal();
    }

  } catch (error) {
    console.error('Failed to check status:', error);
  }
}

async function showReveal() {
  try {
    const reveal = await API.getReveal(gameState.gameId);

    if (reveal.error) {
      showError(reveal.error);
      return;
    }

    if (!reveal.players || !Array.isArray(reveal.players)) {
      showError('Invalid reveal data received from server');
      return;
    }

    document.getElementById('selectionSection').classList.add('hidden');
    document.getElementById('waitingSection').classList.add('hidden');
    document.getElementById('revealSection').classList.remove('hidden');

    const content = document.getElementById('revealContent');
    content.innerHTML = '';

    reveal.players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'card';

      const isCurrentPlayer = player.name === gameState.playerName;

      card.innerHTML = `
        <h3 style="margin-top: 0;">${player.name}${isCurrentPlayer ? ' (You)' : ''}</h3>
        <div class="faction-name" style="color: var(--success); margin: 1rem 0;">
          ${player.selectedFaction.name}
        </div>
        <details>
          <summary>Show all options (${player.factions.length})</summary>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
            ${player.factions.map(f =>
              `<span style="padding: 0.25rem 0.75rem; background: var(--bg-lighter); border-radius: 12px; font-size: 0.9rem;">
                ${f.name}
              </span>`
            ).join('')}
          </div>
        </details>
        <details>
          <summary>Show cryptographic proof</summary>
          <div style="margin-top: 0.5rem;">
            <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">Assignment Commitment:</p>
            <div class="commitment">${player.assignmentCommitment}</div>
            <p style="font-size: 0.85rem; margin: 0.5rem 0;">Selection Commitment:</p>
            <div class="commitment">${player.selectionCommitment}</div>
          </div>
        </details>
      `;

      content.appendChild(card);
    });

    // Verify all commitments
    verifyAllCommitments(reveal.players);

  } catch (error) {
    showError('Failed to load reveal: ' + error.message);
  }
}

// Allow password submission with Enter key
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        authenticate();
      }
    });
  }
});
