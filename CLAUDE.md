# TI Faction Selector

## Project Overview

A cryptographically secure web application for selecting factions in Twilight Imperium. Players receive random faction options and make secret selections that are only revealed after everyone has chosen.

## Key Requirements

1. Each player receives n factions (3 or 4) randomly assigned
2. Players make selections in secret
3. Choices are revealed only after all players have committed
4. **Security**: Even with access to server/source code, options and choices remain secret until reveal phase
5. Web-based application with individual devices for each player

## File Structure

```
tifactions/
├── CLAUDE.md                    # This file - project documentation and design
├── package.json                 # Node.js dependencies and scripts
├── server.js                    # Express server with API endpoints
├── lambda.js                    # AWS Lambda entry point
├── factions.json                # Twilight Imperium faction data
├── template.yaml                # AWS SAM deployment template
├── samconfig.toml               # AWS SAM configuration
├── lib/
│   ├── crypto.js               # Cryptographic commitment functions
│   ├── db.js                   # Local database (lowdb)
│   └── dynamodb.js             # AWS DynamoDB database layer
├── public/                      # Static files served to clients
│   ├── index.html              # Landing page with project overview
│   ├── admin.html              # Game creation interface
│   ├── player.html             # Faction selection interface
│   ├── status.html             # Public game status and commitments
│   ├── docs.html               # Documentation and how-to guide
│   ├── css/
│   │   └── style.css           # Shared styles
│   └── js/
│       ├── config.js           # API configuration (set during deploy)
│       ├── app.js              # Shared utilities and API client
│       ├── admin.js            # Admin page logic
│       ├── player.js           # Player page logic
│       ├── status.js           # Status page logic
│       └── verification.js     # Client-side hash verification
├── .github/workflows/
│   └── deploy.yml              # Combined AWS + GitHub Pages auto-deploy
└── README.md                    # Quick start guide
```

## Cryptographic Approach: Hash-Based Commitment Scheme

### Why This Works

A commitment scheme allows players to "commit" to a choice without revealing it. The commitment can later be verified to ensure no one changed their choice after seeing others' selections.

### Implementation Details

**Phase 1: Assignment**
- Server randomly assigns factions to each player
- For each player, create a commitment:
  ```
  commitment = SHA-256(playerID || factions || salt)
  ```
- Store commitments publicly (visible to all)
- Store salts and original assignments in memory only (not persisted)
- Send each player their faction options via their browser session

**Phase 2: Selection**
- Each player selects one faction from their options
- Create selection commitment:
  ```
  selectionCommitment = SHA-256(playerID || selectedFaction || selectionSalt)
  ```
- Store selection commitments publicly
- Keep selections and salts in memory

**Phase 3: Reveal**
- Once all players have selected, reveal all data:
  - Original faction assignments + assignment salts
  - Player selections + selection salts
- Each client independently verifies:
  - `SHA-256(playerID || factions || assignmentSalt) == storedAssignmentCommitment`
  - `SHA-256(playerID || selectedFaction || selectionSalt) == storedSelectionCommitment`
  - Selected faction was in the player's original options

### Security Properties

1. **Hiding**: Commitments reveal nothing about the underlying data (cryptographic hash function property)
2. **Binding**: Players cannot change their selection after committing (hash collision resistance)
3. **Server-resistant**: Server operator cannot deduce choices from commitments without brute-forcing
4. **Verifiable**: All players can independently verify the integrity of the process

## Technical Architecture

### Backend (Node.js + Express)

**Endpoints:**
- `POST /api/game/create` - Create new game session with player list and faction count
- `GET /api/game/:gameId/status` - Get game state and public commitments
- `POST /api/game/:gameId/player/:playerName/auth` - Set password (first visit) or authenticate (subsequent visits)
- `GET /api/game/:gameId/player/:playerName/options` - Get player's faction options (requires authentication)
- `POST /api/game/:gameId/player/:playerName/select` - Submit faction selection (requires authentication)
- `GET /api/game/:gameId/reveal` - Get revealed data (only after all selections made)

**Data Structures:**
```javascript
{
  gameId: string,
  players: [
    {
      name: string,
      passwordHash: string | null, // bcrypt hash, set on first visit
      hasSetPassword: boolean,
      factions: string[],
      assignmentSalt: string,
      assignmentCommitment: string, // public
      selectedFaction: string | null,
      selectionSalt: string | null,
      selectionCommitment: string | null // public
    }
  ],
  factionsPerPlayer: number,
  allSelected: boolean,
  revealed: boolean
}
```

### Frontend (Vanilla HTML/CSS/JS)

**Pages:**

1. **Landing Page** (`/` or `/index.html`)
   - Join game form (enter Game ID and player name)
   - Link to documentation

2. **Documentation Page** (`/docs.html`)
   - Explanation of the commitment scheme
   - How to use the system (step-by-step guide)
   - Security guarantees and limitations
   - FAQ and troubleshooting
   - Technical details for verification

3. **Admin Page** (`/admin.html`)
   - Create new game
   - Set number of factions per player (3 or 4)
   - Enter player names
   - Generate shareable player links (no tokens needed)

