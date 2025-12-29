async function createGame() {
  const customGameId = document.getElementById('gameId').value.trim();
  const factionsPerPlayer = parseInt(document.getElementById('factionsPerPlayer').value);
  const playerNamesText = document.getElementById('playerNames').value.trim();

  if (!playerNamesText) {
    showError('Please enter at least 2 player names');
    return;
  }

  const playerNames = playerNamesText
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (playerNames.length < 2) {
    showError('Please enter at least 2 player names');
    return;
  }

  if (playerNames.length > 6) {
    showError('Maximum 6 players supported');
    return;
  }

  // Check for duplicate names
  const uniqueNames = new Set(playerNames);
  if (uniqueNames.size !== playerNames.length) {
    showError('Player names must be unique');
    return;
  }

  // Validate custom game ID if provided
  if (customGameId && !/^[a-zA-Z0-9-_]+$/.test(customGameId)) {
    showError('Game ID can only contain letters, numbers, hyphens, and underscores');
    return;
  }

  try {
    const result = await API.createGame(playerNames, factionsPerPlayer, customGameId);

    if (result.error) {
      // Check if it's a game limit error with existing games
      if (result.games && result.games.length > 0) {
        showGameSelection(result.games, { playerNames, factionsPerPlayer, customGameId });
      } else {
        showError(result.error);
      }
      return;
    }

    displayGameLinks(result);
  } catch (error) {
    showError('Failed to create game: ' + error.message);
  }
}

async function showGameSelection(games, pendingGameData) {
  const container = document.getElementById('gameSelection');
  const listContainer = document.getElementById('existingGamesList');

  let html = '<p style="margin-bottom: 1rem;">You have reached the maximum of 2 games. Select a game to delete:</p>';
  html += '<button class="secondary" style="margin-bottom: 1rem;" onclick="cancelGameSelection()">Cancel</button>';

  games.forEach(game => {
    const date = new Date(game.createdAt).toLocaleString();
    html += `
      <div class="card" style="cursor: pointer; margin-bottom: 1rem;"
           onclick="deleteAndCreate('${game.gameId}', ${JSON.stringify(pendingGameData).replace(/"/g, '&quot;')})">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>Game ID:</strong> ${escapeHtml(game.gameId)}<br>
            <small style="color: var(--text-dim);">
              Created: ${date} | Players: ${game.playerCount} | ${game.revealed ? 'Revealed' : 'In Progress'}
            </small>
          </div>
          <button class="danger" style="width: auto;">Delete & Continue</button>
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;
  container.classList.remove('hidden');
  document.getElementById('gameSetup').classList.add('hidden');
}

async function deleteAndCreate(gameIdToDelete, gameData) {
  try {
    // Delete the selected game
    const deleteRes = await fetch(`/api/game/${gameIdToDelete}`, {
      method: 'DELETE'
    });

    const deleteResult = await deleteRes.json();

    if (!deleteRes.ok) {
      showError(deleteResult.error || 'Failed to delete game');
      return;
    }

    showSuccess('Game deleted. Creating new game...');

    // Create the new game
    const result = await API.createGame(gameData.playerNames, gameData.factionsPerPlayer, gameData.customGameId);

    if (result.error) {
      showError(result.error);
      return;
    }

    // Hide game selection, show success
    document.getElementById('gameSelection').classList.add('hidden');
    displayGameLinks(result);
  } catch (error) {
    showError('Failed: ' + error.message);
  }
}

window.deleteAndCreate = deleteAndCreate;

function cancelGameSelection() {
  document.getElementById('gameSelection').classList.add('hidden');
  document.getElementById('gameSetup').classList.remove('hidden');
}
window.cancelGameSelection = cancelGameSelection;

function displayGameLinks(result) {
  document.getElementById('displayGameId').value = result.gameId;
  document.getElementById('gameCreated').classList.remove('hidden');
  document.getElementById('gameSetup').classList.add('hidden');
}

function copyGameId() {
  const gameId = document.getElementById('displayGameId').value;

  navigator.clipboard.writeText(gameId).then(() => {
    showSuccess('Game ID copied to clipboard!');
  }).catch(() => {
    showError('Failed to copy Game ID');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
