const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });

console.log('✅ WS Server running on ws://localhost:8081');

wss.on('connection', (ws) => {
  console.log('🟢 Client connected');

  ws.on('message', () => {
    const msg = JSON.stringify({ type: 'UPDATE' });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });

  ws.on('close', () => {
    console.log('🔴 Client disconnected');
  });
});
