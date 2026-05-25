# Doogi Central Realtime Server

This folder contains the lightweight Node.js WebSocket server for Doogi Central.

The existing NexusSync website is a static Vite app hosted on GoDaddy. Static hosting cannot run a realtime WebSocket game server, so this server must be hosted separately on a Node-capable platform.

Good MVP hosting options:

- Render Web Service
- Railway
- Fly.io
- VPS with Node.js and nginx
- Any Node host that supports WebSockets

## Local Setup

```bash
cd doogi-server
npm install
npm start
```

The server starts on:

```text
http://localhost:8787
ws://localhost:8787/doogi-ws
```

Health check:

```text
http://localhost:8787/health
```

## Frontend Environment Variable

Create a `.env` file in the main website root when testing locally:

```env
VITE_DOOGI_WS_URL=ws://localhost:8787/doogi-ws
```

For production, use your deployed WebSocket server URL:

```env
VITE_DOOGI_WS_URL=wss://your-doogi-server.example.com/doogi-ws
```

Then rebuild the frontend:

```bash
npm run build
```

## OpenAI AI Analysis

AI post-match analysis is optional. If no key is configured, the server returns a lightweight built-in analysis.

To enable OpenAI analysis, set:

```env
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
```

Do not put OpenAI API keys in the frontend.

## Architecture Notes

- Server-authoritative game logic
- Clients never deal cards or validate moves
- Each player receives only their own hand
- Table cards, pass actions, move history, and chat are public to the room
- Room state is in memory only
- No database required for MVP
- No permanent chat or game history storage
- Inactive/disconnected rooms are automatically removed

## Supported Socket Messages

Client to server:

- `create_room`
- `join_room`
- `player_ready`
- `start_game`
- `play_cards`
- `pass_turn`
- `send_chat_message`

Server to client:

- `welcome`
- `snapshot`
- `room_created`
- `event`
- `error`
- `ai_analysis_ready`

## Deployment Under `/doogicentral`

The frontend page is available at:

```text
https://www.nexussyncsolutions.com/doogicentral
```

The WebSocket server runs separately. Configure the frontend build with `VITE_DOOGI_WS_URL` pointing to the production WebSocket URL.

## Mobile Optimization

- Touch-friendly cards and buttons
- Horizontal card hand scrolling
- Lightweight SVG/icon UI
- CSS transforms for card selection
- No heavy 3D or particle rendering
- Event-driven socket updates only

## Testing Checklist

1. Start the WebSocket server.
2. Start the Vite preview or deploy the frontend.
3. Open `/doogicentral` in 2-6 browser tabs or devices.
4. Create a room.
5. Join with other players using the room code.
6. Start game.
7. Confirm each player sees only their own cards.
8. Play valid singles, pairs, and triplets.
9. Confirm invalid moves are blocked.
10. Confirm pass logic clears the table when all challengers pass.
11. Confirm rankings assign when players empty their hands.
12. Confirm chat works during the session.
13. Confirm AI analysis appears after game over.
