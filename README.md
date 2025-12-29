# TI Faction Selector

Cryptographically secure faction selection for Twilight Imperium using hash-based commitments.

## Features

- 🎲 Random faction assignment (3 or 4 factions per player)
- 🔒 Password-protected player access
- 🔐 Cryptographic commitments ensure fairness
- ✅ Client-side verification of all commitments
- 📱 Mobile-friendly responsive design
- 🌐 24 factions (Base Game + Prophecy of Kings)

## Quick Start

### Local Development

```bash
npm install
npm start
```

Then navigate to `http://localhost:3000`

### Deploy to AWS + GitHub Pages

1. Install AWS SAM CLI and configure AWS credentials
2. Deploy Lambda once: `sam build && sam deploy --guided`
3. Push to GitHub, enable Pages (Settings → Pages → GitHub Actions)
4. Add secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
5. Push to `main` → auto-deploys everything!
6. Share your `yourusername.github.io/tifactions` URL!

## How to Use

### 1. Create a Game
- Go to `/admin.html`
- Choose 3 or 4 factions per player
- Enter player names (one per line)
- Share generated links with players

### 2. Players Set Passwords
- **Important:** Set password immediately after receiving link!
- If someone gets your link first, they can lock you out

### 3. Select Factions
- View your random faction options
- Choose one faction
- **Cannot be changed after confirmation!**

### 4. Reveal
- Once everyone selects, all choices are revealed
- Cryptographic commitments are automatically verified
- Check browser console for "✓ All cryptographic commitments verified"

## Security

### What This Guarantees
- ✅ Selections cannot be changed after reveal
- ✅ No one can see others' choices before everyone selects
- ✅ All commitments are independently verifiable
- ✅ Server operator cannot deduce selections from commitments (computationally infeasible)

### Limitations
- Server operator could modify code to log plaintext before hashing
- Weak passwords can be compromised
- Small faction pool makes brute-force easier than random data

### For Maximum Trust
- Review the source code before playing
- Run on a trusted player's machine
- Use strong passwords
- Verify commitments in browser console

## Technical Details

### Commitment Scheme

**Assignment Phase:**
```
commitment = SHA-256(playerName || factions || randomSalt)
```

**Selection Phase:**
```
commitment = SHA-256(playerName || selectedFaction || randomSalt)
```

**Reveal Phase:**
All data + salts revealed, clients verify: `hash(data + salt) == commitment`

### Stack
- **Backend:** Node.js 20 + Express on AWS Lambda
- **Database:** DynamoDB (persistent)
- **Auth:** bcrypt password hashing + JWT tokens
- **Crypto:** SHA-256 commitments
- **Rate Limiting:** API Gateway Usage Plan (5 req/sec)
- **Frontend:** Vanilla HTML/CSS/JS on GitHub Pages
- **CI/CD:** GitHub Actions (single workflow deploys AWS + Pages)

## Project Structure

```
tifactions/
├── server.js              # Express server
├── lambda.js              # AWS Lambda entry point
├── template.yaml          # AWS SAM template
├── lib/
│   ├── crypto.js          # Cryptographic functions
│   ├── db.js              # Local database (lowdb)
│   └── dynamodb.js        # AWS DynamoDB layer
├── factions.json          # TI faction data
├── public/                # Static files (GitHub Pages)
│   ├── index.html         # Landing page
│   ├── admin.html         # Game creation
│   ├── player.html        # Faction selection
│   ├── status.html        # Public status
│   ├── docs.html          # Documentation
│   ├── css/style.css      # Styles
│   └── js/*.js            # Frontend logic
└── .github/workflows/
    └── deploy.yml         # Combined AWS + Pages deploy
```

## API Endpoints

- `POST /api/game/create` - Create new game
- `GET /api/game/:id/status` - Get public game status
- `POST /api/game/:id/player/:name/auth` - Set/verify password
- `GET /api/game/:id/player/:name/options` - Get faction options (authenticated)
- `POST /api/game/:id/player/:name/select` - Submit selection (authenticated)
- `GET /api/game/:id/reveal` - Get revealed data (after all selections)

## License

[MIT](LICENSE)
