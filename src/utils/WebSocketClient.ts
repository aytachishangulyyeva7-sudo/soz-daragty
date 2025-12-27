// WebSocketClient.ts - Bulletproof WebSocket with full state broadcasting
// Ýörite realtime sync üçin doly state broadcasting bilen WebSocket

let ws: WebSocket | null = null;
let messageCallback: ((data: any) => void) | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 2000; // 2 saniye
let messageBuffer = ''; // Böleklenen mesajlar üçin buffer

/**
 * WebSocket birikmesini açýar
 * Opens WebSocket connection
 */
const connect = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('🟢 WS eýýäm birikdirilen');
    return;
  }

  ws = new WebSocket('ws://localhost:8081');

  ws.onopen = () => {
    console.log('🟢 WebSocket üstünlikli birikdirildi');
    reconnectAttempts = 0;
    messageBuffer = '';
  };

  ws.onmessage = (event) => {
    try {
      // String mesajlary işle (Blob meselelerinden gaça)
      let messageData: string;

      if (typeof event.data === 'string') {
        messageData = event.data;
      } else if (event.data instanceof Blob) {
        // Blob-y string-e öwür (biziň server bilen bolmaly däl, emma işlemeli)
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            processMessage(reader.result);
          }
        };
        reader.readAsText(event.data);
        return;
      } else {
        console.warn('⚠️ Näbelli mesaj formaty:', typeof event.data);
        return;
      }

      processMessage(messageData);
    } catch (error) {
      console.error('❌ WebSocket mesajyny işlemekde säwlik:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket säwlik:', error);
  };

  ws.onclose = () => {
    console.log('🔴 WebSocket ýapyldy');
    ws = null;
    messageBuffer = '';

    // Eksponensial yza gaýtma bilen täzeden birikdir
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_BASE_DELAY * Math.pow(1.5, reconnectAttempts);
      reconnectAttempts++;
      console.log(`🔄 ${delay}ms-den gaýtadan birikdiriler (synanyşyk ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(connect, delay);
    } else {
      console.error('❌ Iň köp gaýtadan birikdirme synanyşyklaryna ýetildi. Sahypany täzeden ýükläň.');
    }
  };
};

/**
 * Gelen mesajy işle (böleklemäni dolandyr)
 * Process incoming message (handle fragmentation)
 */
const processMessage = (data: string) => {
  // Mesaj bufferini ýygna (böleklenme ýagdaýynda)
  messageBuffer += data;

  try {
    // Doly JSON hökmünde parse etmäge synanyş
    const parsed = JSON.parse(messageBuffer);
    messageBuffer = ''; // Üstünlikli parse-dan soň bufferi arassala

    console.log('📥 WS alnan:', parsed.type || 'NÄBELLI', 'payload:', Object.keys(parsed).join(', '));

    // Callback-y parse edilen data bilen çagyr
    if (messageCallback) {
      messageCallback(parsed);
    }
  } catch (error) {
    // Entek doly JSON däl, has köp data garaşýar
    // Diňe buffer uly bolanda log et (mümkin säwlik)
    if (messageBuffer.length > 50000) {
      console.warn('⚠️ Uly mesaj bufferi, mümkin parse säwligi');
      messageBuffer = ''; // Ýat meselelerinden gaça durmak üçin täzele
    }
  }
};

/**
 * WebSocket birikişini callback bilen başlat
 * Initialize WebSocket connection with callback
 * @param callback Mesaj alynanda çagyrylýan funksiýa
 * @returns Arassalaýyş funksiýasy (cleanup function)
 */
export const initWebSocket = (callback: (data: any) => void): (() => void) => {
  messageCallback = callback;

  // Derrew birikdir
  connect();

  // Arassalaýyş funksiýasyny gaýtar
  return () => {
    messageCallback = null;
    if (ws) {
      ws.close();
      ws = null;
    }
  };
};

/**
 * Doly oýun state-ni ähli birikdirilen klientlere ýaýrat
 * Broadcast full game state to all connected clients
 * BU REALTIME IŞLEMEK ÜÇIN ESASY FUNKSIÝA!
 * THIS IS THE KEY FUNCTION THAT MAKES REALTIME WORK!
 */
export interface GameStatePayload {
  type: 'FULL_STATE_UPDATE';
  sessionId: string;
  gameSession?: any;
  groups?: any[];
  gameState?: any;
  timestamp: number;
}

export const broadcastState = (payload: GameStatePayload) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ WebSocket birikdirilmedi, ýaýradyp bolmaýar');
    return;
  }

  try {
    const message = JSON.stringify(payload);
    ws.send(message);
    console.log('📤 WS broadcast iberildi:', payload.type, '(', Math.round(message.length / 1024), 'KB)');
  } catch (error) {
    console.error('❌ State-i ýaýratmakda säwlik:', error);
  }
};

/**
 * Öňki utgaşykly üçin köne funksiýa
 * Legacy function for backward compatibility
 * Realtime sync üçin broadcastState() ulanyň!
 */
export const sendUpdate = () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({ type: 'UPDATE', timestamp: Date.now() }));
  console.log('📤 WS update signal iberildi');
};

/**
 * WebSocket birikdirilendigi barlaň
 * Check if WebSocket is connected
 */
export const isConnected = (): boolean => {
  return ws !== null && ws.readyState === WebSocket.OPEN;
};

/**
 * Häzirki gaýtadan birikdirme synanyşyk sanyny al
 * Get current reconnection attempt count
 */
export const getReconnectAttempts = (): number => {
  return reconnectAttempts;
};
