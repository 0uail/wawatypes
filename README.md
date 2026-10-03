# wawatypes

wawatypes is a minimalist multiplayer typing-race game. Players join a lobby with a generated code, receive the same paragraph, race through five rounds, and compare WPM, accuracy, and points on a live leaderboard.

## Features

- Host a lobby without authentication
- Automatically generated lobby codes
- Multiple simultaneous lobbies
- Up to 10 players per lobby
- Join with a name and lobby code
- Host-controlled five-second countdown
- Live racing line with player markers and WPM
- Word-based typing feedback
- Wrong characters highlighted in red
- Accuracy percentage and meter
- Per-player finish state
- Round results and points
- Five lowercase paragraphs, one per round
- Responsive light minimalist interface
- WebSocket multiplayer synchronization

## Requirements

- Node.js 18 or newer
- npm

## Run locally

From the project directory:

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

To test multiplayer locally, open the page in two or more browser windows. Use one window to host and the others to join using the generated lobby code.

## Render deployment

This project is configured for Render with `render.yaml`.

1. Push the project to GitHub.
2. In Render, create a new Web Service.
3. Connect the GitHub repository.
4. Use these settings if Render asks for them:

```text
Build command: npm install
Start command: npm start
```

Render supplies the `PORT` environment variable automatically. The server uses it and falls back to port `3000` locally.

The health endpoint is:

```text
/health
```

The browser automatically uses `wss://` in production and `ws://` locally, based on the page protocol.

## How to play

### Host

1. Enter a name.
2. Click **host a lobby**.
3. Share the generated lobby code.
4. Wait for players to join.
5. Click **start race**.
6. After each round, click **next round**.

The host can start with only one player.

### Player

1. Enter a name.
2. Enter the lobby code provided by the host.
3. Click **join lobby**.
4. Wait for the host to start.

## Project structure

```text
index.html      Main application markup
styles.css      Light minimalist interface and race visuals
script.js       Browser interaction and WebSocket client
server.js       Express server and WebSocket lobby logic
package.json    Node package metadata and start script
render.yaml     Render service configuration
README.md       Project documentation
```

## Server behavior

The server keeps active lobbies in memory. Each lobby has its own generated code, host, players, round, paragraph, and race state. Because state is in memory, active lobbies are cleared if the Render service restarts or sleeps. This is suitable for the current prototype; a persistent database would be needed for accounts, match history, or reconnect recovery.

## Useful checks

```bash
node --check server.js
node --check script.js
```

The deployed service can be checked with:

```text
https://your-render-domain.onrender.com/health
```

Expected response:

```json
{"ok":true,"lobbies":0}
```

