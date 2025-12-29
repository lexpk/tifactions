// API Configuration
// This file is updated during deployment
// For local development, API_BASE is empty (uses same origin)
// For GitHub Pages, API_BASE points to Lambda

const CONFIG = {
  API_BASE: '' // Set to Lambda URL for production, e.g., 'https://abc123.execute-api.us-east-1.amazonaws.com'
};

window.CONFIG = CONFIG;