4. **Player Page** (`/player.html?game=XXX&player=YYY`)
   - First visit: Set a password (stored as bcrypt hash)
   - Subsequent visits: Enter password to authenticate
   - View assigned factions (after authentication)
   - Select one faction
   - See "waiting for others" status
   - View revealed results with verification
   - Link to verify commitments independently

5. **Status Page** (`/status.html?game=XXX`)
   - Shows public commitments (hashes)
   - Shows which players have selected
   - Displays reveal when ready
   - Public audit log

### Technology Stack

- **Backend**: Node.js 20 with Express (runs on AWS Lambda in production)
- **Database**: DynamoDB (production) / lowdb JSON file (local development)
- **Crypto**: Node.js built-in `crypto` module (SHA-256 for commitments)
- **Password Hashing**: bcryptjs for secure password storage
- **Frontend**: Vanilla HTML/CSS/JavaScript hosted on GitHub Pages
- **Authentication**: JWT tokens (stateless, works with Lambda)
- **Rate Limiting**: API Gateway Usage Plan with API key (5 req/sec)
- **CI/CD**: GitHub Actions for auto-deployment (single workflow)

### Database Layer

The app automatically switches databases based on environment:

```javascript
// server.js
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const db = isLambda
  ? await import('./lib/dynamodb.js')   // Production (AWS)
  : await import('./lib/db.js');         // Local development
```

| Environment | Database | Storage |
|-------------|----------|---------|
| `npm start` (local) | lowdb | `data/db.json` file |
| AWS Lambda | DynamoDB | AWS managed |

Both implement the same interface: `getGame`, `setGame`, `hasGame`

### Authentication Flow (JWT-based)

**First Visit:**
1. Player visits `/player.html?game=123&player=Alice`
2. Server checks: has Alice set a password yet?
3. No → Show "Set Password" form
4. Player enters password → bcrypt hash stored in DynamoDB
5. Server returns JWT token → stored in sessionStorage → player sees their factions

**Subsequent Visits:**
1. Player visits same URL
2. If valid token in sessionStorage → auto-load factions
3. If no token → Show "Enter Password" form
4. Player enters password → bcrypt compare with stored hash
5. If valid → JWT token returned and stored → player sees their factions
6. If invalid → "Incorrect password" error

**JWT Token:**
- Contains: `{ gameId, playerName, exp }`
- Signed with server secret (consistent across Lambda invocations)
- Sent in `Authorization: Bearer <token>` header
- Expires after 24 hours

**Security Properties:**
- Player links contain no secrets (just game ID + player name)
- Passwords never stored in plaintext
- Stateless auth works with Lambda (no session storage needed)
- Each player controls their own authentication
- Can't view another player's options without their password
- Tokens stored in sessionStorage (cleared on browser close)

## Running the Application

### Local Development

```bash
npm install
npm start
```

Navigate to `http://localhost:3000`. Uses local JSON file database.

### Production Deployment

Just push to `main`:

```bash
git push
```

CI/CD automatically:
1. Deploys Lambda + DynamoDB via SAM
2. Extracts API URL and Key from CloudFormation
3. Deploys GitHub Pages with correct config

**Live URL:** `https://lexpk.github.io/tifactions`

### First-Time Setup

For reference, initial setup required:

1. `sam build && sam deploy --guided` (creates AWS resources)
2. Enable GitHub Pages (Settings → Pages → GitHub Actions)
3. Add GitHub Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Infrastructure

**AWS Resources:**
- Lambda function (Node.js 20)
- API Gateway (REST API with Usage Plan)
- DynamoDB table (pay-per-request)
- API Key for rate limiting

**Architecture:**
```
GitHub Pages (Static)  ────▶  AWS Lambda (API)
lexpk.github.io/tifactions    API Gateway + DynamoDB
     │                              │
     └── config.js (auto-populated by CI/CD)
```

**Cost:** Near-free for low usage (all within free tier)

**Cost protection:** API throttling at 5 req/sec via Usage Plan

**Delete everything:** `sam delete`

## Security Considerations

### What This Protects Against

**Authentication Layer (Passwords):**
- Players viewing other players' faction options without their password
- Remote snooping by players who know each other's names
- Casual unauthorized access to player data

**Cryptographic Layer (Commitments):**
- Players seeing others' **selections** before reveal
- Players changing their choice after seeing others' picks
- Server operator deducing selections from commitments (computationally infeasible)
- Anyone determining original data from public hashes

### Limitations

**Password Authentication:**
- Weak/shared passwords can be compromised
- No password recovery mechanism (by design - can't verify identity)
- Server operator could log passwords before hashing (requires code modification)

**Commitment Scheme:**
- Server operator could modify code to log plaintext before hashing commitments
- Requires trust in the initial randomness source
- Assumes honest client implementation (players could modify browser code)
- Small faction pool (~25 factions) makes brute-force easier than random data

**General:**
- Games are persisted in DynamoDB (survive restarts)
- HTTPS enforced via API Gateway and GitHub Pages
- API Key visible in frontend (by design - only for rate limiting, not security)

### What If Someone Gets My Link?

If someone gets your link (`/player.html?game=123&player=Alice`):
- **Before you set password**: They can set the password (and lock you out!)
- **After you set password**: They need your password to see your factions
