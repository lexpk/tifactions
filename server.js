import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { generateSalt, createAssignmentCommitment, createSelectionCommitment } from './lib/crypto.js';

// JWT secret - use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRY = '24h';

// Use DynamoDB in Lambda, lowdb locally
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const db = isLambda
  ? await import('./lib/dynamodb.js')
  : await import('./lib/db.js');
const { getGame, setGame, hasGame } = db;

const app = express();
const PORT = process.env.PORT || 3000;

// CORS for GitHub Pages
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin);

  if (isAllowed && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Load factions
const factions = JSON.parse(readFileSync('./factions.json', 'utf-8'));

/**
 * Generate a random game ID
 */
function generateGameId() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Assign random factions to each player
 */
function assignFactions(playerNames, factionsPerPlayer) {
  const shuffled = shuffleArray(factions);
  const players = [];

  for (let i = 0; i < playerNames.length; i++) {
    const playerFactions = shuffled.slice(
      i * factionsPerPlayer,
      (i + 1) * factionsPerPlayer
    );

    const assignmentSalt = generateSalt();
    const assignmentCommitment = createAssignmentCommitment(
      playerNames[i],
      playerFactions.map(f => f.name),
      assignmentSalt
    );

    players.push({
      name: playerNames[i],
      passwordHash: null,
      hasSetPassword: false,
      factions: playerFactions,
      assignmentSalt,
      assignmentCommitment,
      selectedFaction: null,
      selectionSalt: null,
      selectionCommitment: null
    });
  }

  return players;
}

// API Routes

/**
 * POST /api/game/create
 * Create a new game
 */
app.post('/api/game/create', async (req, res) => {
  try {
    const { playerNames, factionsPerPlayer, customGameId } = req.body;

    // Validation
    if (!Array.isArray(playerNames) || playerNames.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players' });
    }

    if (![3, 4].includes(factionsPerPlayer)) {
      return res.status(400).json({ error: 'Factions per player must be 3 or 4' });
    }

    if (playerNames.length * factionsPerPlayer > factions.length) {
      return res.status(400).json({
        error: `Not enough factions (need ${playerNames.length * factionsPerPlayer}, have ${factions.length})`
      });
    }

    // Validate and use custom game ID or generate one
    let gameId;
    if (customGameId) {
      // Validate format
      if (!/^[a-zA-Z0-9-_]+$/.test(customGameId)) {
        return res.status(400).json({
          error: 'Game ID can only contain letters, numbers, hyphens, and underscores'
        });
      }

      // Check if already in use
      if (await hasGame(customGameId)) {
        return res.status(409).json({
          error: `Game ID "${customGameId}" is already in use. Please choose a different ID.`
        });
      }

      gameId = customGameId;
    } else {
      gameId = generateGameId();
    }

    // Create game
    const players = assignFactions(playerNames, factionsPerPlayer);

    await setGame(gameId, {
      gameId,
      players,
      factionsPerPlayer,
      allSelected: false,
      revealed: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      gameId,
      playerLinks: playerNames.map(name => ({
        name,
        url: `/player.html?game=${gameId}&player=${encodeURIComponent(name)}`
      }))
    });
  } catch (error) {
    console.error('Failed to create game:', error);
    res.status(500).json({ error: 'Failed to create game. Please try again.' });
  }
});

/**
 * GET /api/game/:gameId/status
 * Get public game status and commitments
 */
app.get('/api/game/:gameId/status', async (req, res) => {
  try {
    const game = await getGame(req.params.gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      gameId: game.gameId,
      players: game.players.map(p => ({
        name: p.name,
        hasSetPassword: p.hasSetPassword,
        assignmentCommitment: p.assignmentCommitment,
        hasSelected: p.selectedFaction !== null,
        selectionCommitment: p.selectionCommitment
      })),
      allSelected: game.allSelected,
      revealed: game.revealed
    });
  } catch (error) {
    console.error('Failed to get game status:', error);
    res.status(500).json({ error: 'Failed to load game status' });
  }
});

/**
 * POST /api/game/:gameId/player/:playerName/auth
 * Set password (first visit) or authenticate (subsequent visits)
 */
