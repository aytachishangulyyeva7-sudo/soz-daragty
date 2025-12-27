// server.js - Clean WebSocket broadcast server
// Ähli mesajlary ähli klientlere ýaýradýan arassa WebSocket server

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });

console.log('✅ WebSocket serveri işleýär: ws://localhost:8081');
console.log('🔄 Realtime broadcast taýýar (Redis ýok, arassa WS)');

// Birikdirilen klientleriň sanyny yzarla
let clientCount = 0;

wss.on('connection', (ws) => {
  clientCount++;
  console.log(`🟢 Täze klient birikdirildi (jemi: ${clientCount})`);

  // Klientden mesaj gelende
  ws.on('message', (rawMessage) => {
    try {
      // Buffer-den string-e öwür
      const messageStr = rawMessage.toString('utf8');

      // JSON parse et
      let messageData;
      try {
        messageData = JSON.parse(messageStr);
      } catch (parseError) {
        console.error('❌ JSON parse säwligi:', parseError.message);
        return;
      }

      console.log('📥 Alnan mesaj:', messageData.type || 'NÄBELLI',
        'payload ululygy:', Math.round(messageStr.length / 1024), 'KB');

      // Mesajyň mazmunyny sakla we ähli klientlere ýaýrat
      // PRESERVE THE ENTIRE MESSAGE and broadcast to ALL clients

      // Ähli birikdirilen klientlere ýaýrat (iberijini hem goşup)
      let broadcastCount = 0;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          // DOLY MESAJY ÝAÝRAT (diňe signal däl, ähli payload bilen!)
          // BROADCAST THE FULL MESSAGE (not just a signal, with all payload!)
          client.send(messageStr);
          broadcastCount++;
        }
      });

      console.log(`📤 Broadcast edildi ${broadcastCount} kliente`);

    } catch (error) {
      console.error('❌ Mesajy işlemekde säwlik:', error);
    }
  });

  // Klient aýrylanda
  ws.on('close', () => {
    clientCount--;
    console.log(`🔴 Klient aýryldy (galany: ${clientCount})`);
  });

  // Säwlik ýüze çyksa
  ws.on('error', (error) => {
    console.error('❌ WebSocket klient säwligi:', error);
  });
});

// Server säwliklerini dolandyr
wss.on('error', (error) => {
  console.error('❌ WebSocket server säwligi:', error);
});

// Proses togtaýan wagty arassala
process.on('SIGINT', () => {
  console.log('\n🛑 Server togtadylýar...');
  wss.clients.forEach((client) => {
    client.close();
  });
  wss.close(() => {
    console.log('✅ Server togtadyldy');
    process.exit(0);
  });
});

console.log('✅ Server taýýar! Klientleri garaşýar...');
