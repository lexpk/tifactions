import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

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
