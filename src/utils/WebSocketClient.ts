let socket: WebSocket | null = null;
let listener: (() => void) | null = null;

export const initWebSocket = (onUpdate: () => void) => {
  listener = onUpdate;
  if (socket) return;

  socket = new WebSocket('ws://localhost:8081');

  socket.onopen = () => {
    console.log('🟢 WS connected');
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'UPDATE') {
      console.log('🔁 WS update received');
      listener?.();
    }
  };

  socket.onclose = () => {
    console.log('🔴 WS closed, reconnecting...');
    socket = null;
    setTimeout(() => initWebSocket(onUpdate), 2000);
  };
};

export const sendUpdate = () => {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'UPDATE' }));
    console.log('📤 WS update sent');
  }
};
