import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'tifactions-games';

/**
 * Get a game by ID
 */
export async function getGame(gameId) {
  const response = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { gameId }
  }));
  return response.Item || null;
}

/**
 * Set/update a game
 */
export async function setGame(gameId, gameData) {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: { ...gameData, gameId }
  }));
}

/**
 * Check if a game exists
 */
export async function hasGame(gameId) {
  const game = await getGame(gameId);
  return game !== null;
}

/**
 * Get games created by a specific IP
 */
export async function getGamesByIP(ip) {
  const response = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'creatorIP = :ip',
    ExpressionAttributeValues: { ':ip': ip }
  }));

  return (response.Items || []).map(game => ({
    gameId: game.gameId,
    createdAt: game.createdAt,
    playerCount: game.players.length,
    revealed: game.revealed
  }));
}

/**
 * Delete a game
 */
export async function deleteGame(gameId) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { gameId }
  }));
  return true;
}
