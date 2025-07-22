# Backend (NodeJS/Express/MongoDB)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Ensure MongoDB is running locally (default: mongodb://localhost:27017/leaderboard)
3. Start the server:
   ```bash
   node server.js
   ```

## Endpoints

- `GET /api/users` — List all users
- `POST /api/users` — Add a new user (body: `{ name }`)
- `POST /api/claim` — Claim random points for a user (body: `{ userId }`)
- `GET /api/leaderboard` — Get sorted leaderboard
- `GET /api/history` — Get claim history

## Real-time

- Uses Socket.IO for real-time leaderboard updates.
