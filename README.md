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

### Deploy to Render.com

1. Push code to GitHub
2. Connect repository to Render.com
3. Render auto-detects settings from `render.yaml`
4. Deploy and share the URL with your group!

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
- In-memory storage means games lost on server restart
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
- **Backend:** Node.js + Express
- **Auth:** bcrypt password hashing
- **Crypto:** SHA-256 commitments
- **Frontend:** Vanilla HTML/CSS/JS (no build step!)
- **Storage:** In-memory

## Project Structure

```
tifactions/
├── server.js              # Express server
├── lib/crypto.js          # Cryptographic functions
├── factions.json          # TI faction data
├── public/
│   ├── index.html         # Landing page
│   ├── admin.html         # Game creation
│   ├── player.html        # Faction selection
│   ├── status.html        # Public status
│   ├── docs.html          # Documentation
│   ├── css/style.css      # Styles
│   └── js/
│       ├── app.js         # Shared utilities
│       ├── admin.js       # Admin logic
│       ├── player.js      # Player logic
│       ├── status.js      # Status page logic
│       └── verification.js # Cryptographic verification
└── render.yaml            # Render.com config
```

## API Endpoints

- `POST /api/game/create` - Create new game
- `GET /api/game/:id/status` - Get public game status
- `POST /api/game/:id/player/:name/auth` - Set/verify password
- `GET /api/game/:id/player/:name/options` - Get faction options (authenticated)
- `POST /api/game/:id/player/:name/select` - Submit selection (authenticated)
- `GET /api/game/:id/reveal` - Get revealed data (after all selections)

## License

MIT

## Contributing

Pull requests welcome! This project was built for casual gaming - improvements for security, UX, or features are appreciated.
