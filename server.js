import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const lobbies = new Map();
const words = [
  'The best races are not won by rushing. They are won by finding a rhythm, staying present, and letting every clean word move you forward.',
  'Small improvements compound quickly when you make room for focus. One accurate sentence is the start of a much faster run.',
  'A clear mind makes quick work. Read ahead, trust your hands, and keep the pace smooth from the first letter to the last.',
  'There is a quiet joy in getting every word right. Speed follows attention, and attention turns practice into progress.',
  'Good typing feels less like a sprint and more like a current. Set your line, catch the flow, and keep moving.'
];

app.use(express.static(__dirname));
app.get('/health', (_, res) => res.json({ ok: true, lobbies: lobbies.size }));

function code() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function send(ws, data) { if (ws.readyState === 1) ws.send(JSON.stringify(data)); }
function broadcast(lobby, data) { lobby.players.forEach(p => send(p.ws, data)); }
function snapshot(lobby) { return { code: lobby.code, hostId: lobby.hostId, round: lobby.round, status: lobby.status, paragraph: lobby.paragraph, players: lobby.players.map(({ ws, ...p }) => p) }; }

wss.on('connection', ws => {
  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'host' || msg.type === 'join') {
      let lobby;
      if (msg.type === 'host') {
        let lobbyCode; do lobbyCode = code(); while (lobbies.has(lobbyCode));
        lobby = { code: lobbyCode, hostId: crypto.randomUUID(), round: 1, status: 'waiting', paragraph: words[0].toLowerCase(), players: [] };
        lobbies.set(lobbyCode, lobby);
        ws.clientId = lobby.hostId;
      } else {
        lobby = lobbies.get(String(msg.code || '').toUpperCase());
        if (!lobby) return send(ws, { type: 'error', message: 'Lobby not found.' });
        if (lobby.players.length >= 10) return send(ws, { type: 'error', message: 'This lobby is full.' });
        ws.clientId = crypto.randomUUID();
      }
      lobby.players.push({ id: ws.clientId, name: String(msg.name || 'racer').slice(0, 16), wpm: 0, points: 0, ws });
      ws.lobbyCode = lobby.code;
      send(ws, { type: 'connected', you: ws.clientId, lobby: snapshot(lobby) });
      broadcast(lobby, { type: 'lobby', lobby: snapshot(lobby) });
    }
    if (msg.type === 'start') {
      const lobby = lobbies.get(ws.lobbyCode); if (!lobby || lobby.hostId !== ws.clientId) return;
      if (lobby.status === 'results') { lobby.round = lobby.round >= 5 ? 1 : lobby.round + 1; lobby.paragraph = words[lobby.round - 1].toLowerCase(); lobby.players.forEach(p => { p.wpm = 0; p.progress = 0; }); }
      lobby.status = 'countdown'; lobby.startedAt = Date.now(); broadcast(lobby, { type: 'countdown', seconds: 5, lobby: snapshot(lobby) });
      setTimeout(() => { if (!lobbies.has(lobby.code)) return; lobby.status = 'racing'; lobby.startedAt = Date.now(); broadcast(lobby, { type: 'race', lobby: snapshot(lobby) }); }, 5000);
    }
    if (msg.type === 'progress') {
      const lobby = lobbies.get(ws.lobbyCode); const p = lobby?.players.find(x => x.id === ws.clientId); if (!p) return;
      p.wpm = Math.max(0, Math.round(Number(msg.wpm) || 0)); p.progress = Math.min(100, Number(msg.progress) || 0); broadcast(lobby, { type: 'progress', player: { id: p.id, wpm: p.wpm, progress: p.progress } });
    }
    if (msg.type === 'finish') {
      const lobby = lobbies.get(ws.lobbyCode); const p = lobby?.players.find(x => x.id === ws.clientId); if (!p) return;
      p.wpm = Math.round(Number(msg.wpm) || p.wpm); p.points = Math.max(1, Math.min(10, Math.round((Number(msg.accuracy) || 100) / 10))); p.progress = 100;
      lobby.status = 'results'; broadcast(lobby, { type: 'results', lobby: snapshot(lobby) });
    }
  });
  ws.on('close', () => { const lobby = lobbies.get(ws.lobbyCode); if (!lobby) return; lobby.players = lobby.players.filter(p => p.id !== ws.clientId); if (!lobby.players.length) lobbies.delete(lobby.code); else broadcast(lobby, { type: 'lobby', lobby: snapshot(lobby) }); });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`wawatypes listening on ${port}`));