app.post('/api/game/:gameId/player/:playerName/auth', async (req, res) => {
  try {
    const { gameId, playerName } = req.params;
    const { password } = req.body;

    const game = await getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const player = game.players.find(p => p.name === playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // First visit: set password
    if (!player.hasSetPassword) {
      if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }

      player.passwordHash = await bcrypt.hash(password, 10);
      player.hasSetPassword = true;

      // Save to database
      await setGame(gameId, game);

      // Create JWT token
      const token = jwt.sign({ gameId, playerName }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      return res.json({
        success: true,
        message: 'Password set successfully',
        action: 'password_set',
        token
      });
    }

    // Subsequent visit: verify password
    const isValid = await bcrypt.compare(password, player.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Create JWT token
    const token = jwt.sign({ gameId, playerName }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.json({
      success: true,
      message: 'Authenticated successfully',
      action: 'authenticated',
      token
    });
  } catch (error) {
    console.error('Failed to authenticate:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Middleware: Require authentication via JWT
 */
function requireAuth(req, res, next) {
  const { gameId, playerName } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify token matches the requested resource
    if (decoded.gameId !== gameId || decoded.playerName !== playerName) {
      return res.status(403).json({ error: 'Token does not match requested resource' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * GET /api/game/:gameId/player/:playerName/options
 * Get player's faction options (requires authentication)
 */
app.get('/api/game/:gameId/player/:playerName/options', requireAuth, async (req, res) => {
  try {
    const game = await getGame(req.params.gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const player = game.players.find(p => p.name === req.params.playerName);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      factions: player.factions,
      assignmentCommitment: player.assignmentCommitment,
      hasSelected: player.selectedFaction !== null,
      selectedFaction: player.selectedFaction,
      allSelected: game.allSelected,
      revealed: game.revealed
    });
  } catch (error) {
    console.error('Failed to get player options:', error);
    res.status(500).json({ error: 'Failed to load options' });
  }
});

/**
 * POST /api/game/:gameId/player/:playerName/select
 * Submit faction selection (requires authentication)
 */
app.post('/api/game/:gameId/player/:playerName/select', requireAuth, async (req, res) => {
  try {
    const { gameId, playerName } = req.params;
    const { factionId } = req.body;

    const game = await getGame(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const player = game.players.find(p => p.name === playerName);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.selectedFaction) {
      return res.status(400).json({ error: 'Already selected a faction' });
    }

    // Verify faction is in player's options
    const selectedFaction = player.factions.find(f => f.id === factionId);

    if (!selectedFaction) {
      return res.status(400).json({ error: 'Invalid faction selection' });
    }

    // Create selection commitment
    const selectionSalt = generateSalt();
    const selectionCommitment = createSelectionCommitment(
      playerName,
      selectedFaction.name,
      selectionSalt
    );

    player.selectedFaction = selectedFaction;
    player.selectionSalt = selectionSalt;
    player.selectionCommitment = selectionCommitment;

    // Check if all players have selected
    game.allSelected = game.players.every(p => p.selectedFaction !== null);

    if (game.allSelected) {
      game.revealed = true;
    }

    // Save to database
    await setGame(gameId, game);

    res.json({
      success: true,
      selectionCommitment,
      allSelected: game.allSelected,
      revealed: game.revealed
    });
  } catch (error) {
    console.error('Failed to select faction:', error);
    res.status(500).json({ error: 'Failed to save selection' });
  }
});

/**
 * GET /api/game/:gameId/reveal
 * Get revealed data (only after all selections made)
 */
app.get('/api/game/:gameId/reveal', async (req, res) => {
  try {
    const game = await getGame(req.params.gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (!game.revealed) {
      return res.status(403).json({ error: 'Not all players have selected yet' });
    }

    res.json({
      players: game.players.map(p => ({
        name: p.name,
        factions: p.factions,
        assignmentSalt: p.assignmentSalt,
        assignmentCommitment: p.assignmentCommitment,
        selectedFaction: p.selectedFaction,
        selectionSalt: p.selectionSalt,
        selectionCommitment: p.selectionCommitment
      }))
    });
  } catch (error) {
    console.error('Failed to get reveal:', error);
    res.status(500).json({ error: 'Failed to load results' });
  }
});

// Start server (only when not in Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`TI Faction Selector running on port ${PORT}`);
    console.log(`Navigate to http://localhost:${PORT} to get started`);
  });
}

export { app };
