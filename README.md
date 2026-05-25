# Doogi Central

Standalone realtime multiplayer card game project.

This folder is intentionally separate from the NexusSync Solutions website code.

## Folders

- `frontend` - Vite React Doogi Central web app
- `server` - Node.js WebSocket game server

## Local Development

Start the server:

```bash
cd server
npm install
npm start
```

Start the frontend:

```bash
cd frontend
npm install
$env:VITE_DOOGI_WS_URL="ws://127.0.0.1:8787/doogi-ws"
npm run dev
```

## Production

Deploy `server` to Render/Railway/Fly/VPS.

Deploy `frontend` as a static site or mount it under the existing domain later.

Set:

```env
VITE_DOOGI_WS_URL=wss://your-doogi-server.onrender.com/doogi-ws
```
