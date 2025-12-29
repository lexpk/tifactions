import crypto from 'crypto';

/**
 * Generate a random salt for cryptographic commitments
 */
export function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a cryptographic commitment (SHA-256 hash)
 * @param {string} data - The data to commit to
 * @param {string} salt - Random salt for security
 * @returns {string} - Hex-encoded hash
 */
export function createCommitment(data, salt) {
  const hash = crypto.createHash('sha256');
  hash.update(data + salt);
  return hash.digest('hex');
}

/**
 * Verify a commitment matches the revealed data
 * @param {string} commitment - The original commitment hash
 * @param {string} data - The revealed data
 * @param {string} salt - The revealed salt
 * @returns {boolean} - True if valid
 */
export function verifyCommitment(commitment, data, salt) {
  const recomputed = createCommitment(data, salt);
  return commitment === recomputed;
}

/**
 * Create a commitment for a player's faction assignment
 * @param {string} playerName - Player name
 * @param {string[]} factions - Array of faction names
 * @param {string} salt - Random salt
 */
export function createAssignmentCommitment(playerName, factions, salt) {
  const data = `${playerName}:${factions.sort().join(',')}`;
  return createCommitment(data, salt);
}

/**
 * Create a commitment for a player's faction selection
 * @param {string} playerName - Player name
 * @param {string} selectedFaction - The chosen faction
 * @param {string} salt - Random salt
 */
export function createSelectionCommitment(playerName, selectedFaction, salt) {
  const data = `${playerName}:${selectedFaction}`;
  return createCommitment(data, salt);
}
