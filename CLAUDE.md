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
├── factions.json                # Twilight Imperium faction data
├── render.yaml                  # Render.com deployment configuration
├── lib/
│   └── crypto.js               # Cryptographic commitment functions
├── public/                      # Static files served to clients
│   ├── index.html              # Landing page with project overview
│   ├── admin.html              # Game creation interface
│   ├── player.html             # Faction selection interface
│   ├── status.html             # Public game status and commitments
│   ├── docs.html               # Documentation and how-to guide
│   ├── css/
│   │   └── style.css           # Shared styles
│   └── js/
│       ├── app.js              # Shared utilities and API client
│       ├── admin.js            # Admin page logic
│       ├── player.js           # Player page logic
│       ├── status.js           # Status page logic
│       └── verification.js     # Client-side hash verification
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
   - Project overview and introduction
   - Quick start guide
   - Links to create game or join existing game
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

- **Backend**: Node.js 18+ with Express
- **Crypto**: Node.js built-in `crypto` module (SHA-256 for commitments)
- **Password Hashing**: bcrypt for secure password storage
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build step)
- **Storage**: In-memory (for session-based games)
- **Authentication**: Password-based (set on first visit, bcrypt hashed)

### Authentication Flow

**First Visit:**
1. Player visits `/player.html?game=123&player=Alice`
2. Server checks: has Alice set a password yet?
3. No → Show "Set Password" form
4. Player enters password → bcrypt hash stored server-side
5. Session cookie/token issued → player sees their factions

**Subsequent Visits:**
1. Player visits same URL
2. Server checks: Alice has already set password
3. Show "Enter Password" form
4. Player enters password → bcrypt compare with stored hash
5. If valid → session cookie/token issued → player sees their factions
6. If invalid → "Incorrect password" error

**Security Properties:**
- Player links contain no secrets (just game ID + player name)
- Passwords never stored in plaintext
- Each player controls their own authentication
- Can't view another player's options without their password
- Session cookies/localStorage used after login (passwords not re-entered constantly)

## Implementation Plan

### Step 1: Core Backend
- Set up Express server with bcrypt dependency
- Implement game state management
- Create cryptographic commitment functions (lib/crypto.js)
- Implement password authentication system (set/verify)
- Build API endpoints with authentication middleware

### Step 2: Faction Data
- Create comprehensive list of Twilight Imperium factions (factions.json)
- Include faction metadata (names, colors, abilities summary)

### Step 3: Frontend - Foundation
- Landing page (index.html)
- Documentation page (docs.html) with:
  - How the commitment scheme works
  - Step-by-step usage guide
  - Security explanation
  - Verification instructions
- Shared CSS styling
- Shared JavaScript utilities

### Step 4: Frontend - Admin Interface
- Game creation form (admin.html)
- Player name input
- Faction count selector (3 or 4)
- Generate shareable player links with tokens

### Step 5: Frontend - Player Interface
- Display assigned factions (player.html)
- Faction selection UI
- Waiting state display
- Results and verification view

### Step 6: Frontend - Status Page
- Public commitments display (status.html)
- Player selection status
- Reveal interface

### Step 7: Verification System
- Client-side hash verification (verification.js)
- Visual confirmation of integrity
- Detailed audit log
- Independent verification tools

### Step 8: Polish
- Responsive design for mobile
- Error handling and validation
- Loading states and animations
- README.md for GitHub

## Running the Application

### Local Development

```bash
npm install
npm start
```

Then navigate to `http://localhost:3000` to access the application.

### Deploying to Render.com

**Option 1: One-Click Deploy (Easiest)**

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up (free)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render auto-detects settings from `render.yaml`
6. Click "Create Web Service"
7. Wait 2-3 minutes for deployment
8. Access your app at `https://your-app-name.onrender.com`

**Option 2: Manual Configuration**

If not using `render.yaml`:
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** Node
- **Plan:** Free

**Important Notes:**
- Free tier sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- **Create your game 15+ minutes before playing** to avoid mid-game restarts
- In-memory storage means games are lost on restart/redeploy

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
- In-memory storage means passwords lost on server restart
- Server operator could log passwords before hashing (requires code modification)

**Commitment Scheme:**
- Server operator could modify code to log plaintext before hashing commitments
- Requires trust in the initial randomness source
- Assumes honest client implementation (players could modify browser code)
- Small faction pool (~25 factions) makes brute-force easier than random data

**General:**
- No persistence means games lost on server restart
- No HTTPS enforcement (should use HTTPS in production)
- Session management is basic (fine for casual gaming, not production-grade)

### What If Someone Gets My Link?

If someone gets your link (`/player.html?game=123&player=Alice`):
- **Before you set password**: They can set the password (and lock you out!)
- **After you set password**: They need your password to see your factions

**Recommendation**: Visit your link and set password ASAP after game creation.

### For Paranoid Players

To further increase trust:
- Review the source code before the game starts
- Run on a trusted player's machine (not a stranger's server)
- Each player verifies the code hasn't been modified (git commit hash)
- Use browser's network inspector to verify server responses
- Independently verify all hashes at reveal time using provided verification tools
- Use strong, unique passwords
- Set your password immediately after receiving the link

## Future Enhancements

- Persistent storage (database)
- Support for multiple concurrent games
- Ban/veto system for factions
- Draft history and statistics
- Mobile-responsive design
- TTS (Tabletop Simulator) integration
