import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use data directory (will be persistent on Render)
const dataDir = process.env.DATA_DIR || join(__dirname, '../data');
const file = join(dataDir, 'db.json');

// Create database adapter
const adapter = new JSONFile(file);
const db = new Low(adapter, { games: {} });

// Initialize database
await db.read();

// Ensure data directory exists
import { mkdirSync, existsSync } from 'fs';
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

/**
 * Get a game by ID
 */
export function getGame(gameId) {
  return db.data.games[gameId] || null;
}

/**
 * Set/update a game
 */
export async function setGame(gameId, gameData) {
  db.data.games[gameId] = gameData;
  await db.write();
}

/**
 * Check if a game exists
 */
export async function hasGame(gameId) {
  return gameId in db.data.games;
}

/**
 * Get all games (for debugging)
 */
export function getAllGames() {
  return db.data.games;
}

/**
 * Get games created by a specific IP
 */
export function getGamesByIP(ip) {
  const games = db.data.games;
  const ipGames = [];

  for (const [gameId, game] of Object.entries(games)) {
    if (game.creatorIP === ip) {
      ipGames.push({
        gameId,
        createdAt: game.createdAt,
        playerCount: game.players.length,
        revealed: game.revealed
      });
    }
  }

  return ipGames;
}

/**
 * Delete a game
 */
export async function deleteGame(gameId) {
  if (db.data.games[gameId]) {
    delete db.data.games[gameId];
    await db.write();
    return true;
  }
  return false;
}

export default db;
