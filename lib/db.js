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

export default db;
