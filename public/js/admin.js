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
      showError(result.error);
      return;
    }

    displayGameLinks(result);
  } catch (error) {
    showError('Failed to create game: ' + error.message);
  }
}

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
