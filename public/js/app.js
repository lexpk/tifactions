// Shared utilities and API client

const API = {
  async createGame(playerNames, factionsPerPlayer, customGameId = null) {
    const res = await fetch('/api/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerNames, factionsPerPlayer, customGameId })
    });
    return await res.json();
  },

  async getStatus(gameId) {
    const res = await fetch(`/api/game/${gameId}/status`);
    return await res.json();
  },

  async authenticate(gameId, playerName, password) {
    const res = await fetch(`/api/game/${gameId}/player/${encodeURIComponent(playerName)}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return await res.json();
  },

  async getOptions(gameId, playerName) {
    const res = await fetch(`/api/game/${gameId}/player/${encodeURIComponent(playerName)}/options`);
    return await res.json();
  },

  async selectFaction(gameId, playerName, factionId) {
    const res = await fetch(`/api/game/${gameId}/player/${encodeURIComponent(playerName)}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factionId })
    });
    return await res.json();
  },

  async getReveal(gameId) {
    const res = await fetch(`/api/game/${gameId}/reveal`);
    return await res.json();
  }
};

// UI Helpers
function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;

  const container = document.querySelector('.container');
  container.insertBefore(alert, container.firstChild);

  setTimeout(() => alert.remove(), 5000);
}

function showError(message) {
  showAlert(message, 'error');
}

function showSuccess(message) {
  showAlert(message, 'success');
}

function showLoading(element) {
  element.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
}

// URL params helper
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    game: params.get('game'),
    player: params.get('player')
  };
}

// Export for use in other scripts
window.API = API;
window.showAlert = showAlert;
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.getUrlParams = getUrlParams;
