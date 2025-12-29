// Shared utilities and API client

// Get API base URL from config (empty for local, Lambda URL for production)
const API_BASE = (window.CONFIG && window.CONFIG.API_BASE) || '';

// Helper to handle API responses
async function handleResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Server returned invalid response (status ${res.status})`);
  }

  if (!res.ok && !data.error) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return data;
}

const API = {
  async createGame(playerNames, factionsPerPlayer, customGameId = null) {
    const res = await fetch(`${API_BASE}/api/game/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ playerNames, factionsPerPlayer, customGameId })
    });
    return await handleResponse(res);
  },

  async getStatus(gameId) {
    const res = await fetch(`${API_BASE}/api/game/${gameId}/status`, { credentials: 'include' });
    return await handleResponse(res);
  },

  async authenticate(gameId, playerName, password) {
    const res = await fetch(`${API_BASE}/api/game/${gameId}/player/${encodeURIComponent(playerName)}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password })
    });
    return await handleResponse(res);
  },

  async getOptions(gameId, playerName, token) {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/api/game/${gameId}/player/${encodeURIComponent(playerName)}/options`, {
      headers,
      credentials: 'include'
    });
    return await handleResponse(res);
  },

  async selectFaction(gameId, playerName, factionId, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/api/game/${gameId}/player/${encodeURIComponent(playerName)}/select`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ factionId })
    });
    return await handleResponse(res);
  },

  async getReveal(gameId) {
    const res = await fetch(`${API_BASE}/api/game/${gameId}/reveal`, { credentials: 'include' });
    return await handleResponse(res);
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
